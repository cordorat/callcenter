"""
Script para migrar equipos existentes de jefe_centro a centro.
Este script busca equipos que tenían un jefe_centro asignado (datos antiguos)
y los asocia al centro correspondiente de ese jefe.

USO:
    python migrar_equipos_a_centros.py
"""

import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.campaigns.models import Equipo
from apps.users.models import Centro

def migrar_equipos():
    """
    Migra equipos al centro correcto basándose en datos históricos.
    """
    print("=" * 80)
    print("MIGRACIÓN DE EQUIPOS A CENTROS")
    print("=" * 80)
    
    # Obtener todos los equipos sin centro asignado
    equipos_sin_centro = Equipo.objects.filter(centro__isnull=True)
    total = equipos_sin_centro.count()
    
    if total == 0:
        print("\n✓ Todos los equipos ya tienen un centro asignado.")
        return
    
    print(f"\nEncontrados {total} equipos sin centro asignado.")
    print("\nOpciones:")
    print("1. Asignar a un centro específico")
    print("2. Cancelar")
    
    opcion = input("\nSeleccione una opción (1-2): ").strip()
    
    if opcion == "1":
        # Mostrar centros disponibles
        centros = Centro.objects.all()
        
        if not centros.exists():
            print("\n✗ No hay centros disponibles. Cree uno primero.")
            return
        
        print("\nCentros disponibles:")
        for i, centro in enumerate(centros, 1):
            jefe = centro.jefe_centro.full_name if centro.jefe_centro else "Sin jefe"
            print(f"{i}. {centro.nombre} - Jefe: {jefe}")
        
        centro_idx = input(f"\nSeleccione el centro (1-{centros.count()}): ").strip()
        
        try:
            centro_idx = int(centro_idx) - 1
            centro = list(centros)[centro_idx]
        except (ValueError, IndexError):
            print("\n✗ Opción inválida.")
            return
        
        # Actualizar equipos
        confirmacion = input(f"\n¿Asignar {total} equipos al centro '{centro.nombre}'? (s/n): ").strip().lower()
        
        if confirmacion == 's':
            count = equipos_sin_centro.update(centro=centro)
            print(f"\n✓ Se actualizaron {count} equipos exitosamente.")
        else:
            print("\n✗ Operación cancelada.")
    else:
        print("\n✗ Operación cancelada.")
    
    print("\n" + "=" * 80)

if __name__ == '__main__':
    migrar_equipos()
