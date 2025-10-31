"""
Script para crear un producto y agregarlo a una campaña específica.
Simplemente modifica las variables y ejecuta el script.
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.campaigns.models import Producto, Campana, ProductoCampanaDetalle

# ============================================================================
# CONFIGURA ESTOS VALORES
# ============================================================================
# Datos del producto
PRODUCTO_NOMBRE = "Plan Premium"
PRODUCTO_DESCRIPCION = "Acceso completo por 12 meses"
PRODUCTO_PRECIO = 200000
PRODUCTO_ACTIVO = True

# ID de la campaña
CAMPANA_ID = 2
# ============================================================================

def crear_y_agregar_producto():
    """Crea un producto y lo agrega a una campaña específica."""
    print("\n" + "="*80)
    print("CREAR PRODUCTO Y AGREGAR A CAMPAÑA")
    print("="*80)
    
    try:
        # Buscar la campaña
        campana = Campana.objects.get(pk=CAMPANA_ID)
        print(f"\n✓ Campaña encontrada: {campana.nombre}")
        print(f"  Estado: {campana.estado.valor if campana.estado else 'N/A'}")
        print(f"  Fecha inicio: {campana.fecha_inicio}")
        
        # Verificar si el producto ya existe por nombre
        producto_existente = Producto.objects.filter(nombre=PRODUCTO_NOMBRE).first()
        
        if producto_existente:
            print(f"\n⚠️  El producto '{PRODUCTO_NOMBRE}' ya existe (ID: {producto_existente.pk})")
            print(f"   Precio actual: ${producto_existente.precio}")
            print(f"   Activo: {'Sí' if producto_existente.activo else 'No'}")
            producto = producto_existente
        else:
            # Crear el producto
            producto = Producto.objects.create(
                nombre=PRODUCTO_NOMBRE,
                descripcion=PRODUCTO_DESCRIPCION,
                precio=PRODUCTO_PRECIO,
                activo=PRODUCTO_ACTIVO
            )
            print(f"\n✅ Producto creado exitosamente")
            print(f"   ID: {producto.pk}")
            print(f"   Nombre: {producto.nombre}")
            print(f"   Precio: ${producto.precio}")
        
        # Verificar si ya existe la relación con la campaña
        existe = ProductoCampanaDetalle.objects.filter(
            producto=producto,
            campana=campana
        ).exists()
        
        if existe:
            print(f"\n⚠️  Este producto ya está asignado a la campaña '{campana.nombre}'")
            detalle = ProductoCampanaDetalle.objects.get(
                producto=producto,
                campana=campana
            )
            print(f"   Fecha de asignación: {detalle.created_at}")
        else:
            # Crear la relación
            detalle = ProductoCampanaDetalle.objects.create(
                producto=producto,
                campana=campana
            )
            print(f"\n✅ Producto agregado a la campaña exitosamente")
            print(f"   Fecha de asignación: {detalle.created_at}")
        
        print("\n" + "="*80)
        print("✅ PROCESO COMPLETADO")
        print("="*80)
        print(f"Producto: {producto.nombre} (ID: {producto.pk})")
        print(f"Campaña: {campana.nombre} (ID: {campana.pk})")
        print(f"Precio: ${producto.precio}")
        print("="*80)
        return True
        
    except Campana.DoesNotExist:
        print(f"\n❌ ERROR: No existe una campaña con ID {CAMPANA_ID}")
        print("   Verifica que el ID de la campaña sea correcto")
        return False
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    crear_y_agregar_producto()
