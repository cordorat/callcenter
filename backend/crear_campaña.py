"""
Script para verificar y crear una campaña de prueba si no existe.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.campaigns.models import Campana
from apps.users.models import TiposParametros

def check_and_create_campaign():
    """Verifica si existe una campaña activa y crea una si no."""
    
    # Obtener el estado "Activa" de TiposParametros
    try:
        estado_activa = TiposParametros.objects.get(
            nombre='ESTADO_CAMPANA',
            valor='ACTIVA'
        )
    except TiposParametros.DoesNotExist:
        print("❌ Error: No se encontró el estado 'Activa' en TiposParametros.")
        print("   Asegúrate de que la tabla tipos_parametros esté poblada.")
        return None
    
    # Verificar si ya existe una campaña activa
    campana_activa = Campana.objects.filter(estado=estado_activa).first()
    
    if campana_activa:
        print(f"✅ Ya existe una campaña activa:")
        print(f"   ID: {campana_activa.id}")
        print(f"   Nombre: {campana_activa.nombre}")
        print(f"   Estado: {campana_activa.estado.valor}")
        print(f"   Fecha inicio: {campana_activa.fecha_inicio}")
        print(f"   Fecha fin: {campana_activa.fecha_fin or 'Sin fecha fin'}")
        return campana_activa
    
    # Crear campaña de prueba
    print("⚠️  No se encontró ninguna campaña activa. Creando campaña de prueba...")
    
    from datetime import date, timedelta
    
    campana = Campana.objects.create(
        nombre='Campaña de Prueba Twilio',
        descripcion='Campaña creada automáticamente para pruebas de integración con Twilio',
        fecha_inicio=date.today(),
        fecha_fin=date.today() + timedelta(days=30),
        estado=estado_activa
    )
    
    print(f"✅ Campaña creada exitosamente:")
    print(f"   ID: {campana.id}")
    print(f"   Nombre: {campana.nombre}")
    print(f"   Estado: {campana.estado.valor}")
    print(f"   Fecha inicio: {campana.fecha_inicio}")
    print(f"   Fecha fin: {campana.fecha_fin}")
    
    return campana

if __name__ == '__main__':
    try:
        check_and_create_campaign()
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()