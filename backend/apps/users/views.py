from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from datetime import date, timedelta

from .models import User, TiposParametros, EstadoAgenteDetalle, EstadoAgenteActual, Centro
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    AdminUserUpdateSerializer,
    ChangePasswordSerializer,
    CambiarEstadoSerializer,
    ProfileUpdateSerializer,
    CentroSerializer,
    CentroCreateSerializer,
    CentroUpdateSerializer,
    CentroListSerializer
)
from .permissions import IsAdmin, IsAdminOrOwner
from common.estados_helper import get_estado
from apps.users.helpers.estado_agente_service import (
    cambiar_estado_agente,
    inicializar_estados_diarios
)
User = get_user_model()
from django.core.paginator import Paginator
from rest_framework.pagination import PageNumberPagination

class UsuarioPagination(PageNumberPagination):
    page_size = 10  # 👈 cantidad de registros por página
    page_size_query_param = 'page_size'  # permite al front modificar el tamaño
    max_page_size = 100  # límite máximo permitido

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    pagination_class = UsuarioPagination 
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
            # Si es administrador, usar el serializador completo
            if self.request.user.is_admin():
                return AdminUserUpdateSerializer
            # Si es el propio usuario, usar el serializador limitado
            return UserUpdateSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Define permisos según la acción."""
        if self.action in ['create', 'destroy']:
            # Solo administradores pueden crear y eliminar usuarios
            permission_classes = [IsAdmin]
        elif self.action in ['update', 'partial_update']:
            # Solo administradores pueden actualizar cualquier usuario
            # Los usuarios pueden actualizar su propio perfil mediante /profile/
            permission_classes = [IsAdmin]
        elif self.action == 'retrieve':
            # Administradores o el propio usuario pueden ver el perfil
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
        if user.rol==get_estado('ROL_USUARIO', 'ADMIN'):
            return User.objects.all().order_by('documento_id')
        return User.objects.filter(pk=user.pk)
    
    def create(self, request, *args, **kwargs):
        """Crea un nuevo usuario (solo administradores)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """
        Actualiza un usuario (solo administradores).
        Criterio 3.1: Al presionar "Guardar", si los campos son correctos, 
        los cambios se actualizan en la base de datos y se mostrará el mensaje 
        "Datos actualizados correctamente".
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Usar UserSerializer para la respuesta (sin campos sensibles)
        response_data = UserSerializer(instance).data
        response_data['message'] = 'Datos actualizados correctamente'
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def partial_update(self, request, *args, **kwargs):
        """Actualización parcial de usuario (solo administradores)."""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Desactiva un usuario en lugar de eliminarlo.
        Solo administradores pueden hacer esto.
        """
        instance = self.get_object()
        
        # No permitir que un usuario se elimine a sí mismo
        if instance.pk == request.user.pk:
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
    
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def profile(self, request):
        """
        Gestiona el perfil del usuario autenticado.
        
        GET /api/users/profile/ 
        - Devuelve la información del perfil (Criterio 1.3)
        
        PATCH /api/users/profile/
        - Actualiza información personal y/o contraseña
        - Body para info personal: {
            "first_name": "Juan",
            "last_name": "Pérez",
            "email": "juan@ejemplo.com",
            "phone": "3001234567",
            "foto_perfil": "https://ejemplo.com/foto.jpg"
        }
        - Body para contraseña: {
            "old_password": "actual123",
            "new_password": "Nueva123!",
            "new_password_confirm": "Nueva123!"
        }
        - Body para ambos: incluir todos los campos
        
        Respuestas:
        - 200: Actualización exitosa (Criterios 3.2, 3.3)
        - 400: Errores de validación (Criterios 2.1-2.5, 3.1)
        """
        
        if request.method == 'GET':
            # Criterio 1.3: Mostrar información del perfil
            serializer = ProfileUpdateSerializer(request.user)
            return Response({
                'user': serializer.data,
                'role': request.user.get_role_display()
            })
        
        elif request.method == 'PATCH':
            # Determinar si se está cambiando contraseña
            cambiar_password = any(
                key in request.data 
                for key in ['old_password', 'new_password', 'new_password_confirm']
            )
            
            # Inicializar diccionario de respuesta
            response_data = {}
            errors = {}
            
            # 1. ACTUALIZAR INFORMACIÓN PERSONAL (si hay campos de perfil)
            campos_perfil = ['first_name', 'last_name', 'email', 'phone', 'foto_perfil']
            tiene_campos_perfil = any(campo in request.data for campo in campos_perfil)
            
            if tiene_campos_perfil:
                profile_serializer = ProfileUpdateSerializer(
                    request.user,
                    data=request.data,
                    partial=True,  # Permite actualización parcial
                    context={'request': request}
                )
                
                if profile_serializer.is_valid():
                    profile_serializer.save()
                    response_data['profile_updated'] = True
                    response_data['user'] = profile_serializer.data
                else:
                    errors.update(profile_serializer.errors)
            
            # 2. CAMBIAR CONTRASEÑA (si hay campos de contraseña)
            if cambiar_password:
                # Criterio 2.1: Todos los campos de contraseña son obligatorios
                campos_password_requeridos = ['old_password', 'new_password', 'new_password_confirm']
                campos_faltantes = [
                    campo for campo in campos_password_requeridos 
                    if campo not in request.data or not request.data[campo]
                ]
                
                if campos_faltantes:
                    # Agregar error por cada campo faltante
                    for campo in campos_faltantes:
                        errors[campo] = ["Este campo es obligatorio para cambiar la contraseña"]
                else:
                    password_serializer = ChangePasswordSerializer(
                        data=request.data,
                        context={'request': request}
                    )
                    
                    if password_serializer.is_valid():
                        password_serializer.save()
                        response_data['password_updated'] = True
                    else:
                        errors.update(password_serializer.errors)
            
            # 3. VERIFICAR SI HUBO ERRORES
            if errors:
                return Response(errors, status=status.HTTP_400_BAD_REQUEST)
            
            # 4. CONSTRUIR MENSAJE DE ÉXITO (Criterios 3.2 y 3.3)
            mensajes = []
            if response_data.get('profile_updated'):
                mensajes.append("Se ha actualizado correctamente su información")
            if response_data.get('password_updated'):
                mensajes.append("Su contraseña ha sido actualizada correctamente")
            
            response_data['message'] = '. '.join(mensajes) + '.'
            
            return Response(response_data, status=status.HTTP_200_OK)


# ===================================
# VIEWSETS DE ESTADOS DE AGENTES
# ===================================

class TiposParametrosViewSet(viewsets.ViewSet):
    """
    ViewSet para listar los tipos de parámetros del sistema.
    
    GET /api/users/parametros/ - Lista todos los parámetros
    GET /api/users/parametros/?nombre=ROL_USUARIO - Filtra por categoría/nombre
    
    Respuesta: [
        {
            "parametros_id": 1,
            "nombre": "ROL_USUARIO",
            "valor": "ADMIN",
            "descripcion": "Rol Administrador"
        },
        ...
    ]
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """
        Lista los parámetros del sistema.
        Puede filtrarse por nombre usando query param ?nombre=ROL_USUARIO
        """
        nombre_filter = request.query_params.get('nombre', None)
        
        if nombre_filter:
            # Filtrar por categoría específica
            parametros = TiposParametros.objects.filter(nombre=nombre_filter).order_by('valor')
        else:
            # Devolver todos los parámetros agrupados por nombre
            parametros = TiposParametros.objects.all().order_by('nombre', 'valor')
        
        resultado = []
        for param in parametros:
            resultado.append({
                'parametros_id': param.parametros_id,
                'nombre': param.nombre,
                'valor': param.valor,
                'descripcion': param.descripcion
            })
        
        return Response(resultado)


class EstadoAgenteViewSet(viewsets.ViewSet):
    """
    ViewSet para gestionar el estado actual del agente autenticado.
    
    NOTA: Toda la lógica de cambio de estado ahora está centralizada en
    apps.users.helpers.estado_agente_service para garantizar consistencia.
    """
    permission_classes = [IsAuthenticated]
    
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
            estado_actual = EstadoAgenteActual.objects.select_related('estado_id', 'agente_id').get(
                agente_id=request.user
            )
            return Response({
                'agente': estado_actual.agente_id.full_name,
                'estado': estado_actual.estado_id.valor
            })
        except EstadoAgenteActual.DoesNotExist:
            # Si no tiene estado, asignar "Desconectado" por defecto usando el servicio
            try:
                estado_desconectado = TiposParametros.objects.get(
                    nombre='ESTADO_AGENTE',
                    valor='Desconectado'
                )
                
                # Usar el servicio centralizado para inicializar el estado
                success, message, estado_actual = cambiar_estado_agente(
                    request.user,
                    estado_desconectado,
                    usuario_cambio=request.user
                )
                
                if success:
                    return Response({
                        'agente': request.user.full_name,
                        'estado': estado_desconectado.valor
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response(
                        {'detail': message},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except TiposParametros.DoesNotExist:
                return Response(
                    {'detail': 'No se encontró el estado por defecto. Contacte al administrador.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    @action(detail=False, methods=['post'], url_path='cambiar-estado')
    def cambiar_estado(self, request):
        """
        Cambia el estado del agente usando el servicio centralizado.
        
        POST /api/users/estado/cambiar-estado/
        Body: {
            "estado_id": 1,
            "agente_id": 123  // Opcional: solo si es un supervisor cambiando el estado de otro
        }
        
        El servicio centralizado se encarga de:
        1. Inicializar los registros diarios si es necesario
        2. Calcular y actualizar el tiempo del estado anterior
        3. Registrar el cambio en el historial
        4. Cambiar al nuevo estado
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
        
        # Usar el servicio centralizado para cambiar el estado
        try:
            success, message, estado_actual = cambiar_estado_agente(
                agente_objetivo,
                estado_id,
                usuario_cambio
            )
            
            if not success:
                return Response(
                    {'detail': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Retornar respuesta simplificada
            return Response({
                'agente': agente_objetivo.full_name,
                'estado': estado_actual.estado_id.valor
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
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
            agente_id=request.user,
            fecha=fecha_consulta
        ).select_related('estado_id', 'agente_id').order_by('estado_id__valor')
        
        # Construir respuesta personalizada
        resultado = []
        for detalle in detalles:
            resultado.append({
                'fecha': str(detalle.fecha),
                'agente': detalle.agente_id.full_name,
                'estado': detalle.estado_id.valor,
                'tiempo': detalle.tiempo,
                'cambios': detalle.cambios
            })
        
        return Response(resultado)


# ===================================
# VIEWSET DE CENTROS
# ===================================

class CentroPagination(PageNumberPagination):
    """Paginación para listado de centros."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class CentroViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Centros del Call Center.
    
    Solo accesible para usuarios con rol ADMIN.
    
    Endpoints:
    - GET    /api/users/centros/           → Lista todos los centros
    - POST   /api/users/centros/           → Crea un nuevo centro
    - GET    /api/users/centros/{id}/      → Obtiene un centro específico
    - PUT    /api/users/centros/{id}/      → Actualiza un centro completo
    - PATCH  /api/users/centros/{id}/      → Actualiza un centro parcialmente
    - DELETE /api/users/centros/{id}/      → Elimina un centro
    
    Endpoints adicionales:
    - GET    /api/users/centros/jefes-disponibles/  → Lista usuarios con rol JEFE_CENTRO sin centro asignado
    - GET    /api/users/centros/simple/             → Lista simplificada para dropdowns
    """
    queryset = Centro.objects.all()
    permission_classes = [IsAdmin]
    pagination_class = CentroPagination
    
    def get_serializer_class(self):
        """Devuelve el serializador apropiado según la acción."""
        if self.action == 'create':
            return CentroCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CentroUpdateSerializer
        elif self.action == 'simple':
            return CentroListSerializer
        return CentroSerializer
    
    def get_queryset(self):
        """
        Devuelve el queryset de centros.
        Incluye filtros opcionales por query params.
        """
        queryset = Centro.objects.select_related('jefe_centro').order_by('nombre')
        
        # Filtro por nombre (búsqueda parcial)
        nombre = self.request.query_params.get('nombre', None)
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
        
        # Filtro por jefe de centro
        jefe_centro = self.request.query_params.get('jefe_centro', None)
        if jefe_centro:
            queryset = queryset.filter(jefe_centro__documento_id=jefe_centro)
        
        # Filtro por centros sin jefe
        sin_jefe = self.request.query_params.get('sin_jefe', None)
        if sin_jefe and sin_jefe.lower() == 'true':
            queryset = queryset.filter(jefe_centro__isnull=True)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Crea un nuevo centro.
        
        Body:
        {
            "nombre": "Centro Principal",
            "direccion": "Calle 123 #45-67, Bogotá",
            "jefe_centro": "12345678"  // documento_id del usuario (opcional)
        }
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        centro = serializer.save()
        
        # Devolver respuesta con el serializador de lectura
        response_serializer = CentroSerializer(centro)
        return Response(
            {
                'message': 'Centro creado exitosamente.',
                'centro': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """
        Actualiza un centro completamente o parcialmente.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        centro = serializer.save()
        
        # Devolver respuesta con el serializador de lectura
        response_serializer = CentroSerializer(centro)
        return Response(
            {
                'message': 'Centro actualizado exitosamente.',
                'centro': response_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    def destroy(self, request, *args, **kwargs):
        """
        Elimina un centro.
        
        NOTA: Considera implementar soft delete si hay relaciones importantes.
        """
        instance = self.get_object()
        nombre_centro = instance.nombre
        
        # Verificar si tiene dependencias (equipos, campañas, etc.)
        # Por ahora, eliminación directa. Ajustar según tus necesidades.
        
        instance.delete()
        
        return Response(
            {'message': f"Centro '{nombre_centro}' eliminado exitosamente."},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'], url_path='jefes-disponibles')
    def jefes_disponibles(self, request):
        """
        Lista usuarios con rol JEFE_CENTRO que no tienen un centro asignado.
        
        GET /api/users/centros/jefes-disponibles/
        
        Útil para el dropdown de asignación de jefe al crear/editar centro.
        """
        rol_jefe_centro = get_estado('ROL_USUARIO', 'JEFE_CENTRO')
        
        # Obtener IDs de usuarios que ya son jefes de algún centro
        jefes_asignados = Centro.objects.filter(
            jefe_centro__isnull=False
        ).values_list('jefe_centro__documento_id', flat=True)
        
        # Filtrar usuarios con rol JEFE_CENTRO que no están asignados y están activos
        jefes_disponibles = User.objects.filter(
            rol=rol_jefe_centro,
            is_active=True
        ).exclude(
            documento_id__in=jefes_asignados
        ).order_by('first_name', 'last_name')
        
        resultado = []
        for jefe in jefes_disponibles:
            resultado.append({
                'documento_id': jefe.documento_id,
                'full_name': jefe.full_name,
                'email': jefe.email
            })
        
        return Response(resultado)
    
    @action(detail=False, methods=['get'], url_path='simple')
    def simple(self, request):
        """
        Lista simplificada de centros para dropdowns.
        
        GET /api/users/centros/simple/
        
        Devuelve solo id, nombre y jefe_centro_nombre.
        Sin paginación para facilitar uso en selects.
        """
        centros = Centro.objects.select_related('jefe_centro').order_by('nombre')
        serializer = CentroListSerializer(centros, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='asignar-jefe')
    def asignar_jefe(self, request, pk=None):
        """
        Asigna un jefe de centro a un centro específico.
        
        POST /api/users/centros/{id}/asignar-jefe/
        Body: {
            "jefe_centro": "12345678"  // documento_id del usuario
        }
        """
        centro = self.get_object()
        jefe_documento_id = request.data.get('jefe_centro')
        
        if not jefe_documento_id:
            return Response(
                {'detail': 'Debe especificar el documento_id del jefe de centro.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            jefe = User.objects.get(documento_id=jefe_documento_id)
        except User.DoesNotExist:
            return Response(
                {'detail': 'El usuario especificado no existe.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validar rol
        rol_jefe_centro = get_estado('ROL_USUARIO', 'JEFE_CENTRO')
        if jefe.rol != rol_jefe_centro:
            return Response(
                {'detail': f"El usuario no tiene el rol de Jefe de Centro. Rol actual: {jefe.get_role_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que no esté asignado a otro centro
        otro_centro = Centro.objects.filter(jefe_centro=jefe).exclude(pk=centro.pk).first()
        if otro_centro:
            return Response(
                {'detail': f"Este usuario ya es jefe del centro '{otro_centro.nombre}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Asignar
        centro.jefe_centro = jefe
        centro.save()
        
        response_serializer = CentroSerializer(centro)
        return Response(
            {
                'message': f"Jefe de centro asignado exitosamente a '{centro.nombre}'.",
                'centro': response_serializer.data
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], url_path='desasignar-jefe')
    def desasignar_jefe(self, request, pk=None):
        """
        Desasigna el jefe de centro de un centro específico.
        
        POST /api/users/centros/{id}/desasignar-jefe/
        """
        centro = self.get_object()
        
        if not centro.jefe_centro:
            return Response(
                {'detail': 'Este centro no tiene un jefe asignado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        nombre_jefe_anterior = centro.jefe_centro.full_name
        centro.jefe_centro = None
        centro.save()
        
        response_serializer = CentroSerializer(centro)
        return Response(
            {
                'message': f"Jefe '{nombre_jefe_anterior}' desasignado exitosamente del centro '{centro.nombre}'.",
                'centro': response_serializer.data
            },
            status=status.HTTP_200_OK
        )