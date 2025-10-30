"""
Script para crear usuarios coordinadores.
Ejecutar con: python create_coordinator.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User
from common.estados_helper import get_estado

def create_coordinators():
    """Crea usuarios coordinadores."""
    
    coordinadores = [
        {
            'email': 'coordinador12@callcenter.com',
            'password': 'coordinador123!',
            'first_name': 'Carlos',
            'last_name': 'García',
            'phone': '+573001234568',
            'documento_id': '0987542345'
        }
    ]
    
    print("=" * 70)
    print("CREANDO USUARIOS COORDINADORES")
    print("=" * 70)
    
    rol_coordinador = get_estado('ROL_USUARIO', 'COORDINADOR')
    
    if not rol_coordinador:
        print("❌ Error: El rol 'COORDINADOR' no existe en la base de datos.")
        print("   Ejecuta primero: python poblar_tipos_parametros.py")
        return
    
    for data in coordinadores:
        email = data['email']
        
        if User.objects.filter(email=email).exists():
            print(f'⚠️  El usuario {email} ya existe.')
            continue
        
        # Crear el usuario coordinador
        user = User.objects.create_user(
            email=email,
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data['phone'],
            documento_id=data['documento_id'],
            rol=rol_coordinador
        )
        
        print(f'✅ Usuario creado: {email}')
        print(f'   Nombre: {user.first_name} {user.last_name}')
        print(f'   Documento ID: {user.documento_id}')
        print(f'   Rol: {user.get_role_display()}')
        print(f'   Password: {data["password"]}')
        print()
    
    print("=" * 70)
    print("✨ Coordinadores creados exitosamente!")
    print("=" * 70)

if __name__ == '__main__':
    create_coordinators()
