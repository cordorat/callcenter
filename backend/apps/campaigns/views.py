from django.shortcuts import render
from django.db import models
import csv
import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import api_view, action
from rest_framework.permissions import IsAuthenticated
from .models import Cliente, BaseDatosCargada
from .serializers import BaseDatosCargadaSerializer, ClienteSerializer, ClienteUpdateSerializer
from django.core.paginator import Paginator

class CargarBaseDatosView(APIView):

    def post(self, request, *args, **kwargs):
        campana_id = request.data.get("campana_id")
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "Debe subir un archivo CSV"}, status=status.HTTP_400_BAD_REQUEST)
        base_datos = BaseDatosCargada.objects.create(
            campana_id=campana_id,
            nombre_bd=file.name
        )
        base_datos_id = base_datos.id

        decoded_file = file.read().decode('utf-8').splitlines()
        reader = csv.DictReader(decoded_file)

        clientes_creados = 0
        for row in reader:
            row_normalized = {k.strip().lower(): v for k, v in row.items()}

            nombre_field = next((k for k in row_normalized.keys() if "nombre" in k), None)
            telefono_field = next((k for k in row_normalized.keys() if "tel" in k), None)            
            nombre = row_normalized.get(nombre_field,"" ) 
            telefono = row_normalized.get(telefono_field, "")

            # Guardar todos los demás campos en JSON
            otros = {k: v for k, v in row.items() if k.lower() not in ["nombre", "telefono"]}

            Cliente.objects.create(
                base_datos_id=base_datos_id,
                campana_id=campana_id,
                nombre=nombre,
                telefono=telefono,
                otros_datos=otros
            )
            clientes_creados += 1

        return Response(
            {"mensaje": f"Base de datos cargada correctamente. {clientes_creados} clientes registrados."},
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

