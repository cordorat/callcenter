"""
Script para corregir el campo fue_contestada en llamadas existentes.

Este script analiza las llamadas y corrige el campo fue_contestada basándose en:
1. Si el estado_llamada es EN_CURSO o COMPLETADA Y
2. Si la llamada realmente tuvo interacción (tiene venta asociada o formulario)

NOTA: Este script NO debe marcar como contestadas las llamadas que solo timbraron.
La duración incluye el tiempo de timbre, por lo que NO es un indicador confiable.

Uso:
    python scripts/corregir_fue_contestada.py [--dry-run] [--verbose]
"""

import os
import sys
import django
import argparse
from datetime import datetime

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.calls.models import Llamada
from common.estados_helper import get_estado_id

def analizar_llamadas(dry_run=False, verbose=False):
    """
    Analiza y corrige el campo fue_contestada de las llamadas.
    """
    print("=" * 80)
    print("CORRECCIÓN DE CAMPO fue_contestada")
    print("=" * 80)
    print(f"\nModo: {'DRY RUN (no se guardarán cambios)' if dry_run else 'EJECUCIÓN REAL'}")
    print()
    
    # Obtener estados relevantes
    estado_en_curso_id = get_estado_id('ESTADO_LLAMADA', 'EN_CURSO')
    estado_completada_id = get_estado_id('ESTADO_LLAMADA', 'COMPLETADA')
    estado_no_venta_id = get_estado_id('ESTADO_VENTA', 'NO_VENTA')
    
    print("📊 Analizando llamadas en la base de datos...\n")
    
    # Estadísticas
    total_llamadas = Llamada.objects.count()
    llamadas_contestadas = Llamada.objects.filter(fue_contestada=True).count()
    llamadas_no_contestadas = Llamada.objects.filter(fue_contestada=False).count()
    
    print(f"Total de llamadas: {total_llamadas}")
    print(f"  - Marcadas como contestadas: {llamadas_contestadas}")
    print(f"  - Marcadas como NO contestadas: {llamadas_no_contestadas}")
    print()
    
    # CASO 1: Llamadas que están EN_CURSO o COMPLETADAS pero marcadas como NO contestadas
    print("🔍 CASO 1: Llamadas que deberían estar marcadas como CONTESTADAS")
    print("   (Estado EN_CURSO o COMPLETADA con fue_contestada=False)")
    print()
    
    llamadas_caso1 = Llamada.objects.filter(
        fue_contestada=False,
        estado_llamada_id__in=[estado_en_curso_id, estado_completada_id]
    ).exclude(
        estado_venta_id=estado_no_venta_id
    )
    
    # También verificar si tienen venta o formulario asociado
    llamadas_caso1_con_evidencia = []
    for llamada in llamadas_caso1:
        tiene_venta = llamada.venta is not None
        tiene_formularios = llamada.formularios.exists()
        tiene_venta_no_vacia = llamada.estado_venta_id != estado_no_venta_id
        
        if tiene_venta or tiene_formularios or tiene_venta_no_vacia:
            llamadas_caso1_con_evidencia.append(llamada)
            if verbose:
                print(f"  ID {llamada.id}: Estado={llamada.estado_llamada.descripcion}, "
                      f"Venta={tiene_venta}, Formularios={tiene_formularios}, "
                      f"Duración={llamada.duracion}s")
    
    print(f"  Encontradas: {len(llamadas_caso1_con_evidencia)} llamadas")
    
    if llamadas_caso1_con_evidencia and not dry_run:
        Llamada.objects.filter(
            id__in=[l.id for l in llamadas_caso1_con_evidencia]
        ).update(fue_contestada=True)
        print(f"  ✅ Actualizadas: {len(llamadas_caso1_con_evidencia)} llamadas")
    elif dry_run and llamadas_caso1_con_evidencia:
        print(f"  ⚠️ DRY RUN: Se actualizarían {len(llamadas_caso1_con_evidencia)} llamadas")
    print()
    
    # CASO 2: Llamadas marcadas como CONTESTADAS pero que NO tienen evidencia de serlo
    print("🔍 CASO 2: Llamadas marcadas como CONTESTADAS sin evidencia")
    print("   (fue_contestada=True pero estado es TIMBRADO, NO_CONTESTADA, etc.)")
    print()
    
    # Estados que indican que NO fue contestada
    estado_timbrado_id = get_estado_id('ESTADO_LLAMADA', 'TIMBRADO')
    estado_no_contestada_id = get_estado_id('ESTADO_LLAMADA', 'NO_CONTESTADA')
    estado_pendiente_id = get_estado_id('ESTADO_LLAMADA', 'PENDIENTE')
    
    estados_no_contestada = [estado_timbrado_id, estado_no_contestada_id, estado_pendiente_id]
    estados_no_contestada = [e for e in estados_no_contestada if e is not None]
    
    llamadas_caso2 = Llamada.objects.filter(
        fue_contestada=True,
        estado_llamada_id__in=estados_no_contestada
    )
    
    # Verificar que realmente NO tengan evidencia
    llamadas_caso2_sin_evidencia = []
    for llamada in llamadas_caso2:
        tiene_venta = llamada.venta is not None
        tiene_formularios = llamada.formularios.exists()
        tiene_duracion_significativa = llamada.duracion and llamada.duracion > 5  # Más de 5 segundos hablando
        
        # Si NO tiene ninguna evidencia de haber sido contestada
        if not (tiene_venta or tiene_formularios or tiene_duracion_significativa):
            llamadas_caso2_sin_evidencia.append(llamada)
            if verbose:
                print(f"  ID {llamada.id}: Estado={llamada.estado_llamada.descripcion}, "
                      f"Duración={llamada.duracion}s")
    
    print(f"  Encontradas: {len(llamadas_caso2_sin_evidencia)} llamadas")
    
    if llamadas_caso2_sin_evidencia and not dry_run:
        Llamada.objects.filter(
            id__in=[l.id for l in llamadas_caso2_sin_evidencia]
        ).update(fue_contestada=False)
        print(f"  ✅ Actualizadas: {len(llamadas_caso2_sin_evidencia)} llamadas")
    elif dry_run and llamadas_caso2_sin_evidencia:
        print(f"  ⚠️ DRY RUN: Se actualizarían {len(llamadas_caso2_sin_evidencia)} llamadas")
    print()
    
    # Resumen final
    print("=" * 80)
    print("RESUMEN")
    print("=" * 80)
    if not dry_run:
        print(f"✅ Corregidas {len(llamadas_caso1_con_evidencia)} llamadas a CONTESTADAS")
        print(f"✅ Corregidas {len(llamadas_caso2_sin_evidencia)} llamadas a NO CONTESTADAS")
    else:
        print(f"⚠️ DRY RUN: Se corregirían {len(llamadas_caso1_con_evidencia)} llamadas a CONTESTADAS")
        print(f"⚠️ DRY RUN: Se corregirían {len(llamadas_caso2_sin_evidencia)} llamadas a NO CONTESTADAS")
    print()
    print("Ejecuta sin --dry-run para aplicar los cambios.")
    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(description='Corregir el campo fue_contestada en llamadas')
    parser.add_argument('--dry-run', action='store_true', help='Simular cambios sin guardar')
    parser.add_argument('--verbose', '-v', action='store_true', help='Mostrar detalles de cada llamada')
    
    args = parser.parse_args()
    
    try:
        analizar_llamadas(dry_run=args.dry_run, verbose=args.verbose)
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
