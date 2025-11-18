"""
ViewSets para gestión de estados de agentes.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.users.models import (
    EstadoAgenteDetalle,
    EstadoAgenteActual,
    TiposParametros,
    User
)
from apps.campaigns.models import Equipo, EquipoAgenteDetalle
from apps.users.permissions import IsAdmin, IsAdminOrOwner
from apps.users.states.serializers_estado import (
    EstadoAgenteDetalleSerializer,
    CambioEstadoSerializer,
    TiposParametrosSerializer,
    EquipoSerializer,
    EquipoAgenteDetalleSerializer,
    EstadoAgenteSimpleSerializer
)
from common.estados_helper import get_estado_id, get_estado
from apps.users.helpers.estado_agente_service import cambiar_estado_agente_por_valor


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
        """Filtrar por nombre si se proporciona."""
        queryset = TiposParametros.objects.all()
        nombre = self.request.query_params.get('nombre')
        if nombre:
            queryset = queryset.filter(nombre=nombre)
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


class EstadoAgenteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gestión de estados de agentes.
    
    list: Listar historial de estados (paginado)
    retrieve: Obtener un registro específico
    current: Obtener estado actual de un agente
    historial: Obtener historial de estados por fecha
    change_state: Cambiar estado de un agente
    disponibles: Listar agentes disponibles para llamadas
    todos: Listar estados actuales de todos los agentes
    """
    queryset = EstadoAgenteDetalle.objects.all()
    serializer_class = EstadoAgenteDetalleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filtrar según el rol del usuario.
        Admin ve todos los registros, agente solo los suyos.
        """
        user = self.request.user
        queryset = EstadoAgenteDetalle.objects.select_related('agente')
        
        # Verificar si es admin usando el helper
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(user, 'rol_id') and user.rol_id == rol_admin_id
        
        if es_admin:
            return queryset
        else:
            # Agente solo ve su propio historial
            return queryset.filter(agente_id=user)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Obtiene el estado actual del agente autenticado.
        Admin puede consultar por agente_id query param.
        
        Query params:
            - agente_id: ID del agente (solo admin)
        """
        agente_id = request.query_params.get('agente_id')
        
        # Verificar si es admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        # Determinar qué agente consultar
        if agente_id and es_admin:
            rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
            agente = get_object_or_404(User, documento_id=agente_id, rol_id=rol_agente_id)
        else:
            agente = request.user
        
        # Obtener o crear estado actual
        from apps.users.states.serializers_estado import EstadoAgenteActualSerializer
        
        # Obtener el estado DESCONECTADO por defecto
        estado_desconectado = get_estado('ESTADO_AGENTE', 'DESCONECTADO')
        
        estado_actual, created = EstadoAgenteActual.objects.get_or_create(
            agente_id=agente,
            defaults={
                'estado_id': estado_desconectado
            }
        )
        
        serializer = EstadoAgenteActualSerializer(estado_actual)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def historial(self, request):
        """
        Obtiene el historial de estados del agente.
        
        Query params:
            - agente_id: ID del agente (solo admin)
            - fecha_inicio: Fecha inicio (YYYY-MM-DD)
            - fecha_fin: Fecha fin (YYYY-MM-DD)
            - estado: Filtrar por estado específico
        """
        agente_id = request.query_params.get('agente_id')
        fecha_inicio = request.query_params.get('fecha_inicio')
        fecha_fin = request.query_params.get('fecha_fin')
        estado_param = request.query_params.get('estado')
        
        # Verificar si es admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        # Determinar qué agente consultar
        if agente_id and es_admin:
            queryset = EstadoAgenteDetalle.objects.filter(
                agente_id=agente_id
            )
        else:
            queryset = EstadoAgenteDetalle.objects.filter(
                agente_id=request.user
            )
        
        # Aplicar filtros
        if fecha_inicio:
            from datetime import datetime
            fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
            queryset = queryset.filter(fecha__gte=fecha_inicio_dt)
        
        if fecha_fin:
            from datetime import datetime
            fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            queryset = queryset.filter(fecha__lte=fecha_fin_dt)
        
        if estado_param:
            queryset = queryset.filter(estado_id=estado_param)
        
        # Ordenar
        queryset = queryset.select_related('agente_id').order_by('-fecha', '-hora_inicio')
        
        # Paginar
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_state(self, request):
        """
        Cambia el estado del agente autenticado.
        Admin y Coordinador pueden cambiar estado de cualquier agente.
        
        Body:
            - nuevo_estado: Estado al que cambiar
            - comentarios: Motivo del cambio (opcional)
            - agente_id: ID del agente (solo admin/coordinador, opcional)
        """
        # Verificar si es admin o coordinador
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        rol_coordinador_id = get_estado_id('ROL_USUARIO', 'COORDINADOR')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        es_coordinador = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_coordinador_id
        puede_cambiar_otros = es_admin or es_coordinador
        
        # Determinar qué agente modificar
        agente_id = request.data.get('agente_id')
        if agente_id and puede_cambiar_otros:
            rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
            agente = get_object_or_404(User, documento_id=agente_id, rol_id=rol_agente_id)
        else:
            agente = request.user
        
        # Validar datos
        serializer = CambioEstadoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Obtener el nuevo estado (viene como string del serializer)
        nuevo_estado_valor = serializer.validated_data['nuevo_estado']
        comentarios = serializer.validated_data.get('comentarios', '')
        
        # Convertir el string a instancia de TiposParametros
        nuevo_estado = get_estado('ESTADO_AGENTE', nuevo_estado_valor)
        
        # Cambiar estado usando el servicio centralizado
        try:
            success, message, estado_actual = cambiar_estado_agente_por_valor(
                agente,
                nuevo_estado_valor,
                usuario_cambio=request.user
            )
            
            if not success:
                return Response(
                    {'detail': message},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Retornar el nuevo estado
            from apps.users.states.serializers_estado import EstadoAgenteActualSerializer
            response_serializer = EstadoAgenteActualSerializer(estado_actual)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Lista todos los agentes disponibles para recibir llamadas.
        Solo admin.
        """
        # Verificar si es admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if not es_admin:
            return Response(
                {'detail': 'No tienes permisos para esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Obtener el estado DISPONIBLE
        estado_disponible = get_estado('ESTADO_AGENTE', 'DISPONIBLE')
        
        # Buscar agentes disponibles
        estados_disponibles = EstadoAgenteActual.objects.filter(
            estado_id=estado_disponible
        ).select_related('agente_id')
        
        # Preparar respuesta simple
        from apps.users.states.serializers_estado import EstadoAgenteActualSerializer
        serializer = EstadoAgenteActualSerializer(estados_disponibles, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def todos(self, request):
        """
        Lista los estados actuales de todos los agentes.
        Solo admin.
        """
        # Verificar si es admin
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        es_admin = hasattr(request.user, 'rol_id') and request.user.rol_id == rol_admin_id
        
        if not es_admin:
            return Response(
                {'detail': 'No tienes permisos para esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Obtener todos los estados actuales
        estados = EstadoAgenteActual.objects.all().select_related('agente_id')
        
        from apps.users.states.serializers_estado import EstadoAgenteActualSerializer
        serializer = EstadoAgenteActualSerializer(estados, many=True)
        return Response(serializer.data)


