"""
Script para diagnosticar el error 400 en el endpoint de detalle de equipo
"""
import os
import sys
import django

# Agregar el directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from django.test import RequestFactory
from apps.users.models import User
from apps.kpis.views import KPIViewSet
from rest_framework.test import force_authenticate

# Crear factory
factory = RequestFactory()

# Buscar un jefe de campaña
user = User.objects.filter(rol__valor='JEFE_CAMPANA').first()
if not user:
    print("❌ No hay usuarios con rol JEFE_CAMPANA")
    user = User.objects.filter(rol__valor='ADMIN').first()
    if user:
        print(f"✓ Usando ADMIN: {user.email}")
else:
    print(f"✓ Usuario encontrado: {user.email}")

if not user:
    print("❌ No hay usuarios disponibles")
    exit(1)

# Crear request
request = factory.get(
    '/api/kpis/jefe-campana/equipos/1/detalle/',
    {'fecha_desde': '2025-11-17', 'fecha_hasta': '2025-11-22'}
)
request.user = user
force_authenticate(request, user=user)

# Ejecutar la vista
view = KPIViewSet.as_view({'get': 'equipo_detalle_kpis'})

try:
    response = view(request, equipo_id='1')
    print(f"\n✓ Status Code: {response.status_code}")
    print(f"✓ Response: {response.data}")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
