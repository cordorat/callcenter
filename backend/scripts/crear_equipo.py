"""
Script para crear un equipo y asignar un agente.
Ejecutar con: python crear_equipo.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User
from apps.campaigns.models import Campana, Equipo, EquipoAgenteDetalle
from django.core.exceptions import ValidationError

def crear_equipo_y_asignar_agente():
    """
    Crea un equipo relacionado a la campaña 1 y asigna el agente con documento_id=1083866259.
    """
    
    print("=" * 70)
    print("CREANDO EQUIPO Y ASIGNANDO AGENTE")
    print("=" * 70)
    
    try:
        # 1. Obtener la campaña 1
        campana = Campana.objects.get(id=1)
        print(f"✅ Campaña encontrada: {campana.nombre}")
        print()
        
        # 2. Obtener el agente con documento_id=1083866259
        agente = User.objects.get(documento_id='1083866259')
        print(f"✅ Agente encontrado:")
        print(f"   Nombre: {agente.first_name} {agente.last_name}")
        print(f"   Email: {agente.email}")
        print(f"   Documento ID: {agente.documento_id}")
        print(f"   Rol: {agente.get_role_display()}")
        print()
        
        # 3. Obtener el jefe de centro (opcional, se puede dejar None si no existe)
        jefe_centro = campana.jefe_campana  # Usamos el jefe de campaña como jefe de centro
        if jefe_centro:
            print(f"✅ Jefe de centro: {jefe_centro.first_name} {jefe_centro.last_name}")
        else:
            print(f"⚠️  No se asignó jefe de centro al equipo")
        print()
        
        # 4. Crear el equipo
        equipo = Equipo.objects.create(
            nombre=f"Equipo {campana.nombre} - 1",
            jefe_centro=jefe_centro,
            campana=campana,
            is_active=True
        )
        print(f"✅ Equipo creado:")
        print(f"   ID: {equipo.equipo_id}")
        print(f"   Nombre: {equipo.nombre}")
        print(f"   Campaña: {equipo.campana.nombre}")
        print(f"   Estado: {'Activo' if equipo.is_active else 'Inactivo'}")
        print()
        
        # 5. Asignar el agente al equipo
        equipo_agente = EquipoAgenteDetalle.objects.create(
            agente_id=agente,
            equipo_id=equipo
        )
        # Validar la asignación
        equipo_agente.full_clean()
        equipo_agente.save()
        
        print(f"✅ Agente asignado al equipo:")
        print(f"   Agente: {agente.first_name} {agente.last_name}")
        print(f"   Equipo: {equipo.nombre}")
        print()
        
        # 6. Mostrar resumen
        print("=" * 70)
        print("✨ RESUMEN FINAL")
        print("=" * 70)
        print(f"Equipo ID: {equipo.equipo_id}")
        print(f"Nombre del equipo: {equipo.nombre}")
        print(f"Campaña: {equipo.campana.nombre} (ID: {equipo.campana.id})")
        print(f"Cantidad de agentes: {equipo.cantidad_agentes}")
        print(f"Agentes en el equipo:")
        for agente_det in equipo.agentes_detalle.all():
            print(f"  - {agente_det.agente_id.first_name} {agente_det.agente_id.last_name} (Doc: {agente_det.agente_id.documento_id})")
        print("=" * 70)
        
    except Campana.DoesNotExist:
        print("❌ Error: No se encontró la campaña con ID 1")
        print("   Verifica que exista una campaña con campana_id=1")
        
    except User.DoesNotExist:
        print("❌ Error: No se encontró el agente con documento_id=1083866259")
        print("   Verifica que exista un usuario con ese documento_id")
        
    except ValidationError as e:
        print(f"❌ Error de validación: {e}")
        print("   Puede que el agente ya esté asignado a otro equipo activo")
        
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    crear_equipo_y_asignar_agente()
