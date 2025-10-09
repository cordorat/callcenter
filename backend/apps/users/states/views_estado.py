"""
ViewSets para gestión de estados de agentes.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.users.models import (
    EstadoAgenteDetalle,
    EstadoAgenteActual,
    TiposParametros,
    Equipo,
    EquipoAgenteDetalle,
    User
)
from apps.users.permissions import IsAdmin, IsAdminOrOwner
from apps.users.states.serializers_estado import (
    EstadoAgenteDetalleSerializer,
    EstadoAgenteActualSerializer,
    CambioEstadoSerializer,
    TiposParametrosSerializer,
    EquipoSerializer,
    EquipoAgenteDetalleSerializer,
    EstadoAgenteSimpleSerializer
)


class TiposParametrosViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de tipos de parámetros del sistema.
    
    list: Listar todos los parámetros
    retrieve: Obtener un parámetro específico
    create: Crear nuevo parámetro (solo admin)
    update: Actualizar parámetro (solo admin)
    destroy: Eliminar parámetro (solo admin)
    """
    queryset = TiposParametros.objects.all()
    serializer_class = TiposParametrosSerializer
    
    def get_permissions(self):
        """Solo admins pueden crear/actualizar/eliminar."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtrar por categoría si se proporciona."""
        queryset = TiposParametros.objects.filter(activo=True)
        categoria = self.request.query_params.get('categoria')
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        return queryset


class EquipoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de equipos de trabajo.
    
    list: Listar todos los equipos
    retrieve: Obtener un equipo específico
    create: Crear nuevo equipo (solo admin)
    update: Actualizar equipo (solo admin)
    destroy: Eliminar equipo (solo admin)
    agentes: Listar agentes de un equipo
    """
    queryset = Equipo.objects.all()
    serializer_class = EquipoSerializer
    
    def get_permissions(self):
        """Solo admins pueden crear/actualizar/eliminar."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """Filtrar equipos activos."""
        return Equipo.objects.filter(activo=True)
    
    @action(detail=True, methods=['get'])
    def agentes(self, request, pk=None):
        """Lista los agentes de un equipo."""
        equipo = self.get_object()
        agentes_detalle = EquipoAgenteDetalle.objects.filter(
            equipo=equipo,
            activo=True
        ).select_related('agente', 'equipo')
        
        serializer = EquipoAgenteDetalleSerializer(agentes_detalle, many=True)
        return Response(serializer.data)


class EstadoAgenteViewSet(viewsets.ViewSet):
    """
    ViewSet para gestión de estados de agentes.
    
    current: Obtener estado actual del agente autenticado
    historial: Obtener historial de estados del agente autenticado
    change_state: Cambiar el estado del agente (con validaciones)
    disponibles: Listar agentes disponibles para recibir llamadas
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Obtiene el estado actual del agente autenticado."""
        user = request.user
        
        # Si es admin, puede consultar el estado de cualquier agente
        if user.is_admin():
            agente_id = request.query_params.get('agente_id')
            if agente_id:
                user = get_object_or_404(User, id=agente_id, role=User.Role.AGENT)
        
        try:
            estado_actual = EstadoAgenteActual.objects.select_related(
                'agente', 'detalle'
            ).get(agente=user)
            serializer = EstadoAgenteActualSerializer(estado_actual)
            return Response(serializer.data)
        except EstadoAgenteActual.DoesNotExist:
            return Response(
                {'detail': 'No se encontró el estado del agente.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def historial(self, request):
        """Obtiene el historial de estados del agente autenticado."""
        user = request.user
        
        # Si es admin, puede consultar el historial de cualquier agente
        if user.is_admin():
            agente_id = request.query_params.get('agente_id')
            if agente_id:
                user = get_object_or_404(User, id=agente_id, role=User.Role.AGENT)
        
        estados = EstadoAgenteDetalle.objects.filter(
            agente=user
        ).select_related('agente', 'estado_parametro').order_by('-hora_inicio')[:50]
        
        serializer = EstadoAgenteDetalleSerializer(estados, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_state(self, request):
        """
        Cambia el estado del agente con validaciones.
        
        Body:
        {
            "estado": "DISPONIBLE",
            "comentarios": "Listo para recibir llamadas",
            "tiene_audio": true,
            "conexion_activa": true
        }
        """
        serializer = CambioEstadoSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            detalle = serializer.save()
            response_serializer = EstadoAgenteDetalleSerializer(detalle)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Lista todos los agentes disponibles para recibir llamadas.
        Solo accesible para admins.
        """
        if not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para ver esta información.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        estados = EstadoAgenteActual.objects.filter(
            estado=EstadoAgenteDetalle.EstadoAgente.DISPONIBLE,
            acepta_llamadas=True,
            tiene_audio=True,
            conexion_activa=True
        ).select_related('agente')
        
        data = []
        for estado in estados:
            data.append({
                'agente_id': estado.agente.id,
                'agente_nombre': estado.agente.full_name,
                'agente_email': estado.agente.email,
                'estado': estado.estado,
                'estado_display': estado.get_estado_display(),
                'puede_recibir_llamadas': estado.puede_recibir_llamadas,
                'ultima_actualizacion': estado.ultima_actualizacion
            })
        
        serializer = EstadoAgenteSimpleSerializer(data, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def todos(self, request):
        """
        Lista el estado actual de todos los agentes.
        Solo accesible para admins.
        """
        if not request.user.is_admin():
            return Response(
                {'detail': 'No tiene permisos para ver esta información.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        estados = EstadoAgenteActual.objects.select_related('agente').all()
        
        data = []
        for estado in estados:
            data.append({
                'agente_id': estado.agente.id,
                'agente_nombre': estado.agente.full_name,
                'agente_email': estado.agente.email,
                'estado': estado.estado,
                'estado_display': estado.get_estado_display(),
                'puede_recibir_llamadas': estado.puede_recibir_llamadas,
                'ultima_actualizacion': estado.ultima_actualizacion
            })
        
        serializer = EstadoAgenteSimpleSerializer(data, many=True)
        return Response(serializer.data)
