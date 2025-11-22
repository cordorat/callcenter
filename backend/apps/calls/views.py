"""
ViewSets para gestión de llamadas del call center.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import models as django_models
from django.utils import timezone

logger = logging.getLogger(__name__)

from apps.calls.models import Llamada, FormularioVenta, Venta
from apps.campaigns.models import Cliente, Campana
from apps.users.permissions import IsAdmin, IsJefeCampana, IsAdminOrOwner
from apps.users.models import User
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
    HistorialJefeCampanaSerializer,
    RegistrarVentaSerializer,
    VentaSerializer
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
    por_base_datos: Listar clientes de una base de datos específica
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
    
    @action(detail=False, methods=['get'], url_path='por-base-datos')
    def por_base_datos(self, request):
        """
        Lista los clientes pertenecientes a una base de datos específica.
        Accesible por Jefes de Campaña para ver clientes de sus bases de datos.
        
        URL: GET /api/calls/clientes/por-base-datos/?base_datos_id={id}
        
        Query Parameters:
        - base_datos_id: ID de la base de datos (requerido)
        - search: Búsqueda por nombre (opcional)
        - telefono: Búsqueda por teléfono (opcional)
        - page: Número de página (default: 1)
        - page_size: Tamaño de página (default: 20, max: 100)
        
        Response:
        {
            "count": 150,
            "total_pages": 8,
            "current_page": 1,
            "page_size": 20,
            "base_datos": {
                "id": 1,
                "nombre": "Base Clientes Q4 2025",
                "campana_id": 5,
                "campana_nombre": "Campaña Navidad",
                "fecha_carga": "2025-11-01T10:00:00Z"
            },
            "results": [
                {
                    "cliente_id": 123,
                    "nombre": "Juan Pérez",
                    "telefono": "+573001234567",
                    "otros_datos": {...}
                },
                ...
            ]
        }
        """
        # Validar que se proporcione base_datos_id
        base_datos_id = request.query_params.get('base_datos_id')
        if not base_datos_id:
            return Response(
                {'error': 'El parámetro base_datos_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            base_datos_id = int(base_datos_id)
        except ValueError:
            return Response(
                {'error': 'El parámetro base_datos_id debe ser un número entero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener la base de datos
        from apps.campaigns.models import BaseDatosCargada
        try:
            base_datos = BaseDatosCargada.objects.select_related('campana').get(id=base_datos_id)
        except BaseDatosCargada.DoesNotExist:
            return Response(
                {'error': 'Base de datos no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos: Jefe de Campaña solo puede ver bases de sus campañas
        user = request.user
        if not user.is_admin():
            # Si es Jefe de Campaña, verificar que la base pertenezca a su campaña
            if user.is_jefe_campana():
                if base_datos.campana.jefe_campana != user:
                    return Response(
                        {'error': 'No tiene permisos para ver clientes de esta base de datos'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # Otros roles no tienen acceso
                return Response(
                    {'error': 'No tiene permisos para ver clientes de bases de datos'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Filtrar clientes por base_datos_id
        queryset = Cliente.objects.filter(base_datos_id=base_datos_id)
        
        # Aplicar filtros opcionales
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(nombre__icontains=search)
        
        telefono = request.query_params.get('telefono')
        if telefono:
            queryset = queryset.filter(telefono__icontains=telefono)
        
        # Ordenar por ID (más recientes primero)
        queryset = queryset.order_by('-cliente_id')
        
        # Contar total de clientes
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
        clientes_pagina = queryset[start:end]
        
        # Serializar resultados
        serializer = ClienteSerializer(clientes_pagina, many=True)
        
        # Calcular páginas totales
        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 0
        
        return Response({
            'count': total_count,
            'total_pages': total_pages,
            'current_page': page,
            'page_size': page_size,
            'base_datos': {
                'id': base_datos.id,
                'nombre': base_datos.nombre_bd,
                'campana_id': base_datos.campana.id if base_datos.campana else None,
                'campana_nombre': base_datos.campana.nombre if base_datos.campana else None,
                'fecha_carga': base_datos.fecha_carga,
                'iteracion_activa': base_datos.iteracion_activa,
                'fecha_hora_inicio_iteracion': base_datos.fecha_hora_inicio_iteracion
            },
            'results': serializer.data
        })


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
        - BackOffice y Admin ven todas las llamadas
        - Coordinadores ven llamadas de su equipo
        - Agentes solo ven sus propias llamadas
        """
        user = self.request.user
        
        # BackOffice y Admin ven todas las llamadas
        if user.is_backoffice() or user.is_admin():
            queryset = Llamada.objects.all()
        # Coordinadores ven llamadas de su equipo
        elif user.is_coordinador():
            from apps.campaigns.models import Equipo
            equipos = Equipo.objects.filter(coordinador=user, is_active=True)
            if equipos.exists():
                agentes_equipo = User.objects.filter(equipos__in=equipos).distinct()
                queryset = Llamada.objects.filter(agente__in=agentes_equipo)
            else:
                queryset = Llamada.objects.none()
        # Agentes solo ven sus propias llamadas
        else:
            queryset = Llamada.objects.filter(agente=user)
        
        # Filtros opcionales
        estado_valor = self.request.query_params.get('estado')
        if estado_valor:
            estado_id = get_estado_id('ESTADO_LLAMADA', estado_valor)
            if estado_id:
                queryset = queryset.filter(estado_llamada_id=estado_id)
        
        campana_id = self.request.query_params.get('campana_id')
        if campana_id:
            queryset = queryset.filter(campana_id=campana_id)
        
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(fecha_hora_inicio__gte=fecha_desde)
        
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(fecha_hora_inicio__lte=fecha_hasta)
        
        return queryset.select_related(
            'agente', 'cliente', 'venta', 'estado_venta', 'estado_llamada', 'estado_auditoria', 'estado_reportada'
        ).order_by('-fecha_hora_inicio')
    
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
    
    @action(detail=False, methods=['get'], url_path='by-sid/(?P<call_sid>[^/.]+)')
    def by_sid(self, request, call_sid=None):
        """
        Obtiene una llamada por su Twilio Call SID con información completa del cliente.
        
        URL: GET /api/calls/llamadas/by-sid/<call_sid>/
        
        Retorna:
            - Información completa de la llamada
            - Información del cliente expandida (con otros_datos parseados)
        """
        try:
            llamada = Llamada.objects.select_related('cliente', 'agente', 'venta').get(
                twilio_call_sid=call_sid
            )
            
            # Validar permisos: solo el agente asignado o admin
            if llamada.agente != request.user and not request.user.is_admin():
                return Response(
                    {'detail': 'No tiene permisos para ver esta llamada.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Serializar llamada
            data = LlamadaSerializer(llamada).data
            
            # Expandir datos del cliente si existe
            if llamada.cliente:
                cliente = llamada.cliente
                data['cliente_expandido'] = {
                    'id': cliente.cliente_id,
                    'nombre': cliente.nombre,
                    'telefono': cliente.telefono,
                    'documento': cliente.otros_datos.get('documento') if cliente.otros_datos else None,
                    'direccion': cliente.otros_datos.get('direccion') if cliente.otros_datos else None,
                    'correo': cliente.otros_datos.get('correo') if cliente.otros_datos else None,
                    'ciudad': cliente.otros_datos.get('ciudad') if cliente.otros_datos else None,
                }
            else:
                data['cliente_expandido'] = None
            
            return Response(data)
        
        except Llamada.DoesNotExist:
            return Response(
                {'detail': 'Llamada no encontrada con el SID proporcionado.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='create')
    def create_call(self, request):
        """
        Crea un registro de llamada manual antes de iniciar la llamada con Twilio.
        
        URL: POST /api/calls/llamadas/create/
        
        Body:
        {
            "telefono_destino": "+573001234567",
            "campana_id": 1,
            "agente_id": 123,
            "tipo": "saliente"
        }
        """
        telefono_destino = request.data.get('telefono_destino')
        campana_id = request.data.get('campana_id')
        agente_id = request.data.get('agente_id')
        
        if not telefono_destino:
            return Response(
                {'error': 'telefono_destino es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que el agente sea el usuario autenticado o admin
        if agente_id != request.user.pk and not request.user.is_admin():
            return Response(
                {'error': 'No tiene permisos para crear llamadas para otro agente'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Obtener estados iniciales
            estado_pendiente = get_estado_id('ESTADO_LLAMADA', 'PENDIENTE')
            estado_no_venta = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
            estado_no_reportada = get_estado_id('ESTADO_REPORTE', 'NO_REPORTADA')
            
            if not all([estado_pendiente, estado_no_venta, estado_no_reportada]):
                return Response(
                    {'error': 'Estados del sistema no configurados correctamente. Verifica TiposParametros.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Buscar cliente por teléfono si existe y hay campaña
            cliente = None
            if campana_id:
                cliente = Cliente.objects.filter(
                    telefono=telefono_destino,
                    campana_id=campana_id
                ).first()
            print("PRELLAMADA")
            # Crear llamada
            llamada = Llamada.objects.create(
                agente=agente_id,
                cliente=cliente,
                telefono_origen='',
                telefono_destino=telefono_destino,
                estado_llamada=estado_pendiente,
                estado_venta=estado_no_venta,
                estado_reportada=estado_no_reportada,
                fue_contestada=False
            )
            print("POSTLLAMADA")
            return Response({
                'id': llamada.id,
                'telefono_destino': llamada.telefono_destino,
                'cliente_id': llamada.cliente.cliente_id if llamada.cliente else None,
                'fecha_hora_inicio': llamada.fecha_hora_inicio,
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Error creando llamada: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='disponible-venta')
    def disponible_venta(self, request):
        """
        Obtiene la última llamada del agente que está disponible para registrar venta.
        
        URL: GET /api/calls/llamadas/disponible-venta/
        """
        # Buscar la llamada más reciente del agente
        llamada = Llamada.objects.filter(
            agente=request.user
        ).select_related('cliente', 'venta').order_by('-fecha_hora_inicio').first()
        
        if not llamada:
            return Response(
                {'detail': 'No hay llamadas disponibles para registrar venta.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Preparar respuesta
        data = {
            'llamada': {
                'id': llamada.id,
                'telefono_destino': llamada.telefono_destino,
                'telefono_origen': llamada.telefono_origen,
                'campana_id': llamada.venta.campana_id.id if llamada.venta else None,
                'sid': llamada.twilio_call_sid,
                'fecha_inicio': llamada.fecha_hora_inicio,
            }
        }
        
        # Agregar cliente si existe
        if llamada.cliente:
            cliente = llamada.cliente
            data['cliente'] = {
                'id': cliente.cliente_id,
                'nombre': cliente.nombre,
                'telefono': cliente.telefono,
                'documento': cliente.otros_datos.get('documento') if cliente.otros_datos else None,
                'direccion': cliente.otros_datos.get('direccion') if cliente.otros_datos else None,
                'correo': cliente.otros_datos.get('correo') if cliente.otros_datos else None,
                'ciudad': cliente.otros_datos.get('ciudad') if cliente.otros_datos else None,
            }
        else:
            data['cliente'] = None
        
        return Response(data)
    
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
    
    @action(detail=False, methods=['get'], url_path='by-sid/(?P<call_sid>[^/.]+)')
    def by_sid(self, request, call_sid=None):
        """
        Obtiene la información completa de una llamada usando el Twilio CallSid.
        
        URL: /api/calls/llamadas/by-sid/{callSid}/
        
        Este endpoint es útil durante una llamada activa cuando el frontend
        tiene el CallSid del evento de Twilio pero necesita la información
        completa del modelo Llamada.
        
        Response:
        {
            "id": 123,
            "agente": 1,
            "agente_nombre": "Juan Pérez",
            "cliente": 45,
            "cliente_nombre": "María García",
            "cliente_telefono": "+573001234567",
            "telefono_origen": "+573009876543",
            "telefono_destino": "+573001234567",
            "fecha_hora_inicio": "2025-11-04T10:30:00Z",
            "fecha_hora_fin": null,
            "duracion": 120,
            "twilio_call_sid": "CA1234567890abcdef",
            "twilio_status": "in-progress",
            "fue_contestada": true,
            "estado_llamada": 2,
            "estado_llamada_valor": "EN_CURSO",
            "estado_venta": 1,
            "estado_venta_valor": "NO_VENTA",
            ...
        }
        """
        if not call_sid:
            return Response(
                {'error': 'CallSid es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # 🔍 Buscar la llamada por twilio_call_sid (parent) O twilio_child_call_sid (child)
            # Esto es necesario porque en llamadas automáticas con <Dial>, el frontend
            # recibe el CallSid del child (la conexión del agente), pero el backend
            # guarda inicialmente solo el parent CallSid (la llamada al cliente)
            from django.db.models import Q
            llamada = Llamada.objects.select_related(
                'agente',
                'cliente',
                'venta',
                'estado_llamada',
                'estado_venta',
                'estado_reportada',
                'estado_auditoria'
            ).filter(
                Q(twilio_call_sid=call_sid) | Q(twilio_child_call_sid=call_sid)
            ).first()
            
            if not llamada:
                logger.warning(f"[by_sid] ⚠️ Llamada no encontrada con CallSid: {call_sid}")
                
                # Buscar parent call mediante API de Twilio
                from common.twilio_client import twilio_client
                
                if twilio_client.is_configured():
                    try:
                        call_details = twilio_client.get_call_details(call_sid)
                        parent_call_sid = call_details.get('parent_call_sid')
                        
                        if parent_call_sid:
                            llamada = Llamada.objects.select_related(
                                'agente',
                                'cliente',
                                'venta',
                                'estado_llamada',
                                'estado_venta',
                                'estado_reportada',
                                'estado_auditoria'
                            ).filter(twilio_call_sid=parent_call_sid).first()
                            
                            if llamada:
                                if not llamada.twilio_child_call_sid:
                                    llamada.twilio_child_call_sid = call_sid
                                    llamada.save(update_fields=['twilio_child_call_sid'])
                    except Exception as e:
                        logger.error(f"[by_sid] ❌ Error consultando API de Twilio: {str(e)}")
                
                # Si aún no tenemos llamada, lanzar excepción
                if not llamada:
                    logger.error(f"[by_sid] ❌ Llamada no encontrada: {call_sid}")
                    raise Llamada.DoesNotExist

            
            # Verificar permisos: el agente solo puede ver sus propias llamadas
            user = request.user
            if not (user.is_admin() or user.is_backoffice() or llamada.agente == user):
                # Si es coordinador, verificar que la llamada sea de su equipo
                if user.is_coordinador():
                    from apps.campaigns.models import Equipo
                    equipos = Equipo.objects.filter(coordinador=user, is_active=True)
                    if equipos.exists():
                        agentes_equipo = User.objects.filter(equipos__in=equipos).distinct()
                        if llamada.agente not in agentes_equipo:
                            return Response(
                                {'error': 'No tiene permisos para ver esta llamada'},
                                status=status.HTTP_403_FORBIDDEN
                            )
                    else:
                        return Response(
                            {'error': 'No tiene permisos para ver esta llamada'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                else:
                    return Response(
                        {'error': 'No tiene permisos para ver esta llamada'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Serializar con el serializer de historial que incluye más información
            serializer = HistorialLlamadaSerializer(llamada)
            return Response(serializer.data)
            
        except Llamada.DoesNotExist:
            logger.warning(f"[by_sid] Llamada no encontrada: {call_sid}")
            
            return Response(
                {'error': 'Llamada no encontrada con ese CallSid'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='client-by-call-sid/(?P<call_sid>[^/.]+)')
    def client_by_call_sid(self, request, call_sid=None):
        """
        Obtiene la información del cliente asociado a una llamada usando el Twilio CallSid.
        
        URL: /api/calls/llamadas/client-by-call-sid/{callSid}/
        
        Este endpoint complementa by_sid proporcionando específicamente
        los datos del cliente en formato más completo.
        
        Response:
        {
            "cliente_id": 45,
            "nombre": "María García",
            "documento": "1234567890",
            "telefono": "+573001234567",
            "correo": "maria@example.com",
            "direccion": "Calle 123 #45-67",
            "ciudad": "Bogotá",
            "otros_datos": {...}
        }
        """
        if not call_sid:
            return Response(
                {'error': 'CallSid es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            from django.db.models import Q
            llamada = Llamada.objects.select_related('cliente', 'agente').filter(
                Q(twilio_call_sid=call_sid) | Q(twilio_child_call_sid=call_sid)
            ).first()
            
            if not llamada:
                from common.twilio_client import twilio_client
                
                if twilio_client.is_configured():
                    try:
                        call_details = twilio_client.get_call_details(call_sid)
                        parent_call_sid = call_details.get('parent_call_sid')
                        
                        if parent_call_sid:
                            llamada = Llamada.objects.select_related('cliente', 'agente').filter(
                                twilio_call_sid=parent_call_sid
                            ).first()
                            
                            if llamada and not llamada.twilio_child_call_sid:
                                llamada.twilio_child_call_sid = call_sid
                                llamada.save(update_fields=['twilio_child_call_sid'])
                    except Exception as e:
                        logger.error(f"[client_by_call_sid] Error API Twilio: {str(e)}")
                
                if not llamada:
                    raise Llamada.DoesNotExist
            
            # Verificar permisos
            user = request.user
            if not (user.is_admin() or user.is_backoffice() or llamada.agente == user):
                if user.is_coordinador():
                    from apps.campaigns.models import Equipo
                    equipos = Equipo.objects.filter(coordinador=user, is_active=True)
                    if equipos.exists():
                        agentes_equipo = User.objects.filter(equipos__in=equipos).distinct()
                        if llamada.agente not in agentes_equipo:
                            return Response(
                                {'error': 'No tiene permisos para ver esta llamada'},
                                status=status.HTTP_403_FORBIDDEN
                            )
                    else:
                        return Response(
                            {'error': 'No tiene permisos para ver esta llamada'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                else:
                    return Response(
                        {'error': 'No tiene permisos para ver esta llamada'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            if not llamada.cliente:
                return Response(
                    {'error': 'Esta llamada no tiene cliente asociado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Serializar el cliente
            serializer = ClienteSerializer(llamada.cliente)
            return Response(serializer.data)
            
        except Llamada.DoesNotExist:
            return Response(
                {'error': 'Llamada no encontrada con ese CallSid'},
                status=status.HTTP_404_NOT_FOUND
            )
    
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
    
    @action(detail=True, methods=['post'], url_path='marcar-auditada')
    def marcar_auditada(self, request, pk=None):
        """
        Marca una llamada como auditada.
        Solo accesible por usuarios BackOffice o Admin.
        
        POST /api/calls/llamadas/{id}/marcar-auditada/
        
        Body (opcional):
        {
            "notas_auditoria": "Observaciones del auditor"
        }
        
        Response:
        {
            "success": true,
            "message": "La llamada ha sido auditada exitosamente",
            "llamada": {
                "id": 123,
                "estado_auditoria": "AUDITADA",
                "fecha_auditoria": "2025-11-10T10:30:00Z",
                "auditado_por": "Juan Pérez",
                "notas_auditoria": "Todo correcto"
            }
        }
        """
        try:
            llamada = self.get_object()
            
            # Verificar permisos: Solo BackOffice o Admin
            if not (request.user.is_backoffice() or request.user.is_admin()):
                return Response(
                    {'error': 'No tiene permisos para auditar llamadas'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar si ya está auditada
            estado_auditada = get_estado_id('ESTADO_AUDITORIA', 'AUDITADA')
            if llamada.estado_auditoria_id == estado_auditada:
                return Response(
                    {'error': 'Esta llamada ya ha sido auditada'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Actualizar la llamada
            llamada.estado_auditoria_id = estado_auditada
            llamada.fecha_auditoria = timezone.now()
            llamada.auditado_por = request.user
            
            # Guardar notas si se proporcionan
            notas = request.data.get('notas_auditoria', '')
            if notas:
                llamada.notas_auditoria = notas
            
            llamada.save()
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"[AUDITORIA] Llamada {llamada.id} auditada por {request.user.get_full_name()}")
            
            return Response({
                'success': True,
                'message': 'La llamada ha sido auditada exitosamente',
                'llamada': {
                    'id': llamada.id,
                    'estado_auditoria': 'AUDITADA',
                    'fecha_auditoria': llamada.fecha_auditoria,
                    'auditado_por': request.user.get_full_name(),
                    'notas_auditoria': llamada.notas_auditoria
                }
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[AUDITORIA] Error al auditar llamada {pk}: {str(e)}")
            return Response(
                {'error': f'Error al auditar la llamada: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='reportar')
    def reportar(self, request, pk=None):
        """
        Crea un reporte de problema para una llamada.
        Solo accesible por usuarios BackOffice o Admin.
        
        POST /api/calls/llamadas/{id}/reportar/
        
        Body:
        {
            "descripcion": "Descripción del problema (10-500 caracteres)"
        }
        
        Response:
        {
            "success": true,
            "message": "La llamada ha sido reportada exitosamente",
            "reporte": {
                "id": 45,
                "descripcion": "...",
                "fecha_reporte": "2025-11-10T10:30:00Z",
                "reportado_por": "Juan Pérez"
            }
        }
        """
        try:
            llamada = self.get_object()
            
            # Verificar permisos: Solo BackOffice o Admin
            if not (request.user.is_backoffice() or request.user.is_admin()):
                return Response(
                    {'error': 'No tiene permisos para reportar llamadas'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Crear el reporte usando el serializer
            from apps.calls.serializers import ReporteLlamadaSerializer
            
            serializer = ReporteLlamadaSerializer(
                data={'llamada': llamada.id, 'descripcion': request.data.get('descripcion')},
                context={'request': request}
            )
            
            if serializer.is_valid():
                reporte = serializer.save()
                estado_reporte = get_estado_id('ESTADO_REPORTE', 'REPORTADA')
                llamada.estado_reportada_id = estado_reporte
                llamada.save()
                
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"[REPORTE] Llamada {llamada.id} reportada por {request.user.get_full_name()}")
                
                return Response({
                    'success': True,
                    'message': 'La llamada ha sido reportada exitosamente',
                    'reporte': {
                        'id': reporte.id,
                        'descripcion': reporte.descripcion,
                        'fecha_reporte': reporte.fecha_reporte,
                        'reportado_por': request.user.get_full_name()
                    }
                }, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {'error': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[REPORTE] Error al reportar llamada {pk}: {str(e)}")
            return Response(
                {'error': f'Error al reportar la llamada: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='reportes')
    def obtener_reportes(self, request, pk=None):
        """
        Obtiene todos los reportes de una llamada.
        
        GET /api/calls/llamadas/{id}/reportes/
        
        Response:
        {
            "count": 2,
            "reportes": [
                {
                    "id": 45,
                    "descripcion": "...",
                    "fecha_reporte": "2025-11-10T10:30:00Z",
                    "reportado_por": "Juan Pérez"
                }
            ]
        }
        """
        try:
            llamada = self.get_object()
            
            # Verificar permisos
            if not (request.user.is_backoffice() or request.user.is_admin()):
                return Response(
                    {'error': 'No tiene permisos para ver reportes'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            from apps.calls.models import ReporteLlamada
            from apps.calls.serializers import ReporteLlamadaListSerializer
            
            reportes = ReporteLlamada.objects.filter(llamada=llamada).order_by('-fecha_reporte')
            serializer = ReporteLlamadaListSerializer(reportes, many=True)
            
            return Response({
                'count': reportes.count(),
                'reportes': serializer.data
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[REPORTE] Error al obtener reportes de llamada {pk}: {str(e)}")
            return Response(
                {'error': f'Error al obtener reportes: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
        - cliente_id: Número de documento/identificación
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


class ReporteLlamadaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de reportes de llamadas.
    Solo accesible por BackOffice y Admin.
    
    list: Listar todos los reportes
    retrieve: Obtener un reporte específico
    create: Crear un nuevo reporte (también disponible via LlamadaViewSet.reportar)
    """
    from apps.calls.models import ReporteLlamada
    from apps.calls.serializers import ReporteLlamadaSerializer, ReporteLlamadaListSerializer
    
    queryset = ReporteLlamada.objects.all()
    serializer_class = ReporteLlamadaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Solo BackOffice y Admin pueden ver reportes.
        """
        user = self.request.user
        
        if not (user.is_backoffice() or user.is_admin()):
            from apps.calls.models import ReporteLlamada
            return ReporteLlamada.objects.none()
        
        queryset = self.queryset.select_related(
            'llamada',
            'llamada__agente',
            'llamada__cliente',
            'reportado_por'
        ).order_by('-fecha_reporte')
        
        # Filtros opcionales
        llamada_id = self.request.query_params.get('llamada_id')
        if llamada_id:
            queryset = queryset.filter(llamada_id=llamada_id)
        
        reportado_por = self.request.query_params.get('reportado_por')
        if reportado_por:
            queryset = queryset.filter(reportado_por_id=reportado_por)
        
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            queryset = queryset.filter(fecha_reporte__gte=fecha_desde)
        
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            queryset = queryset.filter(fecha_reporte__lte=fecha_hasta)
        
        return queryset
    
    def get_serializer_class(self):
        """
        Usa serializer simplificado para list, completo para retrieve/create.
        """
        if self.action == 'list':
            from apps.calls.serializers import ReporteLlamadaListSerializer
            return ReporteLlamadaListSerializer
        from apps.calls.serializers import ReporteLlamadaSerializer
        return ReporteLlamadaSerializer
    
    def perform_create(self, serializer):
        """
        Asigna automáticamente el usuario que crea el reporte.
        """
        serializer.save(reportado_por=self.request.user)

