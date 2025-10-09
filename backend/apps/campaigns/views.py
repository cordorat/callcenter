from django.shortcuts import render

import csv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Cliente, BaseDatosCargada
from rest_framework.decorators import api_view
from .serializers import BaseDatosCargadaSerializer, ClienteSerializer
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

