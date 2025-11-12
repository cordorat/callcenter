"""
Script de diagnóstico para el endpoint de KPIs de equipos.
Verifica la estructura de datos y ayuda a identificar por qué no se devuelven equipos.

Ejecutar:
python manage.py shell < scripts/diagnosticar_kpis_equipos.py
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User
from apps.campaigns.models import Campana, Equipo
from common.estados_helper import get_estado

print("\n" + "="*60)
print("DIAGNÓSTICO: KPIs de Equipos - Jefe de Campaña")
print("="*60 + "\n")

# 1. Verificar que existe el rol JEFE_CAMPANA
print("1️⃣  VERIFICANDO ROL JEFE_CAMPANA...")
rol_jefe = get_estado('ROL_USUARIO', 'JEFE_CAMPANA')
if rol_jefe:
    print(f"   ✅ Rol encontrado: {rol_jefe.valor} (ID: {rol_jefe.id})")
else:
    print("   ❌ ERROR: No existe el rol JEFE_CAMPANA en TiposParametros")
    print("   Ejecuta: python manage.py shell < scripts/poblar_tipos_parametros.py")
    sys.exit(1)

# 2. Listar todos los Jefes de Campaña
print("\n2️⃣  LISTANDO JEFES DE CAMPAÑA...")
jefes = User.objects.filter(rol=rol_jefe, is_active=True)
if jefes.exists():
    print(f"   ✅ Encontrados {jefes.count()} jefe(s) de campaña activo(s):")
    for jefe in jefes:
        print(f"      - {jefe.get_full_name()} ({jefe.email}) - ID: {jefe.documento_id}")
else:
    print("   ❌ No hay jefes de campaña registrados")
    print("   Crea uno con: python scripts/create_jefe_campana.py")
    sys.exit(1)

# 3. Verificar estado ACTIVA para campañas
print("\n3️⃣  VERIFICANDO ESTADO 'ACTIVA' PARA CAMPAÑAS...")
estado_activa = get_estado('ESTADO_CAMPANA', 'ACTIVA')
if estado_activa:
    print(f"   ✅ Estado encontrado: {estado_activa.valor} (ID: {estado_activa.id})")
else:
    print("   ❌ ERROR: No existe el estado ACTIVA en TiposParametros")
    sys.exit(1)

# 4. Listar campañas y sus jefes
print("\n4️⃣  LISTANDO CAMPAÑAS...")
campanas = Campana.objects.all().select_related('jefe_campana', 'estado')
if campanas.exists():
    print(f"   ✅ Encontradas {campanas.count()} campaña(s):")
    for campana in campanas:
        jefe_nombre = campana.jefe_campana.get_full_name() if campana.jefe_campana else "Sin jefe"
        estado_nombre = campana.estado.valor if campana.estado else "Sin estado"
        activa = "✅ ACTIVA" if campana.estado == estado_activa else f"⚠️  {estado_nombre}"
        
        print(f"\n      📋 Campaña #{campana.pk}: {campana.nombre}")
        print(f"         Jefe: {jefe_nombre}")
        print(f"         Estado: {activa}")
        print(f"         Fechas: {campana.fecha_inicio} → {campana.fecha_fin or 'Sin fin'}")
        
        # 5. Contar equipos de esta campaña
        equipos_count = Equipo.objects.filter(campana=campana, is_active=True).count()
        print(f"         Equipos activos: {equipos_count}")
        
        if equipos_count > 0:
            equipos = Equipo.objects.filter(campana=campana, is_active=True).select_related('coordinador')
            for equipo in equipos:
                coord_nombre = equipo.coordinador.get_full_name() if equipo.coordinador else "Sin coordinador"
                agentes_count = equipo.agentes_detalle.count()
                print(f"            🔹 {equipo.nombre} (ID: {equipo.equipo_id})")
                print(f"               Coordinador: {coord_nombre}")
                print(f"               Agentes: {agentes_count}")
else:
    print("   ❌ No hay campañas registradas")
    print("   Crea una con: python scripts/crear_campaña.py")

# 6. Resumen y recomendaciones
print("\n" + "="*60)
print("📊 RESUMEN")
print("="*60)

campanas_activas = Campana.objects.filter(estado=estado_activa)
campanas_con_equipos = []

for campana in campanas_activas:
    equipos_count = Equipo.objects.filter(campana=campana, is_active=True).count()
    if equipos_count > 0:
        campanas_con_equipos.append((campana, equipos_count))

if campanas_con_equipos:
    print("\n✅ CAMPAÑAS LISTAS PARA USAR:")
    for campana, equipos_count in campanas_con_equipos:
        jefe_email = campana.jefe_campana.email if campana.jefe_campana else "Sin jefe"
        print(f"   • Campaña #{campana.pk}: {campana.nombre}")
        print(f"     - Jefe: {jefe_email}")
        print(f"     - Equipos: {equipos_count}")
        print(f"     - Comando de prueba:")
        print(f"       GET /api/kpis/jefe-campana/equipos/?campana_id={campana.pk}")
else:
    print("\n⚠️  PROBLEMAS DETECTADOS:")
    if not campanas_activas.exists():
        print("   ❌ No hay campañas en estado ACTIVA")
        print("   Solución: Cambia el estado de una campaña existente o crea una nueva")
    else:
        print("   ❌ Las campañas activas no tienen equipos asignados")
        print("   Solución: Asigna equipos a las campañas con:")
        print("      python scripts/crear_equipo.py")

print("\n" + "="*60)
print("🔗 ENDPOINTS DISPONIBLES:")
print("="*60)
print("   GET /api/kpis/jefe-campana/equipos/")
print("   GET /api/kpis/jefe-campana/equipos/?campana_id=<ID>")
print("   GET /api/kpis/jefe-campana/equipos/<equipo_id>/detalle/")
print("="*60 + "\n")
