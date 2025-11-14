from django.shortcuts import render
from django.db import models
from django.db.models import Q
from django.utils import timezone
import csv
import chardet
import random
import io
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated
from .models import Cliente, BaseDatosCargada, Equipo, EquipoAgenteDetalle, Campana, Producto, ProductoCampanaDetalle
from .serializers import (
    BaseDatosCargadaSerializer, ClienteSerializer, ClienteUpdateSerializer,
    EquipoSerializer, EquipoCreateSerializer, EquipoUpdateSerializer,
    AgenteSimpleSerializer, CampanaSerializer, CampanaCreateSerializer,CampanaListSerializer, JefeCampanaSearchSerializer, ProductoSerializer, CampanaJefeSerializer,
    AsignarCoordinadorSerializer, EquipoConAgentesSerializer, CampanaUpdateSerializer
)
from apps.users.models import User, Centro
from common.estados_helper import get_estado_id, get_estado
from django.core.paginator import Paginator
from apps.users.permissions import IsJefeCentro


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

        # Decodificar con la codificación detectada
        try:
            decoded_file = raw_data.decode(encoding, errors="replace")
        except Exception as e:
            return Response({"error": f"Error al decodificar el archivo: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

        # Leer CSV de forma segura usando StringIO
        csv_file = io.StringIO(decoded_file)
        
        # Detectar el delimitador automáticamente
        sample = csv_file.read(1024)
        csv_file.seek(0)
        
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
            delimiter = dialect.delimiter
        except csv.Error:
            # Si falla la detección, usar coma por defecto
            delimiter = ','
        
        reader = csv.DictReader(csv_file, delimiter=delimiter)
        
        # Leer primera fila para ver los nombres de columnas
        first_row = None
        try:
            first_row = next(reader)
        except StopIteration:
            return Response(
                {"error": "El archivo CSV está vacío o no tiene datos"},
                status=status.HTTP_400_BAD_REQUEST
            )

        clientes_creados = 0
        
        # Procesar la primera fila que ya leímos
        if first_row:
            # Normalizar claves (sin espacios ni mayúsculas)
            row_normalized = {
                (k.strip().lower() if k else ""): (v.strip() if isinstance(v, str) else v)
                for k, v in first_row.items()
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
        
        # Procesar el resto de las filas
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
    """
    Lista bases de datos con filtro opcional por campaña.
    Aplica filtros de seguridad según el rol del usuario:
    - JEFE_CAMPANA: Solo ve bases de sus campañas asignadas
    - JEFE_CENTRO: Ve bases de campañas de sus centros
    - ADMIN: Ve todas las bases
    
    Query params:
    - campana_id: Filtrar bases de datos de una campaña específica
    - page: Número de página (default: 1)
    
    Ejemplo: GET /api/campaigns/listar-bases-datos/?campana_id=1
    """
    user = request.user
    bases = BaseDatosCargada.objects.all()
    
    # Filtro de seguridad por rol
    rol_jefe_campana_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
    rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
    
    if user.rol_id == rol_jefe_campana_id:
        # Jefe de campaña solo ve bases de sus campañas
        campanas_jefe = Campana.objects.filter(jefe_campana=user).values_list('id', flat=True)
        bases = bases.filter(campana_id__in=campanas_jefe)
    
    elif user.rol_id == rol_jefe_centro_id:
        # Jefe de centro ve bases de campañas de sus centros
        centros = Centro.objects.filter(jefe_centro=user)
        campanas_centro = Campana.objects.filter(centro__in=centros).values_list('id', flat=True)
        bases = bases.filter(campana_id__in=campanas_centro)
    
    elif not user.is_admin():
        # Otros roles sin acceso (solo admin puede ver todo)
        return Response({
            "error": "No tiene permisos para listar bases de datos"
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Filtro adicional opcional por campaña específica
    campana_id = request.query_params.get('campana_id')
    if campana_id:
        try:
            campana_id = int(campana_id)
            # Validar que el usuario tenga acceso a esta campaña
            if user.rol_id == rol_jefe_campana_id:
                if not Campana.objects.filter(id=campana_id, jefe_campana=user).exists():
                    return Response({
                        "error": "No tiene permisos para acceder a esta campaña"
                    }, status=status.HTTP_403_FORBIDDEN)
            elif user.rol_id == rol_jefe_centro_id:
                centros = Centro.objects.filter(jefe_centro=user)
                if not Campana.objects.filter(id=campana_id, centro__in=centros).exists():
                    return Response({
                        "error": "No tiene permisos para acceder a esta campaña"
                    }, status=status.HTTP_403_FORBIDDEN)
            
            bases = bases.filter(campana_id=campana_id)
        except (ValueError, TypeError):
            return Response({
                "error": "El parámetro campana_id debe ser un número entero válido"
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Ordenar por fecha de carga descendente (más recientes primero)
    bases = bases.order_by('-fecha_carga')
    
    paginator = Paginator(bases, 20)
    page = request.query_params.get("page", 1)
    page_obj = paginator.get_page(page)
    serializer = BaseDatosCargadaSerializer(page_obj.object_list, many=True)
    
    return Response({
        "count": paginator.count,
        "total_pages": paginator.num_pages,
        "current_page": page_obj.number,
        "page_size": paginator.per_page,
        "results": serializer.data,
        "filtered_by_campana": campana_id is not None
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


@api_view(['DELETE'])
def eliminar_base_datos(request, pk):
    """
    DELETE /api/campaigns/base-datos/<pk>/eliminar/
    
    Elimina una base de datos cargada junto con todos sus registros de clientes asociados.
    Solo usuarios administradores o jefes de campaña pueden eliminar bases.
    """
    try:
        base = BaseDatosCargada.objects.get(pk=pk)
        
        # Verificar permisos: solo admin o jefe de campaña de esa campaña
        user = request.user
        if not user.is_admin():
            # Si es jefe de campaña, verificar que sea de esa campaña
            if hasattr(user, 'jefe_campana'):
                campanas_jefe = user.jefe_campana.campanas.all()
                if base.campana not in campanas_jefe:
                    return Response(
                        {"error": "No tienes permiso para eliminar esta base de datos."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {"error": "No tienes permiso para eliminar bases de datos."},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Contar registros antes de eliminar
        num_registros = Cliente.objects.filter(base_datos_id=pk).count()
        nombre_bd = base.nombre_bd
        
        # Eliminar la base (los registros se eliminan en cascada por FK)
        base.delete()
        
        return Response({
            "success": True,
            "message": f"Base de datos '{nombre_bd}' eliminada correctamente.",
            "registros_eliminados": num_registros
        }, status=status.HTTP_200_OK)
        
    except BaseDatosCargada.DoesNotExist:
        return Response(
            {"error": "Base de datos no encontrada."},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Error al eliminar la base de datos: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
        Filtrar equipos según el rol del usuario:
        - Jefe de Centro: equipos cuyas campañas pertenecen a su centro (relación indirecta)
        - Jefe de Campaña: equipos de sus campañas asignadas
        - Coordinador: equipos asignados directamente
        - Admin: todos los equipos
        - Otros roles: sin acceso
        """
        user = self.request.user
        
        # Si es jefe de centro, mostrar equipos cuyas campañas pertenecen a su centro
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        if user.rol_id == rol_jefe_centro_id:
            # Obtener los centros donde este usuario es jefe
            centros = Centro.objects.filter(jefe_centro=user)
            
            # Filtrar equipos por campañas que pertenecen a esos centros
            # Relación indirecta: Equipo -> Campaña -> Centro
            return Equipo.objects.filter(
                campana__centro__in=centros,
                is_active=True
            ).select_related('campana', 'coordinador').prefetch_related('agentes_detalle')
        
        # Si es jefe de campaña, mostrar equipos de sus campañas
        rol_jefe_campana_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
        if user.rol_id == rol_jefe_campana_id:
            # Filtrar equipos por campañas donde es jefe
            return Equipo.objects.filter(
                campana__jefe_campana=user,
                is_active=True
            ).select_related('campana', 'coordinador').prefetch_related('agentes_detalle')
        
        # Si es coordinador, mostrar sus equipos asignados
        rol_coordinador_id = get_estado_id('ROL_USUARIO', 'COORDINADOR')
        if user.rol_id == rol_coordinador_id:
            return Equipo.objects.filter(
                coordinador=user,
                is_active=True
            ).select_related('campana', 'coordinador').prefetch_related('agentes_detalle')
        
        # Si es admin, mostrar todos
        if user.is_admin():
            return Equipo.objects.filter(
                is_active=True
            ).select_related('campana', 'coordinador').prefetch_related('agentes_detalle')
        
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
        Soporta paginación y filtrado por coordinador.
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
        
        # Paginación
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        
        total_count = queryset.count()
        paginator = Paginator(queryset, page_size)
        
        try:
            paginated_queryset = paginator.page(page)
        except:
            paginated_queryset = paginator.page(1)
        
        serializer = self.get_serializer(paginated_queryset, many=True)
        
        return Response({
            'success': True,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages,
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
        """
        Actualizar equipo completo.
        Verifica permisos usando relación indirecta: Equipo -> Campaña -> Centro
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Verificar permisos: admin o jefe del centro de la campaña del equipo
        tiene_permiso = request.user.is_admin()
        
        if not tiene_permiso and instance.campana and instance.campana.centro:
            # Verificar si el usuario es jefe del centro de la campaña
            rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
            if request.user.rol_id == rol_jefe_centro_id:
                tiene_permiso = instance.campana.centro.jefe_centro == request.user
        
        if not tiene_permiso:
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
        Verifica permisos usando relación indirecta: Equipo -> Campaña -> Centro
        """
        instance = self.get_object()
        
        # Verificar permisos: admin o jefe del centro de la campaña del equipo
        tiene_permiso = request.user.is_admin()
        
        if not tiene_permiso and instance.campana and instance.campana.centro:
            # Verificar si el usuario es jefe del centro de la campaña
            rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
            if request.user.rol_id == rol_jefe_centro_id:
                tiene_permiso = instance.campana.centro.jefe_centro == request.user
        
        if not tiene_permiso:
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
    
    
    @action(detail=False, methods=['get'], url_path='coordinadores-disponibles')
    def coordinadores_disponibles(self, request):
        """
        Obtiene lista de usuarios con rol COORDINADOR activos.
        
        GET /api/campaigns/equipos/coordinadores-disponibles/
        
        Retorna:
        - Lista de coordinadores disponibles
        """
        rol_coordinador_id = get_estado_id('ROL_USUARIO', 'COORDINADOR')
        
        # Obtener coordinadores activos
        coordinadores = User.objects.filter(
            rol_id=rol_coordinador_id,
            is_active=True
        ).order_by('first_name', 'last_name')
        
        # Serializar datos
        coordinadores_data = [{
            'documento_id': coord.documento_id,
            'full_name': coord.full_name,
            'email': coord.email,
            'phone': coord.phone
        } for coord in coordinadores]
        
        return Response({
            'success': True,
            'count': len(coordinadores_data),
            'coordinadores': coordinadores_data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='mi-centro')
    def mi_centro(self, request):
        """
        Obtiene información del centro del jefe de centro autenticado.
        Usa relación indirecta: muestra equipos cuyas campañas pertenecen a su centro.
        
        GET /api/campaigns/equipos/mi-centro/
        
        Retorna:
        - Información del centro
        - Cantidad de equipos (filtrados por campañas del centro)
        - Lista de equipos activos
        """
        user = request.user
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        
        # Verificar que sea jefe de centro
        if user.rol_id != rol_jefe_centro_id:
            return Response({
                'success': False,
                'message': 'Solo los jefes de centro pueden acceder a esta información'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener centro(s) del jefe
        centros = Centro.objects.filter(jefe_centro=user)
        
        if not centros.exists():
            return Response({
                'success': False,
                'message': 'No tiene un centro asignado'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Tomar el primer centro (asumiendo que un jefe maneja un centro)
        centro = centros.first()
        
        # Obtener equipos usando relación indirecta: Equipo -> Campaña -> Centro
        equipos = Equipo.objects.filter(
            campana__centro=centro,
            is_active=True
        ).select_related('campana', 'coordinador').prefetch_related('agentes_detalle')
        
        # Serializar equipos
        equipos_data = EquipoSerializer(equipos, many=True).data
        
        return Response({
            'success': True,
            'centro': {
                'centro_id': centro.pk,
                'nombre': centro.nombre,
                'direccion': centro.direccion,
                'jefe_nombre': centro.jefe_centro.full_name if centro.jefe_centro else None
            },
            'total_equipos': equipos.count(),
            'equipos': equipos_data,
            'nota': 'Los equipos se filtran por campañas que pertenecen a este centro'
        }, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['get'], url_path='jefe-campana/mis-campanas')
    def mis_campanas_jefe(self, request):
        """
        Endpoint para que el Jefe de Campaña obtenga sus campañas con equipos y agentes.
        
        GET /api/campaigns/equipos/jefe-campana/mis-campanas/
        
        Criterios:
        - 1.1: El jefe debe estar autenticado
        - 2.1: Mostrar lista de campañas asignadas al jefe
        - 2.3: Cada campaña muestra sus equipos
        - 2.3: Cada equipo muestra sus agentes
        
        Returns:
            {
                "success": true,
                "campanas": [...]
            }
        """
        user = request.user
        
        # Verificar que el usuario sea jefe de campaña
        rol_jefe_campana_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
        if user.rol_id != rol_jefe_campana_id and not user.is_admin():
            return Response({
                'success': False,
                'message': 'Solo los jefes de campaña pueden acceder a esta información'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Obtener campañas del jefe autenticado
        campanas = Campana.objects.filter(
            jefe_campana=user
        ).select_related('centro', 'estado').prefetch_related('equipos')
        
        if not campanas.exists():
            return Response({
                'success': True,
                'message': 'No tiene campañas asignadas',
                'campanas': []
            }, status=status.HTTP_200_OK)
        
        # Serializar campañas con equipos y agentes
        serializer = CampanaJefeSerializer(campanas, many=True)
        
        return Response({
            'success': True,
            'count': campanas.count(),
            'campanas': serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='asignar-coordinador')
    def asignar_coordinador(self, request, pk=None):
        """
        Endpoint para asignar (o cambiar) el coordinador de un equipo.
        
        POST /api/campaigns/equipos/{equipo_id}/asignar-coordinador/
        Body: { "agente_id": "123456789" }
        
        Criterios:
        - 3.1: Si ya hay coordinador, debe retornar su información
        - 3.2: Si no hay coordinador, asignar directamente
        - Cambiar rol del agente a COORDINADOR
        - Si había un coordinador anterior, cambiar su rol a AGENTE
        
        Returns:
            {
                "success": true,
                "coordinador_anterior": {...} | null,
                "nuevo_coordinador": {...},
                "requiere_confirmacion": true | false,
                "message": "..."
            }
        """
        equipo = self.get_object()
        
        # Verificar que el usuario sea jefe de campaña y tenga permiso sobre esta campaña
        user = request.user
        rol_jefe_campana_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
        
        # Solo el jefe de la campaña del equipo puede asignar coordinador
        if user.rol_id == rol_jefe_campana_id:
            if equipo.campana.jefe_campana != user:
                return Response({
                    'success': False,
                    'message': 'No tiene permisos sobre esta campaña'
                }, status=status.HTTP_403_FORBIDDEN)
        elif not user.is_admin():
            return Response({
                'success': False,
                'message': 'Solo los jefes de campaña pueden asignar coordinadores'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validar datos de entrada
        serializer = AsignarCoordinadorSerializer(
            data=request.data,
            context={'equipo': equipo}
        )
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Error de validación',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Obtener el agente a asignar
        agente = serializer.agente
        
        # Verificar si ya existe un coordinador
        coordinador_anterior = equipo.coordinador
        coordinador_anterior_info = None
        requiere_confirmacion = False
        
        if coordinador_anterior:
            requiere_confirmacion = True
            coordinador_anterior_info = {
                'documento_id': coordinador_anterior.documento_id,
                'full_name': coordinador_anterior.full_name,
                'email': coordinador_anterior.email
            }
            
            # Criterio 3.1: Si ya hay coordinador, retornar info para confirmación
            # El frontend debe enviar un parámetro 'confirmar=true' para proceder
            confirmar = request.data.get('confirmar', False)
            
            if not confirmar:
                return Response({
                    'success': True,
                    'requiere_confirmacion': True,
                    'coordinador_anterior': coordinador_anterior_info,
                    'nuevo_coordinador': {
                        'documento_id': agente.documento_id,
                        'full_name': agente.full_name,
                        'email': agente.email
                    },
                    'message': f'Ya existe un coordinador en este equipo ({coordinador_anterior.full_name}), ¿desea reemplazarlo?'
                }, status=status.HTTP_200_OK)
        
        # Proceder con el cambio de coordinador
        
        # 1. Si había coordinador anterior, cambiar su rol a AGENTE
        if coordinador_anterior:
            rol_agente = get_estado('ROL_USUARIO', 'AGENTE')
            coordinador_anterior.rol = rol_agente
            coordinador_anterior.save()
        
        # 2. Cambiar rol del nuevo agente a COORDINADOR
        rol_coordinador = get_estado('ROL_USUARIO', 'COORDINADOR')
        agente.rol = rol_coordinador
        agente.save()
        
        # 3. Actualizar el campo coordinador del equipo
        equipo.coordinador = agente
        equipo.save()
        
        # Preparar respuesta
        return Response({
            'success': True,
            'requiere_confirmacion': False,
            'coordinador_anterior': coordinador_anterior_info,
            'nuevo_coordinador': {
                'documento_id': agente.documento_id,
                'full_name': agente.full_name,
                'email': agente.email,
                'rol_nombre': 'COORDINADOR'
            },
            'message': f'{agente.full_name} ha sido asignado como coordinador del equipo "{equipo.nombre}"'
        }, status=status.HTTP_200_OK)

class ProductoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de productos.
    
    Endpoints:
    - GET    /api/campaigns/productos/           → Listar productos activos
    - GET    /api/campaigns/productos/?campaña=X → Productos de una campaña
    - POST   /api/campaigns/productos/           → Crear producto (Jefe Centro/Admin)
    - GET    /api/campaigns/productos/{id}/      → Detalle de producto
    - PUT    /api/campaigns/productos/{id}/      → Actualizar producto
    - PATCH  /api/campaigns/productos/{id}/      → Actualizar parcialmente
    - DELETE /api/campaigns/productos/{id}/      → Desactivar producto
    """
    
    serializer_class = ProductoSerializer
    # Definir queryset base explícitamente
    queryset = Producto.objects.all()
    # Todos los endpoints requieren autenticación
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filtra productos según los parámetros de consulta.
        
        Query params:
        - campaña: ID de campaña para filtrar productos asociados
        - activo: true/false para filtrar por estado (por defecto: true)
        
        Returns:
            QuerySet filtrado
        """
        queryset = Producto.objects.all()
        
        # Por defecto, mostrar solo productos activos
        # A menos que explícitamente se pida mostrar inactivos
        mostrar_inactivos = self.request.query_params.get('mostrar_inactivos', 'false').lower() == 'true'
        
        if not mostrar_inactivos:
            queryset = queryset.filter(activo=True)
        
        # Filtrar por campaña específica si se proporciona
        campana_id = self.request.query_params.get('campaña')
        if campana_id:
            # Usar la tabla intermedia ProductoCampanaDetalle
            queryset = queryset.filter(
                campanas_detalle__campana_id=campana_id
            ).distinct()  # distinct() evita duplicados en caso de múltiples relaciones
        
        return queryset.order_by('nombre')  # Ordenar alfabéticamente
    
    def create(self, request, *args, **kwargs):
        """
        Crear un nuevo producto.
        
        Criterio: Solo Jefes de Centro y Administradores pueden crear productos.
        
        Body JSON:
        {
            "nombre": "Producto X",
            "descripcion": "Descripción opcional",
            "precio": 100.50,
            "activo": true
        }
        """
        # Obtener los IDs de los roles permitidos usando el helper
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')

        # Validación de autenticación y rol
        if not request.user or not request.user.rol:
            return Response({
                'success': False,
                'message': 'Usuario no autenticado o sin rol asignado.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Validar que el usuario tenga uno de los roles permitidos
        # Comparar con parametros_id (PK de TiposParametros)
        if request.user.rol.parametros_id not in [rol_jefe_centro_id, rol_admin_id]:
            return Response({
                'success': False,
                'message': 'Solo los jefes de centro o administradores pueden crear productos.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Serializar y validar los datos
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Guardar el producto en la base de datos
            serializer.save()
            
            return Response({
                'success': True,
                'message': 'El producto ha sido creado correctamente.',
                'producto': serializer.data
            }, status=status.HTTP_201_CREATED)

        # Si la validación falla, retornar errores específicos
        return Response({
            'success': False,
            'message': 'Error de validación en los datos proporcionados.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        """
        Listar productos con filtros opcionales.
        
        Query params:
        - campaña: Filtrar productos de una campaña específica
        - mostrar_inactivos: true para incluir productos inactivos
        - search: Búsqueda por nombre (opcional, para futura implementación)
        
        Returns:
            Lista de productos con formato de respuesta exitoso
        """
        # get_queryset() ya aplica los filtros necesarios
        queryset = self.get_queryset()
        
        # Serializar el queryset completo
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'count': queryset.count(),  # Número total de resultados
            'productos': serializer.data
        }, status=status.HTTP_200_OK)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtener detalle de un producto específico.
        
        GET /api/campaigns/productos/{id}/
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'producto': serializer.data
        }, status=status.HTTP_200_OK)
    
    def update(self, request, *args, **kwargs):
        """
        Actualizar un producto (PUT completo o PATCH parcial).
        Solo Jefes de Centro y Admins pueden actualizar.
        """
        # Validar permisos (mismo que en create)
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')

        if request.user.rol.parametros_id not in [rol_jefe_centro_id, rol_admin_id]:
            return Response({
                'success': False,
                'message': 'Solo los jefes de centro o administradores pueden actualizar productos.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'El producto ha sido actualizado correctamente.',
                'producto': serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response({
            'success': False,
            'message': 'Error de validación en los datos proporcionados.',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def partial_update(self, request, *args, **kwargs):
        """
        Actualización parcial (PATCH).
        """
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft delete: Desactivar producto en lugar de eliminarlo.
        Solo Jefes de Centro y Admins pueden desactivar.
        """
        # Validar permisos
        rol_jefe_centro_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        rol_admin_id = get_estado_id('ROL_USUARIO', 'ADMIN')

        if request.user.rol.parametros_id not in [rol_jefe_centro_id, rol_admin_id]:
            return Response({
                'success': False,
                'message': 'Solo los jefes de centro o administradores pueden desactivar productos.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        instance = self.get_object()
        
        # Soft delete: marcar como inactivo en lugar de borrar
        instance.activo = False
        instance.save()
        
        return Response({
            'success': True,
            'message': f'El producto "{instance.nombre}" ha sido desactivado correctamente.'
        }, status=status.HTTP_200_OK)

class CampanaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de campañas.
    
    Endpoints generados automáticamente:
    - GET    /api/campaigns/            → Listar campañas
    - POST   /api/campaigns/            → Crear campaña
    - GET    /api/campaigns/{id}/       → Detalle de campaña
    - PUT    /api/campaigns/{id}/       → Actualizar campaña completa
    - PATCH  /api/campaigns/{id}/       → Actualizar parcialmente
    - DELETE /api/campaigns/{id}/       → Eliminar campaña
    
    Endpoints personalizados (actions):
    - GET    /api/campaigns/buscar_jefes/?q=texto  → Buscar jefes de campaña
    """
    
    queryset = Campana.objects.all()
    permission_classes = [IsAuthenticated, IsJefeCentro]
    
    def get_permissions(self):
        """
        Permisos personalizados según la acción.
        - actualizar_objetivo_ventas: Solo requiere autenticación (la validación se hace en el método)
        - Resto de acciones: Requiere IsJefeCentro
        """
        if self.action == 'actualizar_objetivo_ventas':
            # Solo autenticación requerida, el permiso específico se valida en el método
            return [IsAuthenticated()]
        return super().get_permissions()
    
    def get_serializer_class(self):
        """
        Retorna el serializer apropiado según la acción.
        Este método es llamado automáticamente por DRF.
        
        Returns:
            Clase de serializer a usar
        """
        if self.action == 'list':
            # Para listados, usar versión simplificada
            return CampanaListSerializer
        elif self.action == 'create':
            # Para crear, usar versión con validaciones
            return CampanaCreateSerializer
        elif self.action in ['update', 'partial_update']:
            # Para actualizar, usar serializer de actualización
            return CampanaUpdateSerializer
        # Para retrieve (detalle)
        return CampanaSerializer
    
    def get_queryset(self):
        """
        Filtra las campañas según el rol del usuario.
        - Admin: Ve todas las campañas
        - Jefe de Centro: Solo campañas de sus centros a cargo
        - Jefe de Campaña: Solo sus campañas asignadas
        
        Returns:
            QuerySet filtrado
        """
        user = self.request.user
        
        # Admin ve todo
        admin_role_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        if user.rol_id == admin_role_id:
            return Campana.objects.all()
        
        # Jefe de Centro solo ve campañas de sus centros a cargo
        # La relación es: Centro.jefe_centro = User
        # Entonces User.centros_a_cargo = todos los centros donde es jefe
        jefe_centro_role_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        if user.rol_id == jefe_centro_role_id:
            # Obtener los centros donde este usuario es jefe
            centros = Centro.objects.filter(jefe_centro=user)
            # Filtrar campañas que pertenecen a esos centros
            return Campana.objects.filter(centro__in=centros)
        
        # Jefe de Campaña solo ve sus campañas asignadas
        jefe_campana_role_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
        if user.rol_id == jefe_campana_role_id:
            return Campana.objects.filter(jefe_campana=user)
        
        # Otros roles no tienen acceso a campañas
        return Campana.objects.none()
    
    def perform_create(self, serializer):
        """
        Hook llamado al crear una campaña.
        Automáticamente asigna el centro del usuario autenticado.
        
        Args:
            serializer: Instancia de CampanaCreateSerializer
        """
        # El centro ya se asigna en el serializer.validate()
        # Aquí podríamos agregar lógica adicional si fuera necesario
        serializer.save()
    
    def create(self, request, *args, **kwargs):
        """
        Override del método create para personalizar la respuesta.
        Retorna el mensaje de éxito según criterio 3.2.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Respuesta personalizada según criterio 3.2
        return Response(
            {
                'message': 'Campaña agregada exitosamente',
                'data': CampanaSerializer(serializer.instance).data
            },
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """
        Override del método update para personalizar la respuesta.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Respuesta personalizada
        return Response(
            {
                'message': 'Campaña editada exitosamente',
                'data': CampanaSerializer(serializer.instance).data
            },
            status=status.HTTP_200_OK
        )
    
    def perform_update(self, serializer):
        """Hook llamado al actualizar una campaña."""
        serializer.save()
    
    def check_object_permissions(self, request, obj):
        """
        Verifica que el Jefe de Centro solo pueda editar campañas de su centro.
        """
        super().check_object_permissions(request, obj)
        
        # Admin puede editar todo
        admin_role_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        if request.user.rol_id == admin_role_id:
            return
        
        # Jefe de Centro solo puede editar campañas de sus centros
        jefe_centro_role_id = get_estado_id('ROL_USUARIO', 'JEFE_CENTRO')
        if request.user.rol_id == jefe_centro_role_id:
            centros_usuario = Centro.objects.filter(jefe_centro=request.user)
            if obj.centro not in centros_usuario:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    'No tiene permisos para editar campañas de otros centros'
                )
    
    @action(detail=False, methods=['get'], url_path='buscar-jefes')
    def buscar_jefes(self, request):
        """
        Endpoint personalizado para búsqueda de jefes de campaña.
        Criterio 2.1.1: Campo de búsqueda en tiempo real por nombre o código.
        
        URL: GET /api/campaigns/buscar-jefes/?q=texto
        
        Query params:
            q: Texto a buscar (nombre o código)
            
        Returns:
            Lista de jefes que coinciden con la búsqueda
        """
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response(
                {'detail': 'Debe proporcionar un término de búsqueda'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el ID del rol JEFE_CAMPANA
        jefe_campana_role_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
        
        # Buscar usuarios con rol JEFE_CAMPANA que estén activos
        # Q objects permiten OR en queries de Django
        jefes = User.objects.filter(
            rol_id=jefe_campana_role_id,
            is_active=True
        ).filter(
            Q(first_name__icontains=query) |  # Búsqueda por nombre
            Q(last_name__icontains=query) |   # Búsqueda por apellido
            Q(documento_id__icontains=query)  # Búsqueda por código
        )[:10]  # Limitar a 10 resultados (performance)
        
        serializer = JefeCampanaSearchSerializer(jefes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'], url_path='actualizar-objetivo')
    def actualizar_objetivo_ventas(self, request, pk=None):
        """
        Endpoint para actualizar solo el objetivo de ventas de una campaña.
        Solo el jefe de la campaña o un admin pueden actualizar.
        
        URL: PATCH /api/campaigns/{id}/actualizar-objetivo/
        
        Body:
            {
                "objetivo_ventas": 100
            }
            
        Returns:
            {
                "success": true,
                "message": "Objetivo de ventas actualizado correctamente",
                "objetivo_ventas": 100
            }
        """
        campana = self.get_object()
        user = request.user
        
        # Verificar permisos: solo el jefe de campaña o admin
        admin_role_id = get_estado_id('ROL_USUARIO', 'ADMIN')
        if campana.jefe_campana != user and user.rol_id != admin_role_id:
            return Response({
                'success': False,
                'message': 'No tienes permiso para actualizar esta campaña'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validar que se envió objetivo_ventas
        objetivo_ventas = request.data.get('objetivo_ventas')
        
        if objetivo_ventas is None:
            return Response({
                'success': False,
                'message': 'Debe proporcionar el campo objetivo_ventas'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validar que sea un número entero positivo
        try:
            objetivo_ventas = int(objetivo_ventas)
            if objetivo_ventas < 0:
                raise ValueError('Debe ser positivo')
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'message': 'El objetivo de ventas debe ser un número entero positivo'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Actualizar
        campana.objetivo_ventas = objetivo_ventas
        campana.save()
        
        return Response({
            'success': True,
            'message': 'Objetivo de ventas actualizado correctamente',
            'objetivo_ventas': campana.objetivo_ventas
        }, status=status.HTTP_200_OK)


class BaseDatosCargadaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gestión de bases de datos cargadas.
    Solo lectura - las bases de datos se crean mediante CargarBaseDatosView.
    
    list: Listar todas las bases de datos
    retrieve: Obtener una base de datos específica
    por_campana: Listar bases de datos de una campaña específica
    """
    queryset = BaseDatosCargada.objects.all()
    serializer_class = BaseDatosCargadaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Filtra bases de datos según el rol del usuario.
        - Admin: ve todas las bases
        - Jefe de Campaña: solo ve bases de sus campañas
        - Otros roles: sin acceso
        """
        user = self.request.user
        
        if user.is_admin():
            return BaseDatosCargada.objects.all().select_related('campana').order_by('-fecha_carga')
        elif user.is_jefe_campana():
            # Jefe de campaña solo ve bases de sus campañas
            return BaseDatosCargada.objects.filter(
                campana__jefe_campana=user
            ).select_related('campana').order_by('-fecha_carga')
        else:
            # Otros roles no tienen acceso
            return BaseDatosCargada.objects.none()
    
    @action(detail=False, methods=['get'], url_path='por-campana')
    def por_campana(self, request):
        """
        Lista las bases de datos de una campaña específica.
        
        URL: GET /api/campaigns/bases-datos/por-campana/?campana_id={id}
        
        Query Parameters:
        - campana_id: ID de la campaña (requerido)
        
        Response:
        {
            "count": 3,
            "campana": {
                "id": 5,
                "nombre": "Campaña Navidad"
            },
            "bases_datos": [
                {
                    "id": 1,
                    "nombre_bd": "Base Clientes Q4 2025",
                    "fecha_carga": "2025-11-01T10:00:00Z",
                    "iteracion_activa": false,
                    "fecha_hora_inicio_iteracion": null,
                    "total_clientes": 150
                },
                ...
            ]
        }
        """
        campana_id = request.query_params.get('campana_id')
        if not campana_id:
            return Response(
                {'error': 'El parámetro campana_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            campana_id = int(campana_id)
        except ValueError:
            return Response(
                {'error': 'El parámetro campana_id debe ser un número entero'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener la campaña
        try:
            campana = Campana.objects.get(id=campana_id)
        except Campana.DoesNotExist:
            return Response(
                {'error': 'Campaña no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar permisos: Jefe de Campaña solo puede ver sus campañas
        user = request.user
        if not user.is_admin():
            if user.is_jefe_campana():
                if campana.jefe_campana != user:
                    return Response(
                        {'error': 'No tiene permisos para ver bases de datos de esta campaña'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # Otros roles no tienen acceso
                return Response(
                    {'error': 'No tiene permisos para ver bases de datos'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Filtrar bases de datos por campaña
        bases_datos = BaseDatosCargada.objects.filter(
            campana_id=campana_id
        ).order_by('-fecha_carga')
        
        # Preparar respuesta con información de cada base
        bases_datos_list = []
        for base in bases_datos:
            # Contar clientes de esta base
            total_clientes = base.clientes.count()
            
            bases_datos_list.append({
                'id': base.id,
                'nombre_bd': base.nombre_bd,
                'fecha_carga': base.fecha_carga,
                'iteracion_activa': base.iteracion_activa,
                'fecha_hora_inicio_iteracion': base.fecha_hora_inicio_iteracion,
                'total_clientes': total_clientes
            })
        
        return Response({
            'count': len(bases_datos_list),
            'campana': {
                'id': campana.id,
                'nombre': campana.nombre
            },
            'bases_datos': bases_datos_list
        })