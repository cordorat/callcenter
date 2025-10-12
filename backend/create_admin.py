"""
Script para crear el usuario administrador inicial del sistema.
Ejecutar con: python create_admin.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User
from common.estados_helper import get_estado

def create_admin():
    """Crea el usuario administrador si no existe."""
    email = 'admin@callcenter.com'
    
    if User.objects.filter(email=email).exists():
        print(f'El usuario {email} ya existe.')
        return
    
    # Crear el usuario administrador
    user = User.objects.create_superuser(
        email=email,
        password='admin123',  #Cambiar en producción
        first_name='Admin',
        last_name='Sistema',
        phone='+1234567890',
        rol=get_estado('ROL_USUARIO', 'ADMIN')
    )
    
    print('Usuario administrador creado exitosamente!')
    print(f'   Email: {user.email}')
    print(f'   Password: admin123')
    print(f'   Rol: {user.get_role_display()}')
    print('\n IMPORTANTE: Cambia la contraseña en producción!')

if __name__ == '__main__':
    create_admin()
