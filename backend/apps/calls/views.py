"""
ViewSets para gestión de llamadas del call center.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.calls.models import (
    Cliente,
    Campana,
    Llamada,
    FormularioLlamada
)
from apps.users.permissions import IsAdmin, IsAdminOrOwner
from apps.calls.serializers import (
    ClienteSerializer,
    CampanaSerializer,
    LlamadaSerializer,
    FormularioLlamadaSerializer,
    RecibirLlamadaSerializer,
    IniciarLlamadaSerializer,
    CompletarLlamadaSerializer,
    RechazarLlamadaSerializer,
    TransferirLlamadaSerializer
)


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de clientes.
    
    list: Listar todos los clientes
    retrieve: Obtener un cliente específico
    create: Crear nuevo cliente
    update: Actualizar cliente
    destroy: Eliminar cliente (solo admin)
    """
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Solo admins pueden eliminar clientes."""
        if self.action == 'destroy':
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtrar clientes por búsqueda."""
        queryset = Cliente.objects.all()
        
        # Búsqueda por nombre/apellido
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                nombre__icontains=search
            ) | queryset.filter(
                apellido__icontains=search
            )
        
        # Búsqueda por teléfono
        telefono = self.request.query_params.get('telefono')
        if telefono:
            queryset = queryset.filter(telefono__icontains=telefono)
        
        # Búsqueda por documento
        documento = self.request.query_params.get('documento')
        if documento:
            queryset = queryset.filter(documento_id__icontains=documento)
        
        return queryset.order_by('-created_at')


class CampanaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de campañas.
    
    list: Listar todas las campañas
    retrieve: Obtener una campaña específica
    create: Crear nueva campaña (solo admin)
    update: Actualizar campaña (solo admin)
    destroy: Eliminar campaña (solo admin)
    estadisticas: Obtener estadísticas de una campaña
    """
    queryset = Campana.objects.all()
    serializer_class = CampanaSerializer
    
    def get_permissions(self):
        """Solo admins pueden crear/actualizar/eliminar campañas."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtrar campañas."""
        queryset = Campana.objects.all()
        
        # Filtrar por tipo
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        # Filtrar por activas
        activo = self.request.query_params.get('activo')
        if activo is not None:
            queryset = queryset.filter(activo=activo.lower() == 'true')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtiene estadísticas de una campaña."""
        campana = self.get_object()
        
        llamadas = campana.llamadas.all()
        
        stats = {
            'total_llamadas': llamadas.count(),
            'llamadas_completadas': llamadas.filter(
                estado_llamada=Llamada.EstadoLlamada.COMPLETADA
            ).count(),
            'llamadas_en_curso': llamadas.filter(
                estado_llamada=Llamada.EstadoLlamada.EN_CURSO
            ).count(),
            'llamadas_rechazadas': llamadas.filter(
                estado_llamada=Llamada.EstadoLlamada.RECHAZADA
            ).count(),
            'llamadas_no_contestadas': llamadas.filter(
                estado_llamada=Llamada.EstadoLlamada.NO_CONTESTADA
            ).count(),
            'duracion_promedio_segundos': 0,
            'tasa_contacto': 0
        }
        
        # Calcular duración promedio
        llamadas_completadas = llamadas.filter(
            estado_llamada=Llamada.EstadoLlamada.COMPLETADA,
            duracion_llamada_segundos__isnull=False
        )
        
        if llamadas_completadas.exists():
            from django.db.models import Avg
            promedio = llamadas_completadas.aggregate(
                Avg('duracion_llamada_segundos')
            )['duracion_llamada_segundos__avg']
            stats['duracion_promedio_segundos'] = int(promedio or 0)
        
        # Calcular tasa de contacto
        if stats['total_llamadas'] > 0:
            contactadas = stats['llamadas_completadas'] + stats['llamadas_en_curso']
            stats['tasa_contacto'] = round(
                (contactadas / stats['total_llamadas']) * 100, 2
            )
        
        return Response(stats)


class LlamadaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de llamadas.
    
    list: Listar llamadas del agente (o todas si es admin)
    retrieve: Obtener una llamada específica
    recibir_llamada: Recibir una llamada entrante
    iniciar_llamada: Marcar que la llamada inició
    completar_llamada: Completar una llamada
    rechazar_llamada: Rechazar una llamada
    transferir_llamada: Transferir una llamada a otro agente
    mis_llamadas_activas: Obtener llamadas activas del agente
    """
    queryset = Llamada.objects.all()
    serializer_class = LlamadaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Agentes solo ven sus propias llamadas.
        Admins ven todas las llamadas.
        """
        user = self.request.user
        
        if user.is_admin():
            queryset = Llamada.objects.all()
        else:
            queryset = Llamada.objects.filter(agente=user)
        
        # Filtros opcionales
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado_llamada=estado)
        
        campana_id = self.request.query_params.get('campana_id')
        if campana_id:
            queryset = queryset.filter(campana_id=campana_id)
        
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(created_at__gte=fecha_desde)
        
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(created_at__lte=fecha_hasta)
        
        return queryset.select_related(
            'agente', 'cliente', 'campana', 'motivo_rechazo'
        ).order_by('-created_at')
    
    @action(detail=False, methods=['post'])
    def recibir_llamada(self, request):
        """
        Recibe una llamada entrante.
        
        Body:
        {
            "llamada_sid": "CA1234567890",
            "telefono_origen": "+573001234567",
            "telefono_destino": "+573007654321",
            "cliente_id": 1,  // opcional
            "campana_id": 1
        }
        """
        serializer = RecibirLlamadaSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            llamada = serializer.save()
            response_serializer = LlamadaSerializer(llamada)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def iniciar_llamada(self, request, pk=None):
        """
        Marca que la llamada inició (agente contestó).
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado
        if llamada.agente != request.user and not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para iniciar esta llamada.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = IniciarLlamadaSerializer(
            llamada,
            data={},
            context={'request': request}
        )
        
        if serializer.is_valid():
            llamada = serializer.save()
            response_serializer = LlamadaSerializer(llamada)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def completar_llamada(self, request, pk=None):
        """
        Completa una llamada.
        
        Body:
        {
            "notas": "Cliente interesado en el producto",
            "grabacion_url": "https://...",
            "crear_formulario": true
        }
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado
        if llamada.agente != request.user and not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para completar esta llamada.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CompletarLlamadaSerializer(
            llamada,
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            llamada = serializer.save()
            response_serializer = LlamadaSerializer(llamada)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def rechazar_llamada(self, request, pk=None):
        """
        Rechaza una llamada.
        
        Body:
        {
            "motivo_rechazo_id": 1,
            "notas": "Cliente no disponible"
        }
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado
        if llamada.agente != request.user and not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para rechazar esta llamada.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RechazarLlamadaSerializer(
            llamada,
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            llamada = serializer.save()
            response_serializer = LlamadaSerializer(llamada)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def transferir_llamada(self, request, pk=None):
        """
        Transfiere una llamada a otro agente.
        
        Body:
        {
            "agente_destino_id": 2,
            "notas": "Cliente requiere soporte técnico"
        }
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado
        if llamada.agente != request.user and not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para transferir esta llamada.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TransferirLlamadaSerializer(
            llamada,
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            llamada = serializer.save()
            response_serializer = LlamadaSerializer(llamada)
            return Response(response_serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def mis_llamadas_activas(self, request):
        """Obtiene las llamadas activas del agente autenticado."""
        user = request.user
        
        llamadas = Llamada.objects.filter(
            agente=user,
            estado_llamada__in=[
                Llamada.EstadoLlamada.TIMBRADO,
                Llamada.EstadoLlamada.EN_CURSO
            ]
        ).select_related('agente', 'cliente', 'campana')
        
        serializer = LlamadaSerializer(llamadas, many=True)
        return Response(serializer.data)


class FormularioLlamadaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de formularios de llamada.
    
    list: Listar formularios del agente (o todos si es admin)
    retrieve: Obtener un formulario específico
    update: Actualizar formulario (completar campos)
    pendientes: Obtener formularios pendientes del agente
    """
    queryset = FormularioLlamada.objects.all()
    serializer_class = FormularioLlamadaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        """Solo admins pueden eliminar formularios."""
        if self.action == 'destroy':
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Agentes solo ven formularios de sus llamadas.
        Admins ven todos los formularios.
        """
        user = self.request.user
        
        if user.is_admin():
            queryset = FormularioLlamada.objects.all()
        else:
            queryset = FormularioLlamada.objects.filter(llamada__agente=user)
        
        return queryset.select_related('llamada', 'llamada__agente').order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Obtiene los formularios pendientes del agente autenticado."""
        user = request.user
        
        formularios = FormularioLlamada.objects.filter(
            llamada__agente=user,
            completado=False
        ).select_related('llamada', 'llamada__cliente', 'llamada__campana')
        
        serializer = FormularioLlamadaSerializer(formularios, many=True)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Actualiza el formulario y marca como completado si todos los campos están llenos."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Validar que sea el agente asignado a la llamada
        if instance.llamada.agente != request.user and not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para actualizar este formulario.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Marcar como completado si se indica
        if request.data.get('completado') and not instance.completado:
            from django.utils import timezone
            instance.completado = True
            instance.fecha_completado = timezone.now()
        
        self.perform_update(serializer)
        
        return Response(serializer.data)
