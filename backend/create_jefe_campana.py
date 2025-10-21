"""
Script para crear un usuario con rol Jefe de Campaña.
Ejecutar con: python create_jefe_campana.py
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User, TiposParametros
from common.estados_helper import get_estado

def create_jefe_campana():
    """Crea un usuario Jefe de Campaña."""
    
    email = 'jefe_campana@callcenter.com'
    password = 'jefe_campana123!'
    
    # Verificar si el usuario ya existe
    if User.objects.filter(email=email).exists():
        print(f'✅ El usuario {email} ya existe.')
        return
    
    try:
        # Obtener el rol JEFE_CAMPANA
        rol_jefe_campana = get_estado('ROL_USUARIO', 'JEFE_CAMPANA')
        
        if not rol_jefe_campana:
            print('❌ Error: El rol JEFE_CAMPANA no existe en TiposParametros.')
            print('Debes crear el rol primero en la base de datos.')
            return
        
        # Crear el usuario
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name='Jefe',
            last_name='Campaña',
            phone='+573001234567',
            documento_id='1234567890',  # Documento único
            rol=rol_jefe_campana,
            is_active=True
        )
        
        print('✅ Usuario Jefe de Campaña creado exitosamente!')
        print(f'   Email: {user.email}')
        print(f'   Password: {password}')
        print(f'   Rol: {user.rol.valor if user.rol else "Sin rol"}')
        print(f'   Documento ID: {user.documento_id}')
        print(f'   Activo: {user.is_active}')
        print('\n⚠️  IMPORTANTE: Cambia la contraseña en producción!')
        
    except Exception as e:
        print(f'❌ Error al crear el usuario: {str(e)}')
        print(f'   Detalles: {e.__class__.__name__}')

if __name__ == '__main__':
    create_jefe_campana()
