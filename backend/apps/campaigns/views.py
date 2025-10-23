from django.shortcuts import render
from django.db import models
from django.db.models import Q
from django.utils import timezone
import csv
import chardet
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated
from .models import Cliente, BaseDatosCargada, Equipo, EquipoAgenteDetalle, Campana
from .serializers import (
    BaseDatosCargadaSerializer, ClienteSerializer, ClienteUpdateSerializer,
    EquipoSerializer, EquipoCreateSerializer, EquipoUpdateSerializer,
    AgenteSimpleSerializer, CampanaSimpleSerializer
)
from apps.users.models import User
from common.estados_helper import get_estado_id
from django.core.paginator import Paginator

class CargarBaseDatosView(APIView):

    def post(self, request, *args, **kwargs):
        campana_id = request.data.get("campana_id")
        file = request.FILES.get("file")

        if not file:
            return Response({"error": "Debe subir un archivo CSV"}, status=status.HTTP_400_BAD_REQUEST)

        # Crear registro de carga
        base_datos = BaseDatosCargada.objects.create(
            campana_id=campana_id,
            nombre_bd=file.name
        )
        base_datos_id = base_datos.id

        # Detectar codificación del archivo
        raw_data = file.read()
        result = chardet.detect(raw_data)
        encoding = result["encoding"] or "utf-8"
        print(f"📄 Codificación detectada: {encoding}")

        # Decodificar con la codificación detectada
        try:
            decoded_file = raw_data.decode(encoding, errors="replace").splitlines()
        except Exception as e:
            return Response({"error": f"Error al decodificar el archivo: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Leer CSV de forma segura
        reader = csv.DictReader(decoded_file)

        clientes_creados = 0
        for row in reader:
            # Normalizar claves (sin espacios ni mayúsculas)
            row_normalized = {
                (k.strip().lower() if k else ""): (v.strip() if isinstance(v, str) else v)
                for k, v in row.items()
            }

            # Detectar nombre y teléfono con tolerancia
            nombre_field = next((k for k in row_normalized.keys() if "nombre" in k), None)
            telefono_field = next((k for k in row_normalized.keys() if "tel" in k), None)

            nombre = row_normalized.get(nombre_field, "") or ""
            telefono = row_normalized.get(telefono_field, "") or ""

            # Guardar el resto como JSON limpio
            otros = {k: v for k, v in row_normalized.items() if k not in [nombre_field, telefono_field]}

            Cliente.objects.create(
                base_datos_id=base_datos_id,
                campana_id=campana_id,
                nombre=nombre,
                telefono=telefono,
                otros_datos=otros
            )
            clientes_creados += 1

        return Response(
            {
                "mensaje": f"Base de datos cargada correctamente. {clientes_creados} clientes registrados.",
                "codificacion_detectada": encoding
            },
            status=status.HTTP_201_CREATED
        )
@api_view(['GET'])
def listar_bases_datos(request):
    bases = BaseDatosCargada.objects.all()
    paginator = Paginator(bases, 20)
    page = request.query_params.get("page", 1)
    page_obj = paginator.get_page(page)
    serializer = BaseDatosCargadaSerializer(page_obj.object_list, many=True)
    return Response({
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
        "page_size": paginator.per_page,
        "results": serializer.data
    }, status=status.HTTP_200_OK)
@api_view(['GET'])
def detalle_base_datos(request, pk):
    try:
        base = BaseDatosCargada.objects.get(pk=pk)
    except BaseDatosCargada.DoesNotExist:
        return Response({"error": "Base de datos no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    serializer = BaseDatosCargadaSerializer(base)
    return Response(serializer.data)


@api_view(['GET'])
def cargar_bd_registros(request, pk):
    """
    GET /api/clientes/base/<pk>/?page=2
    """
    # Validar existencia de la base
    if not BaseDatosCargada.objects.filter(pk=pk).exists():
        return Response(
            {"error": "La base de datos indicada no existe"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Obtener el queryset de clientes
    queryset = Cliente.objects.filter(base_datos_id=pk).order_by("cliente_id")

    # Paginación manual (20 por página)
    paginator = Paginator(queryset, 20)
    page = request.query_params.get("page", 1)
    page_obj = paginator.get_page(page)

    # Serializar resultados
    serializer = ClienteSerializer(page_obj.object_list, many=True)

    return Response({
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
        "page_size": paginator.per_page,
        "results": serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
def programar_iteracion_bd(request, pk):
    """
    PUT /api/campaigns/base-datos/<pk>/programar-iteracion/
    
    Programa o inicia la iteración de una base de datos.
    
    Opciones:
    1. Iniciar AHORA: { "iteracion_activa": true }
    2. Programar: { "fecha_hora_inicio_iteracion": "2025-10-20T14:30:00-05:00" }
    
    Solo se puede enviar UNO de los dos parámetros a la vez.
    """
    try:
        base = BaseDatosCargada.objects.get(pk=pk)
        
        iteracion_activa = request.data.get('iteracion_activa')
        fecha_hora = request.data.get('fecha_hora_inicio_iteracion')
        
        # Validar que solo se envíe uno
        if iteracion_activa is not None and fecha_hora is not None:
            return Response(
                {'error': 'Solo puede enviar iteracion_activa O fecha_hora_inicio_iteracion, no ambos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if iteracion_activa is None and fecha_hora is None:
            return Response(
                {'error': 'Debe enviar iteracion_activa o fecha_hora_inicio_iteracion.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Opción 1: Iniciar AHORA
        if iteracion_activa is True:
            if base.iteracion_activa:
                return Response(
                    {'error': 'La iteración ya está activa.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Importar la tarea de Celery
            from apps.campaigns.tasks import iniciar_iteracion_base
            
            # Guardar hora actual y marcar como activa
            base.fecha_hora_inicio_iteracion = timezone.now()
            base.iteracion_activa = True
            base.save()
            
            # Lanzar tarea asíncrona
            iniciar_iteracion_base.delay(base.id)
            
            return Response({
                'mensaje': 'Iteración iniciada correctamente.',
                'base_datos_id': base.id,
                'fecha_hora_inicio': base.fecha_hora_inicio_iteracion,
                'iteracion_activa': base.iteracion_activa
            }, status=status.HTTP_200_OK)
        
        # Opción 2: Programar para después
        if fecha_hora is not None:
            from datetime import datetime
            
            try:
                # Parsear fecha
                if isinstance(fecha_hora, str):
                    fecha_hora_obj = datetime.fromisoformat(fecha_hora.replace('Z', '+00:00'))
                else:
                    fecha_hora_obj = fecha_hora
                
                # Validar que sea futura
                if fecha_hora_obj <= timezone.now():
                    return Response(
                        {'error': 'La fecha debe ser futura.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Guardar fecha programada (sin activar todavía)
                base.fecha_hora_inicio_iteracion = fecha_hora_obj
                base.iteracion_activa = False  # No se activa hasta que llegue la hora
                base.save()
                
                return Response({
                    'mensaje': 'Iteración programada correctamente.',
                    'base_datos_id': base.id,
                    'fecha_hora_inicio_programada': base.fecha_hora_inicio_iteracion,
                    'iteracion_activa': base.iteracion_activa
                }, status=status.HTTP_200_OK)
                
            except (ValueError, TypeError) as e:
                return Response(
                    {'error': f'Formato de fecha inválido: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
    except BaseDatosCargada.DoesNotExist:
        return Response(
            {'error': 'Base de datos no encontrada.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión completa de clientes.
    
    Endpoints:
    - GET /api/clientes/ - Listar clientes
    - GET /api/clientes/{id}/ - Obtener cliente específico
    - PUT/PATCH /api/clientes/{id}/ - Actualizar cliente
    - GET /api/clientes/random/ - Obtener cliente aleatorio para testing
    """
    queryset = Cliente.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """
        Usa diferentes serializers según la acción.
        """
        if self.action in ['update', 'partial_update']:
            return ClienteUpdateSerializer
        return ClienteSerializer
    
    def get_queryset(self):
        """
        Filtra clientes según parámetros.
        """
        queryset = Cliente.objects.select_related('campana', 'base_datos').all()
        
        # Filtro por campaña
        campana_id = self.request.query_params.get('campana_id')
        if campana_id:
            queryset = queryset.filter(campana_id=campana_id)
        
        # Filtro por base de datos
        base_datos_id = self.request.query_params.get('base_datos_id')
        if base_datos_id:
            queryset = queryset.filter(base_datos_id=base_datos_id)
        
        # Búsqueda por nombre o teléfono
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(nombre__icontains=search) | 
                models.Q(telefono__icontains=search)
            )
        
        return queryset.order_by('-cliente_id')
    
    def retrieve(self, request, *args, **kwargs):
        """
        Criterio 2.1: Obtiene información completa de un cliente.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'cliente': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        """
        Criterio 5.1: Actualizar cliente con validaciones.
        PUT completo o PATCH parcial.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Criterio 5.2: Notificación de confirmación
            return Response({
                'success': True,
                'message': 'Los datos del cliente han sido actualizados exitosamente',
                'cliente': serializer.data
            }, status=status.HTTP_200_OK)
        
        except serializers.ValidationError as e:
            # Criterio 4.4: Mensaje de error claro
            return Response({
                'success': False,
                'message': 'Error de validación en los datos proporcionados',
                'errors': e.detail
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def partial_update(self, request, *args, **kwargs):
        """
        PATCH - Actualización parcial.
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'], url_path='random')
    def get_random_cliente(self, request):
        """
        Endpoint temporal para obtener un cliente aleatorio.
        GET /api/clientes/random/
        
        Query params opcionales:
        - campana_id: Filtrar por campaña específica
        - base_datos_id: Filtrar por base de datos específica
        """
        queryset = Cliente.objects.all()
        
        # Aplicar filtros si se proporcionan
        campana_id = request.query_params.get('campana_id')
        if campana_id:
            queryset = queryset.filter(campana_id=campana_id)
        
        base_datos_id = request.query_params.get('base_datos_id')
        if base_datos_id:
            queryset = queryset.filter(base_datos_id=base_datos_id)
        
        # Verificar que haya clientes disponibles
        count = queryset.count()
        if count == 0:
            return Response({
                'success': False,
                'message': 'No hay clientes disponibles en la base de datos'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Obtener cliente aleatorio
        random_index = random.randint(0, count - 1)
        cliente = queryset[random_index]
        
        serializer = ClienteSerializer(cliente)
        
        return Response({
            'success': True,
            'message': f'Cliente aleatorio obtenido (total disponibles: {count})',
            'cliente': serializer.data
        }, status=status.HTTP_200_OK)


# ============================================================
# VIEWSET PARA EQUIPOS
# ============================================================

class EquipoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de equipos de trabajo.
    
    Endpoints:
    - GET /api/campaigns/equipos/ - Listar equipos del jefe de centro
    - POST /api/campaigns/equipos/ - Crear equipo
    - GET /api/campaigns/equipos/{id}/ - Obtener equipo específico
    - PATCH /api/campaigns/equipos/{id}/ - Actualizar equipo
    - DELETE /api/campaigns/equipos/{id}/ - Eliminar equipo (soft delete)
    - GET /api/campaigns/equipos/agentes_disponibles/ - Buscar agentes disponibles
    - GET /api/campaigns/equipos/campanas_activas/ - Listar campañas activas
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Criterio 1.3: Mostrar automáticamente lista de todos los equipos del centro.
        Filtrar por jefe_centro si el usuario tiene ese rol.
        """
        user = self.request.user
        
        # Si es jefe de centro, solo mostrar sus equipos
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        if user.rol_id == rol_jefe_centro_id:
            return Equipo.objects.filter(
                jefe_centro=user,
                is_active=True
            ).select_related('jefe_centro', 'campana').prefetch_related('agentes_detalle')
        
        # Si es admin, mostrar todos
        if user.is_admin():
            return Equipo.objects.filter(
                is_active=True
            ).select_related('jefe_centro', 'campana').prefetch_related('agentes_detalle')
        
        # Otros roles no tienen acceso
        return Equipo.objects.none()
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción."""
        if self.action == 'create':
            return EquipoCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return EquipoUpdateSerializer
        return EquipoSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Criterio 2: Crear equipo.
        Valida que el usuario sea jefe de centro.
        """
        # Verificar que el usuario tenga rol de jefe de centro
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        if request.user.rol_id != rol_jefe_centro_id and not request.user.is_admin():
            return Response({
                'success': False,
                'message': 'Solo los jefes de centro pueden crear equipos'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            equipo = serializer.save()
            return Response({
                'success': True,
                'message': 'El equipo ha sido creado',  # Criterio 3.1.1
                'equipo': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'message': 'Error de validación en los datos proporcionados',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def list(self, request, *args, **kwargs):
        """
        Criterio 1.3: Listar todos los equipos del centro.
        Criterio 5.1: La lista se actualiza automáticamente.
        """
        queryset = self.get_queryset()
        
        # Filtros opcionales
        campana_id = request.query_params.get('campana_id')
        if campana_id:
            queryset = queryset.filter(campana_id=campana_id)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(campana__nombre__icontains=search)
            )
        
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'equipos': serializer.data
        }, status=status.HTTP_200_OK)
    
    def retrieve(self, request, *args, **kwargs):
        """Obtener detalle de un equipo específico."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'equipo': serializer.data
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """Actualizar equipo completo."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Verificar permisos (solo el jefe de centro dueño o admin)
        if instance.jefe_centro != request.user and not request.user.is_admin():
            return Response({
                'success': False,
                'message': 'No tiene permisos para modificar este equipo'
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Equipo actualizado exitosamente',
                'equipo': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'message': 'Error de validación',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def partial_update(self, request, *args, **kwargs):
        """Actualización parcial."""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: marcar equipo como inactivo.
        """
        instance = self.get_object()
        
        # Verificar permisos
        if instance.jefe_centro != request.user and not request.user.is_admin():
            return Response({
                'success': False,
                'message': 'No tiene permisos para eliminar este equipo'
            }, status=status.HTTP_403_FORBIDDEN)
        
        instance.is_active = False
        instance.save()
        
        return Response({
            'success': True,
            'message': f'El equipo "{instance.nombre}" ha sido desactivado'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='agentes-disponibles')
    def agentes_disponibles(self, request):
        """
        Criterio 2.2: Búsqueda de agentes en tiempo real.
        GET /api/campaigns/equipos/agentes-disponibles/?search=juan
        
        Retorna agentes que:
        - Tienen rol AGENTE
        - Están activos
        - NO están en ningún equipo activo (Criterio 4.3)
        - Coinciden con el término de búsqueda (nombre o código)
        """
        search = request.query_params.get('search', '').strip()
        
        # Obtener agentes que ya están en equipos activos
        agentes_en_equipos = EquipoAgenteDetalle.objects.filter(
            equipo_id__is_active=True
        ).values_list('agente_id', flat=True)
        
        # Filtrar agentes disponibles
        rol_agente_id = get_estado_id('ROL_USUARIO', 'AGENTE')
        queryset = User.objects.filter(
            rol_id=rol_agente_id,
            is_active=True
        ).exclude(documento_id__in=agentes_en_equipos)
        
        # Aplicar búsqueda
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(documento_id__icontains=search) |
                Q(email__icontains=search)
            )
        
        # Limitar resultados
        limit = int(request.query_params.get('limit', 20))
        queryset = queryset[:limit]
        
        serializer = AgenteSimpleSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'agentes': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='campanas-activas')
    def campanas_activas(self, request):
        """
        Criterio 2.2: Lista de campañas activas para seleccionar.
        Criterio 4.4: Solo se pueden asignar campañas activas.
        
        GET /api/campaigns/equipos/campanas-activas/
        """
        estado_activo_id = get_estado_id('ESTADO_CAMPANA', 'ACTIVA')
        queryset = Campana.objects.filter(
            estado_id=estado_activo_id
        ).order_by('nombre')
        
        serializer = CampanaSimpleSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),
            'campanas': serializer.data
        }, status=status.HTTP_200_OK)

