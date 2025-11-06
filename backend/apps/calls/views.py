"""
ViewSets para gestión de llamadas del call center.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import models as django_models

from apps.calls.models import Llamada, FormularioVenta
from apps.campaigns.models import Cliente, Campana
from apps.users.permissions import IsAdmin, IsJefeCampana
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
    HistorialJefeCampanaSerializer
)
from common.estados_helper import get_estado, get_estado_id
from apps.campaigns.serializers import ClienteSerializer
from rest_framework.decorators import api_view
import math

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
        Obtiene el historial de llamadas del agente autenticado con filtros opcionales.
        
        URL: /api/calls/llamadas/historial/
        
        Query Parameters:
        - fecha_desde: Fecha inicial (formato: YYYY-MM-DD)
        - fecha_hasta: Fecha final (formato: YYYY-MM-DD)
        - estado: Estado de la llamada (COMPLETADA, NO_CONTESTADA, RECHAZADA, FALLIDA)
        - fue_contestada: Filtrar por llamadas contestadas (true/false)
        - telefono: Buscar por número de teléfono (parcial)
        - cliente: Buscar por nombre de cliente (parcial)
        - page: Número de página (default: 1)
        - page_size: Tamaño de página (1-100, default: 20)
        
        Ejemplos:
        - /api/calls/llamadas/historial/
        - /api/calls/llamadas/historial/?fecha_desde=2025-10-01&fecha_hasta=2025-10-23
        - /api/calls/llamadas/historial/?estado=COMPLETADA&page=2&page_size=50
        - /api/calls/llamadas/historial/?fue_contestada=true
        - /api/calls/llamadas/historial/?telefono=+57300&cliente=Juan
        """
        user = request.user
        
        # Base queryset - solo llamadas del agente
        queryset = Llamada.objects.filter(agente=user)
        
        # Obtener parámetros de query
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        estado = request.query_params.get('estado')
        fue_contestada = request.query_params.get('fue_contestada')
        telefono = request.query_params.get('telefono')
        cliente = request.query_params.get('cliente')
        
        # Filtro por rango de fechas
        if fecha_desde:
            try:
                queryset = queryset.filter(fecha_hora_inicio__date__gte=fecha_desde)
            except Exception:
                return Response(
                    {'error': 'Formato de fecha_desde inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if fecha_hasta:
            try:
                queryset = queryset.filter(fecha_hora_inicio__date__lte=fecha_hasta)
            except Exception:
                return Response(
                    {'error': 'Formato de fecha_hasta inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Filtro por estado de llamada
        if estado:
            estado_id = get_estado_id('ESTADO_LLAMADA', estado.upper())
            if estado_id:
                queryset = queryset.filter(estado_llamada_id=estado_id)
            else:
                return Response(
                    {'error': f'Estado "{estado}" no válido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Filtro por fue_contestada (llamadas que realmente fueron contestadas)
        if fue_contestada is not None:
            if fue_contestada.lower() in ['true', '1', 'yes']:
                queryset = queryset.filter(fue_contestada=True)
            elif fue_contestada.lower() in ['false', '0', 'no']:
                queryset = queryset.filter(fue_contestada=False)
        
        # Búsqueda por número de teléfono (solo en destino)
        # Limpia el + y espacios para mejor compatibilidad
        if telefono:
            telefono_limpio = telefono.replace('+', '').replace(' ', '').replace('-', '')
            queryset = queryset.filter(
                django_models.Q(telefono_destino__icontains=telefono) |
                django_models.Q(telefono_destino__icontains=telefono_limpio)
            )
        
        # Búsqueda por nombre de cliente (solo campo nombre)
        if cliente:
            queryset = queryset.filter(
                cliente__nombre__icontains=cliente
            )
        
        # Optimizar consulta con select_related y prefetch_related
        queryset = queryset.select_related(
            'agente',
            'cliente',
            'venta',
            'estado_llamada',
            'estado_venta',
            'estado_reportada'
        ).prefetch_related(
            'formularios'
        ).order_by('-fecha_hora_inicio')
        
        # Contar total de resultados
        total_count = queryset.count()
        
        # Paginación
        page_size = request.query_params.get('page_size', 20)
        try:
            page_size = int(page_size)
            if page_size < 1:
                page_size = 20
            elif page_size > 100:
                page_size = 100
        except ValueError:
            page_size = 20
        
        page = request.query_params.get('page', 1)
        try:
            page = int(page)
            if page < 1:
                page = 1
        except ValueError:
            page = 1
        
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
                'message': 'No se encontraron llamadas'
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
            'results': serializer.data
        })

class HistorialJefeCampanaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para historial de llamadas del Jefe de Campaña.
    Solo lectura - permite ver llamadas de sus campañas asignadas.
    
    Endpoints:
    - GET /api/calls/historial-jefecampana/ - Lista de llamadas con filtros
    - GET /api/calls/historial-jefecampana/{id}/ - Detalle de una llamada específica
    - GET /api/calls/historial-jefecampana/mis_campanas/ - Lista de campañas del jefe

    Filtros disponibles (query params):
    - campana_id: ID de la campaña (obligatorio si tiene más de una)
    - agente_nombre: Nombre del agente (búsqueda parcial)
    - telefono: Teléfono del cliente (búsqueda parcial)
    - fue_contestada: true/false
    - estado_llamada: COMPLETADA, NO_CONTESTADA, etc.
    - fecha_desde: YYYY-MM-DD
    - fecha_hasta: YYYY-MM-DD
    - page: Número de página (default: 1)
    - page_size: Tamaño de página (default: 6, max: 100)
    """
    serializer_class = HistorialJefeCampanaSerializer
    permission_classes = [IsAuthenticated, IsJefeCampana]
    
    def get_queryset(self):
        """
        Retorna llamadas de las campañas asignadas al jefe de campaña.
        Solo el admin puede ver todas las llamadas.
        """
        user = self.request.user
        
        # Verificar si es admin
        rol_admin = get_estado('ROL_USUARIO', 'ADMIN')
        es_admin = user.rol == rol_admin
        
        # Base queryset
        if es_admin:
            # Admin ve todas las llamadas
            queryset = Llamada.objects.all()
        else:
            # Jefe de campaña solo ve llamadas de sus campañas
            from apps.campaigns.models import Campana
            campanas_ids = Campana.objects.filter(
                jefe_campana=user
            ).values_list('id', flat=True)
            
            # Filtrar por campañas del jefe usando la relación a través del cliente
            queryset = Llamada.objects.filter(
                cliente__campana_id__in=campanas_ids
            )
        
        # ===== APLICAR FILTROS =====
        
        # Filtro por campaña específica
        campana_id = self.request.query_params.get('campana_id')
        if campana_id:
            try:
                queryset = queryset.filter(cliente__campana_id=campana_id)
            except ValueError:
                pass
        
        # Filtro por nombre de agente
        agente_nombre = self.request.query_params.get('agente_nombre')
        if agente_nombre:
            queryset = queryset.filter(
                django_models.Q(agente__first_name__icontains=agente_nombre) |
                django_models.Q(agente__last_name__icontains=agente_nombre)
            )
        
        # Filtro por teléfono
        telefono = self.request.query_params.get('telefono')
        if telefono:
            telefono_limpio = telefono.replace('+', '').replace(' ', '').replace('-', '')
            queryset = queryset.filter(
                django_models.Q(telefono_destino__icontains=telefono) |
                django_models.Q(telefono_destino__icontains=telefono_limpio) |
                django_models.Q(cliente__telefono__icontains=telefono) |
                django_models.Q(cliente__telefono__icontains=telefono_limpio)
            )
        
        # Filtro por fue_contestada
        fue_contestada = self.request.query_params.get('fue_contestada')
        if fue_contestada is not None:
            if fue_contestada.lower() in ['true', '1', 'yes', 'si']:
                queryset = queryset.filter(fue_contestada=True)
            elif fue_contestada.lower() in ['false', '0', 'no']:
                queryset = queryset.filter(fue_contestada=False)
        
        # Filtro por estado de llamada
        estado_llamada = self.request.query_params.get('estado_llamada')
        if estado_llamada:
            estado_id = get_estado_id('ESTADO_LLAMADA', estado_llamada.upper())
            if estado_id:
                queryset = queryset.filter(estado_llamada_id=estado_id)
        
        # Filtro por rango de fechas
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            try:
                queryset = queryset.filter(fecha_hora_inicio__date__gte=fecha_desde)
            except Exception:
                pass
        
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            try:
                queryset = queryset.filter(fecha_hora_inicio__date__lte=fecha_hasta)
            except Exception:
                pass
        
        # Optimizar consulta
        queryset = queryset.select_related(
            'agente',
            'cliente',
            'cliente__campana',
            'venta',
            'estado_llamada',
            'estado_venta',
            'estado_reportada'
        ).prefetch_related(
            'formularios'
        )
        
        return queryset.order_by('-fecha_hora_inicio')
    
    def list(self, request, *args, **kwargs):
        """
        Lista paginada de llamadas con validación de campaña.
        """
        queryset = self.get_queryset()
        
        # Contar total antes de paginar
        total_count = queryset.count()
        
        # Configurar paginación
        page_size = request.query_params.get('page_size', 6)
        try:
            page_size = int(page_size)
            if page_size < 1:
                page_size = 6
            elif page_size > 100:
                page_size = 100
        except ValueError:
            page_size = 6
        
        page = request.query_params.get('page', 1)
        try:
            page = int(page)
            if page < 1:
                page = 1
        except ValueError:
            page = 1
        
        # Paginar
        start = (page - 1) * page_size
        end = start + page_size
        llamadas_pagina = queryset[start:end]
        
        # Serializar
        serializer = self.get_serializer(llamadas_pagina, many=True)
        
        # Calcular total de páginas
        import math
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 0
        
        return Response({
            'count': total_count,
            'total_pages': total_pages,
            'current_page': page,
            'page_size': page_size,
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'], url_path='mis-campanas')
    def mis_campanas(self, request):
        """
        Retorna las campañas asignadas al jefe de campaña.
        Útil para el selector de campaña en el frontend.
        """
        user = request.user
        
        # Verificar si es admin
        rol_admin = get_estado('ROL_USUARIO', 'ADMIN')
        es_admin = user.rol == rol_admin
        
        from apps.campaigns.models import Campana
        
        if es_admin:
            # Admin ve todas las campañas
            campanas = Campana.objects.all()
        else:
            # Jefe solo ve sus campañas
            campanas = Campana.objects.filter(jefe_campana=user)
        
        # Serializar
        campanas_data = []
        for campana in campanas:
            campanas_data.append({
                'id': campana.id,
                'nombre': campana.nombre,
                'descripcion': campana.descripcion,
                'fecha_inicio': campana.fecha_inicio,
                'fecha_fin': campana.fecha_fin,
                'estado': campana.estado.valor if campana.estado else None,
            })
        
        return Response({
            'count': len(campanas_data),
            'campanas': campanas_data
        })
        
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
    

