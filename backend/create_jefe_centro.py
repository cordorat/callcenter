"""
Script para crear un usuario con rol JEFE_CENTRO para pruebas.

Crea un usuario de ejemplo con las siguientes credenciales:
- Email: jefe@callcenter.com
- Password: jefe123!
- Rol: JEFE_CENTRO

Ejecutar: python create_jefe_centro.py
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User, TiposParametros, Centro
from django.db import IntegrityError


def crear_jefe_centro():
    """Crea un usuario jefe de centro si no existe."""
    
    print("=" * 80)
    print("CREANDO USUARIO JEFE DE CENTRO")
    print("=" * 80)
    
    email = "jefe@callcenter.com"
    password = "jefe123!"
    documento_id = "1000000001"
    
    # Verificar si el usuario ya existe
    if User.objects.filter(email=email).exists():
        print(f"\n⚠️  El usuario {email} ya existe")
        user = User.objects.get(email=email)
        print(f"\n📋 Información del usuario:")
        print(f"   Email: {user.email}")
        print(f"   Nombre: {user.full_name}")
        print(f"   Rol: {user.rol.valor if user.rol else 'Sin rol'}")
        print(f"   Activo: {'Sí' if user.is_active else 'No'}")
        return user
    
    try:
        # Obtener el rol JEFE_CENTRO
        rol_jefe_centro = TiposParametros.objects.get(
            nombre='ROL_USUARIO',
            valor='JEFE_CENTRO'
        )
        
        print(f"\n✅ Rol JEFE_CENTRO encontrado (ID: {rol_jefe_centro.parametros_id})")
        
        # Crear el usuario
        user = User.objects.create_user(
            documento_id=documento_id,
            email=email,
            password=password,
            first_name='Juan',
            last_name='Pérez',
            rol=rol_jefe_centro
        )
        
        print(f"\n🎉 Usuario jefe de centro creado exitosamente!")
        
        # Crear o asociar un centro con este jefe
        centro, created = Centro.objects.get_or_create(
            nombre='Centro Principal',
            defaults={
                'direccion': 'Calle Principal 123',
                'jefe_centro': user
            }
        )
        
        # Si el centro ya existía pero no tenía jefe, asignarlo
        if not created and not centro.jefe_centro:
            centro.jefe_centro = user
            centro.save()
            print(f"✅ Centro actualizado con nuevo jefe: {centro.nombre}")
        elif created:
            print(f"✅ Centro creado: {centro.nombre}")
        else:
            print(f"ℹ️  Centro existente: {centro.nombre}")
        
        print(f"\n📋 Credenciales:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"   Nombre: {user.full_name}")
        print(f"   Documento: {documento_id}")
        print(f"   Rol: {user.rol.valor}")
        print(f"   Centro a cargo: {centro.nombre}")
        
        print(f"\n💡 Usa estas credenciales para hacer login y probar la funcionalidad de equipos")
        print("=" * 80)
        
        return user
        
    except TiposParametros.DoesNotExist:
        print("\n❌ ERROR: El rol JEFE_CENTRO no existe en la base de datos")
        print("   Ejecuta primero: python poblar_tipos_parametros.py")
        return None
    except IntegrityError as e:
        print(f"\n❌ ERROR de integridad: {e}")
        return None
    except Exception as e:
        print(f"\n❌ ERROR inesperado: {e}")
        return None


def main():
    """Función principal."""
    user = crear_jefe_centro()
    
    if user:
        print("\n✅ Proceso completado exitosamente")
        
        # Mostrar información adicional
        print(f"\n📊 Resumen:")
        print(f"   Total de usuarios: {User.objects.count()}")
        print(f"   Total de jefes de centro: {User.objects.filter(rol__valor='JEFE_CENTRO').count()}")
        print(f"   Total de centros: {Centro.objects.count()}")
    else:
        print("\n❌ No se pudo crear el usuario")
        sys.exit(1)


if __name__ == '__main__':
    main()
