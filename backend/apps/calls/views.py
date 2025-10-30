"""
ViewSets para gestión de llamadas del call center.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import models as django_models

from apps.calls.models import Llamada, FormularioVenta, Venta
from apps.campaigns.models import Cliente, Campana
from apps.users.models import User
from apps.users.permissions import IsAdmin, IsAdminOrOwner
from apps.calls.serializers import (
    CampanaSerializer,
    LlamadaSerializer,
    HistorialLlamadaSerializer,
    FormularioVentaSerializer,
    RecibirLlamadaSerializer,
    IniciarLlamadaSerializer,
    CompletarLlamadaSerializer,
    RechazarLlamadaSerializer,
    TransferirLlamadaSerializer,
    RegistrarVentaSerializer,
    VentaSerializer
)
from common.estados_helper import get_estado_id
from apps.campaigns.serializers import ClienteSerializer

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
    
    @action(detail=False, methods=['get'], url_path='historial')
    def historial_llamadas(self, request):
        """
        Obtiene el historial de llamadas según el rol del usuario autenticado.
        
        URL: /api/calls/llamadas/historial/
        
        Comportamiento según rol:
        - AGENTE: Solo sus propias llamadas
        - COORDINADOR: Llamadas de su equipo
        - BACKOFFICE: Todas las llamadas (priorizadas para auditoría)
        - ADMIN: Todas las llamadas
        
        Query Parameters (Agente):
        - fecha_desde: Fecha inicial del rango (formato: YYYY-MM-DD)
        - fecha_hasta: Fecha final del rango (formato: YYYY-MM-DD)
        - estado: Estado de la llamada (COMPLETADA, NO_CONTESTADA, RECHAZADA, etc.)
        - telefono: Buscar por número de teléfono (parcial)
        - cliente: Buscar por nombre de cliente (parcial)
        - page: Número de página (default: 1)
        - page_size: Tamaño de página (1-100, default: 20)
        
        Query Parameters (Coordinador):
        - agente_nombre: Buscar por nombre de agente (parcial)
        - telefono: Buscar por número de teléfono (parcial)
        - estado: Estado de la llamada (COMPLETADA, NO_CONTESTADA, etc.)
        
        Query Parameters (BackOffice):
        - estado_auditoria: NO_AUDITADA, AUDITADA
        - fecha_desde: Fecha inicial del rango (formato: YYYY-MM-DD)
        - fecha_hasta: Fecha final del rango (formato: YYYY-MM-DD)
        - estado_reportada: NO_REPORTADA, REPORTADA
        
        Orden de prioridad (BackOffice):
        1. Ventas sin auditar (más recientes primero)
        2. No ventas sin auditar (más recientes primero)
        3. Ventas auditadas (más recientes primero)
        4. No ventas auditadas (más recientes primero)
        
        Ejemplos:
        - /api/calls/llamadas/historial/
        - /api/calls/llamadas/historial/?fecha_desde=2025-10-01&fecha_hasta=2025-10-23
        - /api/calls/llamadas/historial/?estado=COMPLETADA&page=2&page_size=50
        - /api/calls/llamadas/historial/?estado_auditoria=NO_AUDITADA&estado_venta=VENTA
        - /api/calls/llamadas/historial/?telefono=+57300&cliente=Juan
        """
        user = request.user

        # Validar que los filtros enviados estén permitidos para el rol
        invalid = self._validate_filters_for_role(user, request.query_params)
        if invalid:
            return Response({'error': invalid}, status=status.HTTP_400_BAD_REQUEST)

        # Determinar queryset base según el rol del usuario
        queryset = self._get_base_queryset_by_role(user)
        
        # Aplicar filtros comunes
        queryset = self._apply_common_filters(queryset, request)
        
        # Aplicar filtros específicos de BackOffice/Coordinador
        queryset = self._apply_specific_filters(queryset, request)
        
        # Aplicar ordenamiento según el rol
        queryset = self._apply_role_ordering(queryset, user)
        
        # Optimizar consulta con select_related y prefetch_related
        queryset = queryset.select_related(
            'agente',
            'cliente',
            'venta',
            'estado_llamada',
            'estado_venta',
            'estado_reportada',
            'estado_auditoria',
            'auditado_por'
        ).prefetch_related(
            'formularios'
        )
        
        # Contar total de resultados
        total_count = queryset.count()
        
        # Paginación
        page_size = self._get_page_size(request)
        page = self._get_page_number(request)
        
        # Calcular offset
        start = (page - 1) * page_size
        end = start + page_size
        
        # Obtener página de resultados
        llamadas_pagina = queryset[start:end]
        
        # Si no hay resultados
        if total_count == 0:
            return Response({
                'count': 0,
                'total_pages': 0,
                'current_page': page,
                'page_size': page_size,
                'results': [],
                'message': 'No se encontraron llamadas que coincidan con los criterios seleccionados'
            })
        
        # Serializar resultados
        serializer = HistorialLlamadaSerializer(llamadas_pagina, many=True)
        
        # Calcular páginas totales
        import math
        total_pages = math.ceil(total_count / page_size)
        
        return Response({
            'count': total_count,
            'total_pages': total_pages,
            'current_page': page,
            'page_size': page_size,
            'results': serializer.data,
            'rol_usuario': user.get_role_value()
        })
    
    def _get_base_queryset_by_role(self, user):
        """
        Retorna el queryset base según el rol del usuario.
        
        - AGENTE: Solo sus propias llamadas
        - COORDINADOR: Llamadas de los agentes de su equipo
        - BACKOFFICE: Todas las llamadas
        - ADMIN: Todas las llamadas
        """
        if user.is_admin() or user.is_backoffice():
            # Admin y BackOffice ven todas las llamadas
            return Llamada.objects.all()
        
        elif user.is_coordinador():
            # Coordinador ve llamadas de su equipo
            from apps.campaigns.models import Equipo
            
            # Buscar equipos donde el usuario es coordinador
            equipos = Equipo.objects.filter(coordinador=user, is_active=True)
            
            if not equipos.exists():
                # Si no tiene equipos asignados, retornar vacío
                return Llamada.objects.none()
            
            # Obtener agentes de esos equipos usando el método get_agentes()
            agentes_list = []
            for equipo in equipos:
                agentes_equipo = equipo.get_agentes()
                agentes_list.extend(list(agentes_equipo))
            
            if not agentes_list:
                # Si no hay agentes en los equipos, retornar vacío
                return Llamada.objects.none()
            
            # Filtrar llamadas de esos agentes
            return Llamada.objects.filter(agente__in=agentes_list)
        
        else:
            # Agente o cualquier otro rol: solo sus propias llamadas
            return Llamada.objects.filter(agente=user)
    
    def _apply_common_filters(self, queryset, request):
        """Aplica filtros comunes a todos los roles."""
        
        # Filtro por rango de fechas (desde - hasta)
        fecha_desde = request.query_params.get('fecha_desde')
        if fecha_desde:
            try:
                queryset = queryset.filter(fecha_hora_inicio__date__gte=fecha_desde)
            except Exception:
                pass
        
        fecha_hasta = request.query_params.get('fecha_hasta')
        if fecha_hasta:
            try:
                queryset = queryset.filter(fecha_hora_inicio__date__lte=fecha_hasta)
            except Exception:
                pass
        
        # Filtro por estado de llamada
        estado = request.query_params.get('estado')
        if estado:
            estado_id = get_estado_id('ESTADO_LLAMADA', estado.upper())
            if estado_id:
                queryset = queryset.filter(estado_llamada_id=estado_id)
        
        # Búsqueda por número de teléfono
        telefono = request.query_params.get('telefono')
        if telefono:
            telefono_limpio = telefono.replace('+', '').replace(' ', '').replace('-', '')
            queryset = queryset.filter(
                django_models.Q(telefono_destino__icontains=telefono) |
                django_models.Q(telefono_destino__icontains=telefono_limpio)
            )
        
        # Búsqueda por nombre de cliente
        cliente = request.query_params.get('cliente')
        if cliente:
            queryset = queryset.filter(cliente__nombre__icontains=cliente)
        
        # Búsqueda por nombre de agente (útil para coordinadores y backoffice)
        agente_nombre = request.query_params.get('agente_nombre')
        if agente_nombre:
            queryset = queryset.filter(
                django_models.Q(agente__first_name__icontains=agente_nombre) |
                django_models.Q(agente__last_name__icontains=agente_nombre)
            )
        
        return queryset
    
    def _apply_specific_filters(self, queryset, request):
        """Aplica filtros específicos de BackOffice y Coordinador."""
        # Filtro por estado de auditoría (solo si presente)
        estado_auditoria = request.query_params.get('estado_auditoria')
        if estado_auditoria:
            estado_id = get_estado_id('ESTADO_AUDITORIA', estado_auditoria.upper())
            if estado_id:
                queryset = queryset.filter(estado_auditoria_id=estado_id)

        # Filtro por estado de reporte (solo si presente)
        estado_reportada = request.query_params.get('estado_reportada')
        if estado_reportada:
            estado_id = get_estado_id('ESTADO_REPORTE', estado_reportada.upper())
            if estado_id:
                queryset = queryset.filter(estado_reportada_id=estado_id)

        # NOTA: No aplicamos filtro por estado_venta aquí porque el requisito
        # indica que BackOffice solo filtra por estado de auditoría, fecha y estado de reporte.
        return queryset

    def _validate_filters_for_role(self, user, params):
        """Valida que los parámetros de query sean permitidos según el rol.

        Retorna None si todo está bien, o una cadena con el error si hay filtros no permitidos.
        """
        # Normalizar keys (omitimos page/page_size siempre permitidos)
        provided = set([k for k in params.keys() if k not in ['page', 'page_size']])

        # Definir conjuntos permitidos por rol
        coordinator_allowed = {'agente_nombre', 'telefono', 'estado'}
        backoffice_allowed = {'estado_auditoria', 'fecha_desde', 'fecha_hasta', 'estado_reportada'}
        admin_allowed = {'fecha_desde', 'fecha_hasta', 'estado', 'telefono', 'cliente', 'agente_nombre', 'estado_auditoria', 'estado_reportada'}
        agent_allowed = {'fecha_desde', 'fecha_hasta', 'estado', 'telefono', 'cliente'}

        if user.is_admin():
            allowed = admin_allowed
        elif user.is_backoffice():
            allowed = backoffice_allowed
        elif user.is_coordinador():
            allowed = coordinator_allowed
        else:
            # Agentes y demás roles
            allowed = agent_allowed

        # Determine disallowed
        disallowed = provided - allowed
        if disallowed:
            return f"Filtros no permitidos para el rol {user.get_role_value()}: {', '.join(sorted(disallowed))}"

        return None
    
    def _apply_role_ordering(self, queryset, user):
        """
        Aplica ordenamiento según el rol del usuario.
        
        BackOffice: Prioriza según:
          1. Ventas sin auditar (más recientes primero)
          2. No ventas sin auditar (más recientes primero)
          3. Ventas auditadas (más recientes primero)
          4. No ventas auditadas (más recientes primero)
        
        Otros roles: Orden cronológico descendente (más recientes primero).
        """
        if user.is_backoffice():
            # Obtener IDs de estados
            estado_venta_id = get_estado_id('ESTADO_VENTA', 'VENTA')
            estado_no_auditada_id = get_estado_id('ESTADO_AUDITORIA', 'NO_AUDITADA')
            
            from django.db.models import Case, When, IntegerField

            queryset = queryset.annotate(
                prioridad=Case(
                    # Prioridad 1: Ventas sin auditar
                    When(
                        estado_venta_id=estado_venta_id,
                        estado_auditoria_id=estado_no_auditada_id,
                        then=1
                    ),
                    # Prioridad 2: No ventas sin auditar
                    When(
                        estado_auditoria_id=estado_no_auditada_id,
                        then=2
                    ),
                    # Prioridad 3: Ventas auditadas
                    When(
                        estado_venta_id=estado_venta_id,
                        then=3
                    ),
                    # Prioridad 4: No ventas auditadas (default)
                    default=4,
                    output_field=IntegerField()
                )
            ).order_by('prioridad', '-fecha_hora_inicio')
        else:
            # Orden cronológico descendente para otros roles
            queryset = queryset.order_by('-fecha_hora_inicio')
        
        return queryset
    
    def _get_page_size(self, request):
        """Obtiene y valida el tamaño de página."""
        page_size = request.query_params.get('page_size', 20)
        try:
            page_size = int(page_size)
            if page_size < 1:
                page_size = 20
            elif page_size > 100:
                page_size = 100
        except ValueError:
            page_size = 20
        return page_size
    
    def _get_page_number(self, request):
        """Obtiene y valida el número de página."""
        page = request.query_params.get('page', 1)
        try:
            page = int(page)
            if page < 1:
                page = 1
        except ValueError:
            page = 1
        return page


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


class VentaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de ventas.
    
    list: Listar ventas (agentes solo ven las suyas, admins/coordinadores/backoffice ven todas)
    retrieve: Obtener una venta específica
    create: No usar este método, usar la acción 'registrar_venta'
    registrar_venta: Registrar una nueva venta desde el módulo de llamadas
    """
    serializer_class = VentaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filtra las ventas según el rol del usuario.
        - Agentes: solo sus ventas (a través de llamadas)
        - Coordinadores: ventas de su equipo (a través de llamadas)
        - BackOffice/Admin: todas las ventas
        
        La relación es: Venta <- Llamada -> Agente
        """
        user = self.request.user
        
        if user.is_admin() or user.is_backoffice():
            # Admin y BackOffice ven todas las ventas
            queryset = Venta.objects.all()
        elif user.is_coordinador():
            # Coordinador ve ventas de agentes de su equipo
            # Accedemos al agente a través de la llamada
            from apps.campaigns.models import Equipo
            equipos = Equipo.objects.filter(coordinador=user, is_active=True)
            agentes_list = []
            for equipo in equipos:
                agentes_list.extend(list(equipo.get_agentes()))
            # Filtrar ventas donde la llamada asociada tenga un agente del equipo
            queryset = Venta.objects.filter(llamadas__agente__in=agentes_list)
        else:
            # Agentes ven solo sus ventas (a través de llamadas)
            queryset = Venta.objects.filter(llamadas__agente=user)
        
        return queryset.select_related('campana').order_by('-venta_id').distinct()
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def registrar_venta(self, request):
        """
        Registra una nueva venta desde el módulo de llamadas.
        
        Campos requeridos:
        - llamada_id: ID de la llamada asociada
        - cliente_nombre: Nombre completo del cliente
        - cliente_documento: Número de documento/identificación
        - producto_id: ID del producto o servicio adquirido
        
        Campos opcionales:
        - monto: Monto de la venta (si no se proporciona, se usa el precio del producto)
        - observaciones: Comentarios adicionales
        
        Returns:
            201: Venta registrada exitosamente con ID único
            400: Datos inválidos o faltantes
            403: Sin permisos para registrar venta en esta llamada
            404: Llamada o producto no encontrado
        """
        serializer = RegistrarVentaSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            venta = serializer.save()
            return Response(
                serializer.to_representation(venta),
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            {
                'error': 'Datos inválidos',
                'detalles': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=False, methods=['get'])
    def mis_ventas(self, request):
        """
        Obtiene todas las ventas del agente autenticado.
        Incluye información completa de cada venta.
        Accede al agente a través de la llamada.
        """
        ventas = Venta.objects.filter(
            llamadas__agente=request.user
        ).select_related('campana').order_by('-venta_id').distinct()
        
        serializer = self.get_serializer(ventas, many=True)
        return Response({
            'total': ventas.count(),
            'ventas': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def productos_disponibles(self, request):
        """
        Lista todos los productos disponibles para venta.
        Útil para poblar el dropdown del formulario de cierre de venta.
        """
        from apps.campaigns.models import Producto
        
        productos = Producto.objects.filter(activo=True).order_by('nombre')
        
        productos_data = [
            {
                'id': p.pk,
                'nombre': p.nombre,
                'descripcion': p.descripcion,
                'precio': str(p.precio)
            }
            for p in productos
        ]
        
        return Response({
            'total': len(productos_data),
            'productos': productos_data
        })

