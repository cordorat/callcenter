"""
Script para crear una nueva base de datos con 10 clientes de prueba.
La base NO se activa automáticamente.
"""
import os
import django
import sys

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.campaigns.models import Cliente, Campana, BaseDatosCargada
from common.estados_helper import get_estado
from datetime import date
import json

def crear_base_datos_con_clientes():
    """Crea una nueva base de datos con 10 clientes de prueba"""
    
    print("🔍 Buscando campaña...")
    
    try:
        # Buscar la campaña (ID 2)
        campana = Campana.objects.get(id=1)
        print(f"✅ Campaña encontrada: {campana.nombre}")
    except Campana.DoesNotExist:
        print("❌ Error: No se encontró la campaña con ID 2")
        return
    
    # Crear nueva base de datos
    print("\n📊 Creando nueva base de datos...")
    
    base_datos = BaseDatosCargada.objects.create(
        nombre_bd="Base de Datos Prueba 2",
        campana=campana,
        iteracion_activa=False,
        fecha_hora_inicio_iteracion=None
    )
    
    print(f"✅ Base de datos creada: {base_datos.nombre_bd} (ID: {base_datos.id})")
    print(f"   Estado: INACTIVA (no se activará automáticamente)")
    
    # Número de teléfono de prueba
    telefono = "+573204150881"
    
    # Nombres de ejemplo
    nombres = [
        "Roberto Morales Silva",
        "Carolina Ruiz Vargas",
        "Andrés Castro Medina",
        "Patricia Ortiz Mendoza",
        "Miguel Ángel Ramírez Cruz",
        "Gabriela Torres Pérez",
        "Fernando López Gutiérrez",
        "Daniela Moreno Flores",
        "Ricardo Jiménez Campos",
        "Alejandra Vega Delgado"
    ]
    
    print(f"\n📞 Creando 10 clientes con teléfono {telefono}...")
    
    clientes_creados = 0
    
    for i, nombre in enumerate(nombres, 1):
        try:
            # Crear cliente
            cliente = Cliente.objects.create(
                nombre=nombre,
                telefono=telefono,
                campana=campana,
                base_datos=base_datos,
                otros_datos=json.dumps({
                    "email": f"cliente.bd2.{i}@example.com",
                    "ciudad": "Medellín",
                    "origen": "base_datos_2",
                    "numero_cliente": i,
                    "base": 2
                })
            )
            
            print(f"  ✅ Cliente {i}: {nombre} (ID: {cliente.cliente_id})")
            clientes_creados += 1
            
        except Exception as e:
            print(f"  ❌ Error creando cliente {nombre}: {str(e)}")
    
    print(f"\n🎉 Proceso completado!")
    print(f"   Base de datos: {base_datos.nombre_bd} (ID: {base_datos.id})")
    print(f"   Estado: INACTIVA ❌")
    print(f"   Total clientes creados: {clientes_creados}")
    print(f"   Campaña: {campana.nombre} (ID: {campana.id})")
    print(f"   Teléfono: {telefono}")
    print(f"\n💡 Para activar esta base más tarde, crea un script activar_base_{base_datos.id}.py")

if __name__ == "__main__":
    crear_base_datos_con_clientes()
