from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Q
from datetime import date, timedelta

from .models import User, TiposParametros, EstadoAgenteDetalle, EstadoActualAgente
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    TiposParametrosSerializer,
    EstadoActualAgenteSerializer,
    CambiarEstadoSerializer,
    EstadoAgenteDetalleSerializer
)
from .permissions import IsAdmin, IsAdminOrOwner

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar usuarios.
    
    - Los administradores pueden ver, crear, actualizar y eliminar cualquier usuario
    - Los agentes solo pueden ver su propia información y actualizarla
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Devuelve el serializador apropiado según la acción."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Define permisos según la acción."""
        if self.action in ['create', 'destroy']:
            # Solo administradores pueden crear y eliminar usuarios
            permission_classes = [IsAdmin]
        elif self.action in ['update', 'partial_update', 'retrieve']:
            # Administradores o el propio usuario
            permission_classes = [IsAdminOrOwner]
        else:
            # Por defecto, usuarios autenticados
            permission_classes = [IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Los administradores ven todos los usuarios.
        Los agentes solo ven su propia información.
        """
        user = self.request.user
        if user.is_admin():
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    def create(self, request, *args, **kwargs):
        """Crea un nuevo usuario (solo administradores)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    
    def destroy(self, request, *args, **kwargs):
        """
        Desactiva un usuario en lugar de eliminarlo.
        Solo administradores pueden hacer esto.
        """
        instance = self.get_object()
        
        # No permitir que un usuario se elimine a sí mismo
        if instance.id == request.user.id:
            return Response(
                {"detail": "No puedes desactivarte a ti mismo."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.save()
        
        return Response(
            {"detail": "Usuario desactivado exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activa un usuario desactivado.
        Solo administradores pueden hacer esto.
        """
        user = self.get_object()
        
        if user.is_active:
            return Response(
                {"detail": "El usuario ya está activo."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = True
        user.save()
        
        return Response(
            {"detail": "Usuario activado exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Permite a cualquier usuario cambiar su propia contraseña.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(
            {"detail": "Contraseña cambiada exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Devuelve la información del usuario autenticado.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ===================================
# VIEWSETS DE ESTADOS DE AGENTES
# ===================================

class TiposParametrosViewSet(viewsets.ViewSet):
    """
    ViewSet para listar los tipos de parámetros (estados disponibles para agentes).
    GET /api/parametros/
    
    Respuesta: [
        {
            "parametros_id": 1,
            "nombre": "ESTADO_AGENTE",
            "valor": "Disponible",
            "descripcion": "Agente disponible para recibir llamadas"
        },
        ...
    ]
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """Lista todos los estados de agente sin paginación."""
        estados = TiposParametros.objects.filter(nombre='ESTADO_AGENTE').order_by('valor')
        
        resultado = []
        for estado in estados:
            resultado.append({
                'parametros_id': estado.parametros_id,
                'nombre': estado.nombre,
                'valor': estado.valor,
                'descripcion': estado.descripcion
            })
        
        return Response(resultado)


class EstadoAgenteViewSet(viewsets.ViewSet):
    """
    ViewSet para gestionar el estado actual del agente autenticado.
    """
    permission_classes = [IsAuthenticated]
    
    def _inicializar_estados_diarios(self, agente, fecha_actual):
        """
        Crea los 9 registros diarios para el agente si no existen.
        Se ejecuta automáticamente al primer cambio de estado del día.
        """
        estados = TiposParametros.objects.filter(nombre='ESTADO_AGENTE')
        
        registros_creados = []
        for estado in estados:
            detalle, created = EstadoAgenteDetalle.objects.get_or_create(
                agente=agente,
                estado=estado,
                fecha=fecha_actual,
                defaults={'tiempo': '00:00:00', 'cambios': ''}
            )
            if created:
                registros_creados.append(estado.valor)
        
        return registros_creados
    
    def _actualizar_tiempo_estado_anterior(self, agente, estado_anterior, duracion_segundos, usuario_cambio):
        """
        Actualiza el tiempo y agrega el cambio al historial del estado anterior.
        
        Args:
            agente: Usuario agente
            estado_anterior: TiposParametros del estado anterior
            duracion_segundos: Tiempo que estuvo en ese estado
            usuario_cambio: Usuario que realizó el cambio (puede ser el mismo agente u otro)
        """
        fecha_actual = date.today()
        
        # Obtener o crear el registro del día para ese estado
        detalle, created = EstadoAgenteDetalle.objects.get_or_create(
            agente=agente,
            estado=estado_anterior,
            fecha=fecha_actual,
            defaults={'tiempo': '00:00:00', 'cambios': ''}
        )
        
        # Agregar el cambio ANTES de actualizar el tiempo
        detalle.agregar_cambio(usuario_cambio.full_name)
        
        # Actualizar el tiempo acumulado
        detalle.agregar_tiempo(duracion_segundos)
        detalle.save()
    
    @action(detail=False, methods=['get'], url_path='mi-estado')
    def mi_estado(self, request):
        """
        Obtiene el estado actual del agente autenticado.
        GET /api/users/estado/mi-estado/
        
        Respuesta: {
            "agente": "Nombre del agente",
            "estado": "Disponible"
        }
        """
        try:
            estado_actual = EstadoActualAgente.objects.select_related('estado', 'agente').get(
                agente=request.user
            )
            return Response({
                'agente': estado_actual.agente.full_name,
                'estado': estado_actual.estado.valor
            })
        except EstadoActualAgente.DoesNotExist:
            # Si no tiene estado, asignar "Desconectado" por defecto
            try:
                estado_desconectado = TiposParametros.objects.get(
                    nombre='ESTADO_AGENTE',
                    valor='Desconectado'
                )
                
                with transaction.atomic():
                    estado_actual = EstadoActualAgente.objects.create(
                        agente=request.user,
                        estado=estado_desconectado
                    )
                    
                    # Inicializar los 9 registros diarios
                    self._inicializar_estados_diarios(request.user, date.today())
                
                return Response({
                    'agente': request.user.full_name,
                    'estado': estado_desconectado.valor
                }, status=status.HTTP_201_CREATED)
            except TiposParametros.DoesNotExist:
                return Response(
                    {'detail': 'No se encontró el estado por defecto. Contacte al administrador.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    @action(detail=False, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request):
        """
        Cambia el estado del agente.
        
        POST /api/users/estado/cambiar-estado/
        Body: {
            "estado_id": 1,
            "agente_id": 123  // Opcional: solo si es un supervisor cambiando el estado de otro
        }
        
        Lógica:
        1. Si es el primer cambio del día, inicializa los 9 registros
        2. Calcula cuánto tiempo estuvo en el estado anterior
        3. Actualiza el registro del estado anterior con:
           - El tiempo acumulado
           - Agrega al historial: "HH:MM:SS - nombre_usuario"
        4. Cambia al nuevo estado
        """
        serializer = CambiarEstadoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        estado_id = serializer.validated_data['estado_id']
        agente_objetivo_id = serializer.validated_data.get('agente_id')
        
        # Determinar quién es el agente objetivo
        if agente_objetivo_id:
            # Un supervisor está cambiando el estado de otro agente
            try:
                agente_objetivo = User.objects.get(documento_id=agente_objetivo_id)
            except User.DoesNotExist:
                return Response(
                    {'detail': 'El agente especificado no existe'},
                    status=status.HTTP_404_NOT_FOUND
                )
            usuario_cambio = request.user  # Quien hizo el cambio
        else:
            # El agente está cambiando su propio estado
            agente_objetivo = request.user
            usuario_cambio = request.user
        
        # Validar el nuevo estado
        try:
            nuevo_estado = TiposParametros.objects.get(
                parametros_id=estado_id,
                nombre='ESTADO_AGENTE'
            )
        except TiposParametros.DoesNotExist:
            return Response(
                {'detail': 'El estado especificado no es válido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        fecha_actual = date.today()
        
        with transaction.atomic():
            # Obtener o crear el estado actual del agente
            estado_actual, created = EstadoActualAgente.objects.select_for_update().get_or_create(
                agente=agente_objetivo,
                defaults={'estado': nuevo_estado}
            )
            
            # Inicializar los registros diarios si es necesario
            self._inicializar_estados_diarios(agente_objetivo, fecha_actual)
            
            if not created:
                # Verificar si es el mismo estado
                if estado_actual.estado.parametros_id == estado_id:
                    return Response(
                        {'detail': 'Ya se encuentra en ese estado'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Calcular duración en el estado anterior
                duracion_segundos = estado_actual.duracion_actual_segundos
                
                # Actualizar el tiempo del estado anterior
                self._actualizar_tiempo_estado_anterior(
                    agente_objetivo,
                    estado_actual.estado,
                    duracion_segundos,
                    usuario_cambio
                )
                
                # Cambiar al nuevo estado
                estado_actual.estado = nuevo_estado
                estado_actual.fecha_inicio = timezone.now()
                estado_actual.save()
            else:
                # Primera vez que se establece el estado
                # Agregar el cambio inicial
                detalle_inicial = EstadoAgenteDetalle.objects.get(
                    agente=agente_objetivo,
                    estado=nuevo_estado,
                    fecha=fecha_actual
                )
                detalle_inicial.agregar_cambio(usuario_cambio.full_name)
                detalle_inicial.save()
        
        # Retornar respuesta simplificada
        return Response({
            'agente': agente_objetivo.full_name,
            'estado': nuevo_estado.valor
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='detalle-diario')
    def detalle_diario(self, request):
        """
        Obtiene el detalle de estados por fecha para el agente.
        GET /api/users/estado/detalle-diario/?fecha=2025-10-08
        
        Respuesta: [
            {
                "fecha": "2025-10-08",
                "agente": "Juan Pérez",
                "estado": "Disponible",
                "tiempo": "01:30:45",
                "cambios": "10:00:00 - Juan Pérez, 11:30:45 - Juan Pérez"
            },
            ...
        ]
        """
        fecha_str = request.query_params.get('fecha')
        
        if not fecha_str:
            return Response(
                {'detail': 'Debe especificar una fecha. Use el parámetro ?fecha=YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            fecha_consulta = date.fromisoformat(fecha_str)
        except ValueError:
            return Response(
                {'detail': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        detalles = EstadoAgenteDetalle.objects.filter(
            agente=request.user,
            fecha=fecha_consulta
        ).select_related('estado', 'agente').order_by('estado__valor')
        
        # Construir respuesta personalizada
        resultado = []
        for detalle in detalles:
            resultado.append({
                'fecha': str(detalle.fecha),
                'agente': detalle.agente.full_name,
                'estado': detalle.estado.valor,
                'tiempo': detalle.tiempo,
                'cambios': detalle.cambios
            })
        
        return Response(resultado)
