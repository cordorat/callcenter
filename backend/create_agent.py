"""
Script para crear un usuario agente inicial del sistema.
Ejecutar con: python create_agent.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User


def create_agent():
    """Crea el usuario agente si no existe."""
    email = 'agent@callcenter.com'

    if User.objects.filter(email=email).exists():
        print(f'El usuario {email} ya existe.')
        return

    # Crear el usuario agente
    user = User.objects.create_user(
        email=email,
        password='agent123',  # Cambiar en producción
        first_name='Agente',
        last_name='Sistema',
        phone='+1000000000',
        role=User.Role.AGENT
    )

    print('Usuario agente creado exitosamente!')
    print(f'   Email: {user.email}')
    print(f'   Password: agent123')
    print(f'   Rol: {user.get_role_display()}')
    print('\n IMPORTANTE: Cambia la contraseña en producción!')


if __name__ == '__main__':
    create_agent()
