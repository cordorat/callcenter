"""
Script para consultar los IDs de los estados más comunes del sistema.
Útil para configurar estados por defecto en el código.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import TiposParametros


def mostrar_estados():
    """Muestra los IDs de todos los estados organizados por categoría."""
    
    print("=" * 80)
    print("TABLA DE REFERENCIA - IDs DE TIPOS DE PARÁMETROS")
    print("=" * 80)
    
    categorias = TiposParametros.objects.values_list('nombre', flat=True).distinct().order_by('nombre')
    
    for categoria in categorias:
        print(f"\n{'=' * 80}")
        print(f"📁 {categoria}")
        print(f"{'=' * 80}")
        
        parametros = TiposParametros.objects.filter(nombre=categoria).order_by('valor')
        
        if parametros.exists():
            print(f"\n{'ID':<6} {'VALOR':<30} {'DESCRIPCIÓN'}")
            print("-" * 80)
            
            for param in parametros:
                print(f"{param.parametros_id:<6} {param.valor:<30} {param.descripcion[:45]}")
        else:
            print("No hay registros para esta categoría")
    
    print("\n" + "=" * 80)
    
    # Generar código Python de referencia para estados comunes
    print("\n" + "=" * 80)
    print("CÓDIGO DE REFERENCIA - ESTADOS MÁS COMUNES")
    print("=" * 80)
    print("\n# Copiar en tu código para usar estados por ID:\n")
    
    estados_comunes = {
        'ESTADO_AGENTE': ['DISPONIBLE', 'EN_LLAMADA', 'POSTCALL', 'DESCONECTADO'],
        'ESTADO_LLAMADA': ['TIMBRADO', 'EN_CURSO', 'COMPLETADA', 'RECHAZADA'],
        'ESTADO_VENTA': ['VENTA', 'NO_VENTA', 'PENDIENTE'],
        'ESTADO_INTERACION_LLAMADA': ['CONTACTADO', 'NO_CONTACTADO'],
    }
    
    print("# Estados comunes del sistema")
    for categoria, valores in estados_comunes.items():
        print(f"\n# {categoria}")
        for valor in valores:
            try:
                param = TiposParametros.objects.get(nombre=categoria, valor=valor)
                nombre_var = f"{categoria}_{valor}".upper()
                print(f"{nombre_var}_ID = {param.parametros_id}  # {param.descripcion}")
            except TiposParametros.DoesNotExist:
                print(f"# ERROR: No encontrado {categoria} - {valor}")
    
    print("\n" + "=" * 80)
    
    # Consultas SQL útiles
    print("\n" + "=" * 80)
    print("CONSULTAS SQL ÚTILES")
    print("=" * 80)
    print("""
-- Obtener estado DISPONIBLE para agentes
SELECT parametros_id FROM tipos_parametros 
WHERE nombre = 'ESTADO_AGENTE' AND valor = 'DISPONIBLE';

-- Obtener todos los estados de agente
SELECT parametros_id, valor, descripcion FROM tipos_parametros 
WHERE nombre = 'ESTADO_AGENTE' ORDER BY valor;

-- Obtener todos los estados de venta
SELECT parametros_id, valor, descripcion FROM tipos_parametros 
WHERE nombre = 'ESTADO_VENTA' ORDER BY valor;

-- Obtener todos los estados de llamada
SELECT parametros_id, valor, descripcion FROM tipos_parametros 
WHERE nombre = 'ESTADO_LLAMADA' ORDER BY valor;
""")
    
    print("=" * 80)
    
    # Estadísticas
    total = TiposParametros.objects.count()
    print(f"\n📊 Total de parámetros en el sistema: {total}")
    print("=" * 80)


def buscar_estado(categoria, valor):
    """Busca un estado específico por categoría y valor."""
    try:
        param = TiposParametros.objects.get(nombre=categoria, valor=valor)
        print("\n" + "=" * 80)
        print(f"✅ ESTADO ENCONTRADO")
        print("=" * 80)
        print(f"ID:          {param.parametros_id}")
        print(f"Categoría:   {param.nombre}")
        print(f"Valor:       {param.valor}")
        print(f"Descripción: {param.descripcion}")
        print("=" * 80)
        return param.parametros_id
    except TiposParametros.DoesNotExist:
        print(f"\n❌ ERROR: No se encontró {categoria} - {valor}")
        return None


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) == 3:
        # Buscar un estado específico
        categoria = sys.argv[1].upper()
        valor = sys.argv[2].upper()
        buscar_estado(categoria, valor)
    else:
        # Mostrar todos los estados
        mostrar_estados()
        
        print("\n💡 TIP: Para buscar un estado específico:")
        print("   python consultar_estados.py CATEGORIA VALOR")
        print("   Ejemplo: python consultar_estados.py ESTADO_AGENTE DISPONIBLE\n")
