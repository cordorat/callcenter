from django.shortcuts import render

# Create your views here.
import csv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Cliente, BaseDatosCargada
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.generic import TemplateView
from .serializers import BaseDatosCargadaSerializer
class CargarBaseDatosView(APIView):
    """
    Permite subir un archivo CSV y registrar los clientes en la tabla Cliente.
    """
    
    def post(self, request, *args, **kwargs):
        campana_id = request.data.get("campana_id")
        file = request.FILES.get("file")
        base_datos = BaseDatosCargada.objects.create(
            campana_id=campana_id,
            nombre_bd=file.name
        )
        base_datos_id = base_datos.id
        if not file:
            return Response({"error": "Debe subir un archivo CSV"}, status=status.HTTP_400_BAD_REQUEST)
        print("📁 Archivo recibido:", file.name)
        decoded_file = file.read().decode('utf-8').splitlines()
        reader = csv.DictReader(decoded_file)
        print("📋 Encabezados CSV:", reader.fieldnames)

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
    serializer = BaseDatosCargadaSerializer(bases, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
@api_view(['GET'])
def detalle_base_datos(request, pk):
    try:
        base = BaseDatosCargada.objects.get(pk=pk)
    except BaseDatosCargada.DoesNotExist:
        return Response({"error": "Base de datos no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    serializer = BaseDatosCargadaSerializer(base)
    return Response(serializer.data)
class SubirBDTemplateView(TemplateView):
    template_name = "campaigns/template.html"
