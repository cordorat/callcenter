"""
Script para asignar un coordinador a un equipo existente.
Simplemente modifica las variables EQUIPO_ID y COORDINADOR_DOC_ID y ejecuta el script.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.campaigns.models import Equipo
from apps.users.models import User

# ============================================================================
# CONFIGURA ESTOS VALORES
# ============================================================================
EQUIPO_ID = 3  # ID del equipo al que quieres asignar el coordinador
COORDINADOR_DOC_ID = "1234567893"  # Documento ID del coordinador
# ============================================================================

def asignar_coordinador():
    """Asigna el coordinador al equipo especificado."""
    print("\n" + "="*80)
    print("ASIGNANDO COORDINADOR A EQUIPO")
    print("="*80)
    
    try:
        # Buscar el equipo
        equipo = Equipo.objects.get(equipo_id=EQUIPO_ID)
        print(f"\n✓ Equipo encontrado: {equipo.nombre}")
        
        # Buscar el coordinador
        coordinador = User.objects.get(documento_id=COORDINADOR_DOC_ID, is_active=True)
        print(f"✓ Usuario encontrado: {coordinador.full_name} ({coordinador.email})")
        
        # Verificar que sea coordinador
        if not coordinador.is_coordinador():
            print(f"\n❌ ERROR: El usuario {coordinador.full_name} no tiene rol de COORDINADOR")
            print(f"   Rol actual: {coordinador.get_role_value()}")
            return False
        
        # Mostrar información antes de asignar
        coordinador_anterior = equipo.coordinador.full_name if equipo.coordinador else "Ninguno"
        print(f"\nCoordinador anterior: {coordinador_anterior}")
        print(f"Coordinador nuevo: {coordinador.full_name}")
        
        # Asignar coordinador
        equipo.coordinador = coordinador
        equipo.save()
        
        print("\n" + "="*80)
        print("✅ COORDINADOR ASIGNADO EXITOSAMENTE")
        print("="*80)
        print(f"Equipo: {equipo.nombre} (ID: {equipo.equipo_id})")
        print(f"Coordinador: {coordinador.full_name}")
        print(f"Email: {coordinador.email}")
        print(f"Agentes en el equipo: {equipo.cantidad_agentes}")
        print("="*80)
        return True
        
    except Equipo.DoesNotExist:
        print(f"\n❌ ERROR: No existe un equipo con ID {EQUIPO_ID}")
        print("   Verifica que el ID del equipo sea correcto")
        return False
        
    except User.DoesNotExist:
        print(f"\n❌ ERROR: No existe un usuario con documento ID '{COORDINADOR_DOC_ID}'")
        print("   Verifica que el documento ID sea correcto")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return False

if __name__ == '__main__':
    asignar_coordinador()

