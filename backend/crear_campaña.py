"""
Script para crear una campaña de prueba sin validaciones.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.campaigns.models import Campana
from apps.users.models import TiposParametros, User, Centro
from datetime import date, timedelta
from django.db import connection
from common.estados_helper import get_estado_id

def reset_sequence():
    """Resetea la secuencia del ID de la tabla campana en PostgreSQL."""
    with connection.cursor() as cursor:
        # Obtener el máximo ID actual
        cursor.execute("SELECT MAX(id) FROM campana")
        max_id = cursor.fetchone()[0]
        
        if max_id is None:
            max_id = 0
        
        # Resetear la secuencia al siguiente valor disponible
        next_id = max_id + 1
        cursor.execute(f"ALTER SEQUENCE campana_id_seq RESTART WITH {next_id}")
        print(f"🔧 Secuencia de campana reseteada. Próximo ID: {next_id}")

def check_and_create_campaign():
    """Crea una nueva campaña de prueba sin validar si ya existe otra activa."""
    
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
    
    # Obtener un jefe de campaña (rol JEFE_CAMPANA)
    rol_jefe_campana_id = get_estado_id('ROL_USUARIO', 'JEFE_CAMPANA')
    jefe_campana = User.objects.filter(rol_id=rol_jefe_campana_id, is_active=True).first()
    
    if not jefe_campana:
        print("⚠️  No se encontró un usuario con rol JEFE_CAMPANA activo.")
        print("   Se creará la campaña sin jefe de campaña asignado.")
        jefe_campana = None
    else:
        print(f"👤 Jefe de campaña asignado: {jefe_campana.full_name}")
    
    # Obtener un centro (sin filtro is_active porque el modelo no lo tiene)
    centro = Centro.objects.first()
    
    if not centro:
        print("⚠️  No se encontró ningún centro en la base de datos.")
        print("   Se creará la campaña sin centro asignado.")
        centro = None
    else:
        print(f"🏢 Centro asignado: {centro.nombre}")
    
    # Resetear la secuencia antes de crear
    reset_sequence()
    
    # Contar campañas existentes para generar nombre único
    total_campanas = Campana.objects.count()
    numero_campana = total_campanas + 1
    
    # Objetivos por defecto
    objetivo_llamadas = 100 * numero_campana  # Incrementa con cada campaña
    objetivo_ventas = 30 * numero_campana
    
    # Crear campaña de prueba
    print(f"🔨 Creando nueva campaña de prueba #{numero_campana}...")
    
    campana = Campana.objects.create(
        nombre=f'Campaña de Prueba {numero_campana}',
        descripcion=f'Campaña creada automáticamente para pruebas - {date.today()}',
        fecha_inicio=date.today(),
        fecha_fin=date.today() + timedelta(days=30),
        estado=estado_activa,
        jefe_campana=jefe_campana,
        centro=centro,
        objetivo_llamadas=objetivo_llamadas,
        objetivo_ventas=objetivo_ventas
    )
    
    print(f"✅ Campaña creada exitosamente:")
    print(f"   ID: {campana.id}")
    print(f"   Nombre: {campana.nombre}")
    print(f"   Estado: {campana.estado.valor}")
    print(f"   Jefe de Campaña: {campana.jefe_campana.full_name if campana.jefe_campana else 'Sin asignar'}")
    print(f"   Centro: {campana.centro.nombre if campana.centro else 'Sin asignar'}")
    print(f"   Objetivo Llamadas: {campana.objetivo_llamadas}")
    print(f"   Objetivo Ventas: {campana.objetivo_ventas}")
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