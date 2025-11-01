"""
Script para crear una venta de prueba.
Ejecutar con: python create_venta.py
"""
import os
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User
from apps.campaigns.models import Cliente, Campana, BaseDatosCargada, Producto
from apps.calls.models import Venta, Llamada
from common.estados_helper import get_estado, get_estado_id

def create_venta():
    """Crea una venta completa con todos los datos necesarios."""
    
    print("=" * 70)
    print("CREANDO VENTA DE PRUEBA")
    print("=" * 70)
    
    # 1. Buscar el agente con documento_id = "3456"
    try:
        agente = User.objects.get(documento_id="10101010")
        print(f"✅ Agente encontrado: {agente.get_full_name()} ({agente.email})")
    except User.DoesNotExist:
        print("❌ Error: No se encontró un agente con documento_id='10101010'")
        print("   Por favor, crea primero un agente con ese documento_id")
        return
    
    # 2. Buscar o crear una campaña activa
    estado_campana_activa = get_estado('ESTADO_CAMPANA', 'ACTIVA')
    campana = Campana.objects.filter(estado=estado_campana_activa).first()
    
    if not campana:
        print("⚠️  No hay campañas activas, creando una...")
        # Buscar un jefe de campaña o usar el agente
        jefe_campana = User.objects.filter(
            rol__valor='JEFE_CAMPANA'
        ).first() or agente
        
        # Buscar un centro
        from apps.users.models import Centro
        centro = Centro.objects.first()
        
        campana = Campana.objects.create(
            jefe_campana=jefe_campana,
            centro=centro,
            nombre="Campaña de Prueba - Ventas",
            descripcion="Campaña creada automáticamente para pruebas de ventas",
            fecha_inicio=timezone.now().date(),
            fecha_fin=(timezone.now() + timedelta(days=30)).date(),
            estado=estado_campana_activa,
            objetivo_llamadas=100,
            objetivo_ventas=50
        )
        print(f"✅ Campaña creada: {campana.nombre}")
    else:
        print(f"✅ Campaña encontrada: {campana.nombre}")
    
    # 3. Crear o buscar una base de datos cargada
    base_datos = BaseDatosCargada.objects.filter(campana=campana).first()
    if not base_datos:
        base_datos = BaseDatosCargada.objects.create(
            campana=campana,
            nombre_bd="Base de Datos de Prueba",
            iteracion_activa=True,
            fecha_hora_inicio_iteracion=timezone.now()
        )
        print(f"✅ Base de datos creada: {base_datos.nombre_bd}")
    else:
        print(f"✅ Base de datos encontrada: {base_datos.nombre_bd}")
    
    # 4. Crear un cliente inventado
    cliente = Cliente.objects.create(
        campana=campana,
        nombre="Miguel Roberto",
        telefono="+573114598741",
        base_datos=base_datos,
        otros_datos={
            "email": "roberto@gmail.com",
            "ciudad": "Cali",
            "edad": 35,
            "interes": "Casino"
        }
    )
    print(f"✅ Cliente creado: {cliente.nombre} ({cliente.telefono})")
    
    # 5. Buscar el producto con ID 2
    try:
        producto = Producto.objects.get(id=2)
        print(f"✅ Producto encontrado: {producto.nombre} - ${producto.precio}")
    except Producto.DoesNotExist:
        print("❌ Error: No se encontró un producto con ID=2")
        print("   Productos disponibles:")
        for p in Producto.objects.all()[:5]:
            print(f"   - ID {p.id}: {p.nombre} - ${p.precio}")
        return
    
    # 6. Crear la venta con el monto del producto
    venta = Venta.objects.create(
        campana_id=campana,
        monto=producto.precio  # Usar el precio del producto
    )
    print(f"✅ Venta creada con ID: {venta.venta_id} - Monto: ${venta.monto}")
    print(f"   Producto vendido: {producto.nombre}")
    
    # 7. Crear la llamada asociada a la venta
    # Obtener los estados necesarios
    estado_completada = get_estado('ESTADO_LLAMADA', 'COMPLETADA')
    estado_venta_realizada = get_estado('ESTADO_VENTA', 'VENTA')
    estado_no_reportada = get_estado('ESTADO_REPORTADA', 'NO_REPORTADA')
    estado_no_auditada = get_estado('ESTADO_AUDITORIA', 'NO_AUDITADA')
    
    if not all([estado_completada, estado_venta_realizada, estado_no_reportada]):
        print("❌ Error: No se encontraron todos los estados necesarios")
        print(f"   COMPLETADA: {estado_completada}")
        print(f"   VENTA: {estado_venta_realizada}")
        print(f"   NO_REPORTADA: {estado_no_reportada}")
        return
    
    # Crear fechas para la llamada (hace 2 horas)
    fecha_inicio = timezone.now() - timedelta(hours=2)
    fecha_fin = fecha_inicio + timedelta(minutes=8, seconds=35)  # 8:35 de duración
    
    llamada = Llamada.objects.create(
        agente=agente,
        cliente=cliente,
        venta=venta,
        fecha_hora_inicio=fecha_inicio,
        fecha_hora_fin=fecha_fin,
        duracion=515,  # 8 minutos 35 segundos = 515 segundos
        estado_llamada=estado_completada,
        estado_venta=estado_venta_realizada,
        estado_reportada=estado_no_reportada,
        estado_auditoria=estado_no_auditada,
        transcipcion="Cliente interesado en seguro de vida. Se explicaron los beneficios y coberturas. Cliente decidió contratar el plan premium.",
        grabacion_url="https://ejemplo.com/grabaciones/llamada-venta-12345.mp3",
        twilio_call_sid=f"CA{timezone.now().timestamp()}test",
        twilio_status="completed",
        fue_contestada=True,
        telefono_origen="+573009876543",  # Teléfono del call center
        telefono_destino=cliente.telefono
    )
    
    print(f"✅ Llamada creada con ID: {llamada.id}")
    print(f"   Duración: {llamada.duracion_total_formateada}")
    print(f"   Estado: {llamada.estado_llamada.valor}")
    print(f"   Venta realizada: Sí")
    
    # Resumen final
    print()
    print("=" * 70)
    print("✨ VENTA CREADA EXITOSAMENTE!")
    print("=" * 70)
    print(f"📞 Llamada ID: {llamada.id}")
    print(f"💰 Venta ID: {venta.venta_id}")
    print(f"📦 Producto: {producto.nombre}")
    print(f"� Monto: ${venta.monto:,.2f} COP")
    print(f"👤 Cliente: {cliente.nombre}")
    print(f"📱 Teléfono: {cliente.telefono}")
    print(f"👔 Agente: {agente.get_full_name()}")
    print(f"📋 Campaña: {campana.nombre}")
    print(f"⏱️  Duración llamada: {llamada.duracion_total_formateada}")
    print(f"📅 Fecha: {fecha_inicio.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

if __name__ == '__main__':
    create_venta()
