"""
Script para crear usuarios agentes de prueba.
Ejecutar con: python create_agent.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User
from common.estados_helper import get_estado

def create_agents():
    """Crea usuarios agentes de prueba."""
    
    agentes = [
        {
            'email': 'agente123456@callcenter.com',
            'password': 'agente123456!',
            'first_name': 'Miguel',
            'last_name': 'Castañeda',
            'phone': '+573002367677',
            'documento_id': '12312312'
        }
    ]
    
    print("=" * 70)
    print("CREANDO USUARIOS AGENTES")
    print("=" * 70)
    
    rol_agente = get_estado('ROL_USUARIO', 'AGENTE')
    
    for data in agentes:
        email = data['email']
        
        if User.objects.filter(email=email).exists():
            print(f'⚠️  El usuario {email} ya existe.')
            continue
        
        # Crear el usuario agente
        user = User.objects.create_user(
            email=email,
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone=data['phone'],
            documento_id=data['documento_id'],
            rol=rol_agente
        )
        
        print(f'✅ Usuario creado: {email}')
        print(f'   Nombre: {user.first_name} {user.last_name}')
        print(f'   Documento ID: {user.documento_id}')
        print(f'   Rol: {user.get_role_display()}')
        print(f'   Password: {data["password"]}')
        print()
    
    print("=" * 70)
    print("✨ Agentes creados exitosamente!")
    print("=" * 70)

if __name__ == '__main__':
    create_agents()
