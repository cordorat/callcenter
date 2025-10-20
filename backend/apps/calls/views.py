"""
ViewSets para gestión de llamadas del call center.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.calls.models import Llamada, FormularioVenta
from apps.campaigns.models import Cliente, Campana
from apps.users.permissions import IsAdmin, IsAdminOrOwner
from apps.calls.serializers import (
    CampanaSerializer,
    LlamadaSerializer,
    FormularioVentaSerializer,
    RecibirLlamadaSerializer,
    IniciarLlamadaSerializer,
    CompletarLlamadaSerializer,
    RechazarLlamadaSerializer,
    TransferirLlamadaSerializer
)
from common.estados_helper import get_estado_id
from apps.campaigns.serializers import ClienteSerializer
from rest_framework.decorators import api_view

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
        
        # Filtrar por nombre
        nombre = self.request.query_params.get('nombre')
        if nombre:
            queryset = queryset.filter(nombre__icontains=nombre)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def estadisticas(self, request, pk=None):
        """Obtiene estadísticas de una campaña."""
        campana = self.get_object()
        
        llamadas = campana.llamadas.all()
        
        # Obtener IDs de estados
        estado_completada_id = get_estado_id('ESTADO_LLAMADA', 'COMPLETADA')
        estado_en_curso_id = get_estado_id('ESTADO_LLAMADA', 'EN_CURSO')
        estado_rechazada_id = get_estado_id('ESTADO_LLAMADA', 'RECHAZADA')
        estado_no_contestada_id = get_estado_id('ESTADO_LLAMADA', 'NO_CONTESTADA')
        
        stats = {
            'total_llamadas': llamadas.count(),
            'llamadas_completadas': llamadas.filter(
                estado_recibida_id=estado_completada_id
            ).count() if estado_completada_id else 0,
            'llamadas_en_curso': llamadas.filter(
                estado_recibida_id=estado_en_curso_id
            ).count() if estado_en_curso_id else 0,
            'llamadas_rechazadas': llamadas.filter(
                estado_recibida_id=estado_rechazada_id
            ).count() if estado_rechazada_id else 0,
            'llamadas_no_contestadas': llamadas.filter(
                estado_recibida_id=estado_no_contestada_id
            ).count() if estado_no_contestada_id else 0,
            'duracion_promedio_segundos': 0,
            'tasa_contacto': 0
        }
        
        # Calcular duración promedio
        llamadas_completadas = llamadas.filter(
            estado_recibida_id=estado_completada_id,
            duracion_llamada_segundos__isnull=False
        ) if estado_completada_id else llamadas.none()
        
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
        
        # Validar rol de usuario
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(user, 'rol_id') and user.rol_id == rol_admin_id
        
        if es_admin:
            queryset = Llamada.objects.all()
        else:
            queryset = Llamada.objects.filter(agente=user)
        
        # Filtros opcionales
        estado_valor = self.request.query_params.get('estado')
        if estado_valor:
            estado_id = get_estado_id('ESTADO_LLAMADA', estado_valor)
            if estado_id:
                queryset = queryset.filter(estado_recibida_id=estado_id)
        
        campana_id = self.request.query_params.get('campana_id')
        if campana_id:
            queryset = queryset.filter(campana_id=campana_id)
        
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(hora_inicio_timbrado__gte=fecha_desde)
        
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(hora_inicio_timbrado__lte=fecha_hasta)
        
        return queryset.select_related(
            'agente', 'cliente_id', 'campana_id', 'estado_venta', 'estado_recibida'
        ).order_by('-hora_inicio_timbrado')
    
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
        
        # Validar que sea el agente asignado o admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if llamada.agente != request.user and not es_admin:
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
            "grabacion_url": "https://...",
            "crear_formulario": true,
            "monto_venta": 150.50
        }
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado o admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if llamada.agente != request.user and not es_admin:
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
            "motivo_rechazo_valor": "FUERA_DE_HORARIO"
        }
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado o admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if llamada.agente != request.user and not es_admin:
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
            "agente_destino_id": 2
        }
        """
        llamada = self.get_object()
        
        # Validar que sea el agente asignado o admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if llamada.agente != request.user and not es_admin:
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
        
        # Obtener IDs de estados activos
        estado_timbrado_id = get_estado_id('ESTADO_LLAMADA', 'TIMBRADO')
        estado_en_curso_id = get_estado_id('ESTADO_LLAMADA', 'EN_CURSO')
        
        estados_activos = []
        if estado_timbrado_id:
            estados_activos.append(estado_timbrado_id)
        if estado_en_curso_id:
            estados_activos.append(estado_en_curso_id)
        
        llamadas = Llamada.objects.filter(
            agente=user,
            estado_recibida_id__in=estados_activos
        ).select_related('agente', 'cliente_id', 'campana_id')
        
        serializer = LlamadaSerializer(llamadas, many=True)
        return Response(serializer.data)


class FormularioVentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de formularios de venta.
    
    list: Listar formularios del agente (o todos si es admin)
    retrieve: Obtener un formulario específico
    update: Actualizar formulario (completar campos)
    pendientes: Obtener formularios pendientes del agente
    """
    queryset = FormularioVenta.objects.all()
    serializer_class = FormularioVentaSerializer
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
        
        # Validar rol de usuario
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(user, 'rol_id') and user.rol_id == rol_admin_id
        
        if es_admin:
            queryset = FormularioVenta.objects.all()
        else:
            queryset = FormularioVenta.objects.filter(llamada_id__agente=user)
        
        return queryset.select_related('llamada_id', 'llamada_id__agente').order_by('-formulario_id')
    
    @action(detail=False, methods=['get'])
    def pendientes(self, request):
        """Obtiene los formularios pendientes del agente autenticado."""
        user = request.user
        
        # Para FormularioVenta no hay campo completado, 
        # consideramos pendientes los que tienen datos_formulario vacío o null
        formularios = FormularioVenta.objects.filter(
            llamada_id__agente=user
        ).filter(
            datos_formulario__isnull=True
        ) | FormularioVenta.objects.filter(
            llamada_id__agente=user,
            datos_formulario={}
        )
        
        formularios = formularios.select_related(
            'llamada_id', 'cliente_id', 'llamada_id__campana_id'
        )
        
        serializer = FormularioVentaSerializer(formularios, many=True)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Actualiza el formulario."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Validar que sea el agente asignado a la llamada o admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if instance.llamada_id.agente != request.user and not es_admin:
            return Response(
                {'detail': 'No tiene permisos para actualizar este formulario.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='client-by-call-sid/(?P<call_sid>[^/.]+)')
    def get_client_info_by_call_sid(self, request, call_sid):
        """
        GET /api/calls/client-by-call-sid/{call_sid}/
        Devuelve información del cliente usando el call_sid
        """
        try:
            llamada = Llamada.objects.select_related('cliente').get(
                twilio_call_sid=call_sid
            )
            
            cliente = llamada.cliente
            
            return Response({
                'cliente_id': cliente.cliente_id,
                'nombre': cliente.nombre,
                'telefono': cliente.telefono,
                'otros_datos': cliente.otros_datos,
                'campana': cliente.campana.nombre,
                'llamada_id': llamada.id,
                'estado': llamada.estado_llamada.descripcion
            })
            
        except Llamada.DoesNotExist:
            return Response(
                {'error': 'Llamada no encontrada'},
                status=status.HTTP_404_NOT_FOUND
    )