from django.shortcuts import render

# Create your views here.
import csv
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Cliente
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.generic import TemplateView

class CargarBaseDatosView(APIView):
    """
    Permite subir un archivo CSV y registrar los clientes en la tabla Cliente.
    """
    
    def post(self, request, *args, **kwargs):
        campaña_id = request.data.get("campaña_id")
        base_datos_id = request.data.get("base_datos_id")
        file = request.FILES.get("file")

        if not file:
            return Response({"error": "Debe subir un archivo CSV"}, status=status.HTTP_400_BAD_REQUEST)
        print("📁 Archivo recibido:", file.name)
        decoded_file = file.read().decode('utf-8').splitlines()
        reader = csv.DictReader(decoded_file)

        clientes_creados = 0
        for row in reader:
            nombre = row.get("nombre") or row.get("Nombre") or ""
            telefono = row.get("telefono") or row.get("Telefono") or ""

            # Guardar todos los demás campos en JSON
            otros = {k: v for k, v in row.items() if k.lower() not in ["nombre", "telefono"]}

            Cliente.objects.create(
                base_datos_id=base_datos_id,
                campaña_id=campaña_id,
                nombre=nombre,
                telefono=telefono,
                otros_datos=otros
            )
            clientes_creados += 1

        return Response(
            {"mensaje": f"Base de datos cargada correctamente. {clientes_creados} clientes registrados."},
            status=status.HTTP_201_CREATED
        )
class SubirBDTemplateView(TemplateView):
    template_name = "campaigns/template.html"
