"""
Script para crear un Jefe de Campaña y asignarle un Centro a una Campaña existente.

Uso:
  python create_and_assign_centro_campana.py --campana-id 1 --centro-id 2

Opciones principales:
  --campana-id       ID de la campaña a actualizar (por defecto: 1)
  --centro-id        ID del Centro a asignar (alternativa a --centro-nombre)
  --centro-nombre    Buscar centro por nombre (alternativa a --centro-id)

  --jefe-email       Email del Jefe de Campaña a crear (si no existe)
  --jefe-documento  Documento (documento_id) del Jefe (si no existe; se genera si no se indica)
  --jefe-password    Contraseña para el Jefe creado (por defecto: JefeCampana123!)
  --jefe-first-name  Nombre del Jefe (por defecto: Jefe)
  --jefe-last-name   Apellido del Jefe (por defecto: Campana)

  --force-role       Forzar creación aunque no exista el rol JEFE_CAMPANA (no recomendado)

El script inicializa Django como los otros scripts en `backend`.
"""

import os
import sys
import django
import argparse
import random
import time

# Inicializar Django (mismo patrón que otros scripts)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User, Centro, TiposParametros
from apps.campaigns.models import Campana
from common.estados_helper import get_estado
from django.db import IntegrityError


def crear_o_recuperar_jefe_campana(email=None, documento=None, password=None, first_name='Jefe', last_name='Campana', force_role=False):
    """Crea (si no existe) o recupera un usuario con rol JEFE_CAMPANA.

    Retorna el usuario creado/recuperado o None en caso de error.
    """

    if email:
        existing = User.objects.filter(email=email).first()
        if existing:
            print(f"ℹ️  Usuario con email {email} ya existe: {existing.documento_id}")
            return existing

    if documento:
        existing = User.objects.filter(documento_id=documento).first()
        if existing:
            print(f"ℹ️  Usuario con documento {documento} ya existe: {existing.email}")
            return existing

    # Obtener rol JEFE_CAMPANA
    rol = get_estado('ROL_USUARIO', 'JEFE_CAMPAÑA')
    if not rol and not force_role:
        print('❌ ERROR: El rol JEFE_CAMPANA no existe en TiposParametros. Usa --force-role para forzar (no recomendado).')
        return None

    # Generar valores por defecto si faltan
    if not email:
        
        email = "jefecampana@gmail.com"
    if not documento:
        # Generar documento aleatorio (evitar colisiones)
        documento = 2323

    password = password or 'JefeCampana123!'

    try:
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            documento_id=documento,
            rol=rol if rol else None,
            is_active=True
        )

        print(f"✅ Jefe de Campaña creado: {user.email} (documento: {user.documento_id})")
        return user

    except IntegrityError as e:
        print(f"❌ ERROR de integridad creando usuario: {e}")
        return None
    except Exception as e:
        print(f"❌ ERROR inesperado creando usuario: {e}")
        return None


def asignar_centro_y_jefe_a_campana(campana_id, centro_id=None, centro_nombre=None, jefe_user=None):
    """Asigna el centro y el jefe a la campaña indicada."""

    try:
        campana = Campana.objects.get(pk=campana_id)
    except Campana.DoesNotExist:
        print(f"❌ ERROR: No existe una campaña con id={campana_id}")
        return None

    centro = None
    try:
        if centro_id:
            centro = Centro.objects.get(pk=centro_id)
        elif centro_nombre:
            centro = Centro.objects.filter(nombre=centro_nombre).first()
            if not centro:
                print(f"❌ ERROR: No se encontró Centro con nombre '{centro_nombre}'")
                return None
        else:
            print("❌ ERROR: Debes indicar --centro-id o --centro-nombre para asignar")
            return None
    except Centro.DoesNotExist:
        print(f"❌ ERROR: No existe Centro con id={centro_id}")
        return None

    # Asignar
    campana.centro = centro
    if jefe_user:
        campana.jefe_campana = jefe_user
    campana.save()

    print('\n✅ Campaña actualizada correctamente')
    print(f"   Campaña: {campana.nombre} (id={campana.pk})")
    print(f"   Centro asignado: {centro.nombre} (id={centro.pk})")
    print(f"   Jefe de campaña: {jefe_user.full_name if jefe_user else 'No cambiado'}")

    return campana


def main():
    parser = argparse.ArgumentParser(description='Crear Jefe de Campaña y asignar Centro a una Campaña existente')
    parser.add_argument('--campana-id', type=int, default=1, help='ID de la campaña a actualizar (default: 1)')
    parser.add_argument('--centro-id', type=int, help='ID del centro a asignar')
    parser.add_argument('--centro-nombre', help='Nombre del centro a asignar (alternativa a --centro-id)')

    parser.add_argument('--jefe-email', help='Email del Jefe de Campaña a crear')
    parser.add_argument('--jefe-documento', help='Documento (documento_id) del Jefe a crear')
    parser.add_argument('--jefe-password', help='Contraseña para el Jefe creado')
    parser.add_argument('--jefe-first-name', default='Jefe', help='Nombre del Jefe (default: Jefe)')
    parser.add_argument('--jefe-last-name', default='Campana', help='Apellido del Jefe (default: Campana)')
    parser.add_argument('--force-role', action='store_true', help='Forzar creación aunque no exista el rol JEFE_CAMPANA')

    args = parser.parse_args()

    # Crear o recuperar jefe
    jefe = crear_o_recuperar_jefe_campana(
        email=args.jefe_email,
        documento=args.jefe_documento,
        password=args.jefe_password,
        first_name=args.jefe_first_name,
        last_name=args.jefe_last_name,
        force_role=args.force_role
    )

    if jefe is None:
        print('❌ No se pudo crear/recuperar el Jefe de Campaña. Abortando.')
        sys.exit(1)

    # Asignar centro y jefe a la campaña
    campana = asignar_centro_y_jefe_a_campana(
        campana_id=args.campana_id,
        centro_id=args.centro_id,
        centro_nombre=args.centro_nombre,
        jefe_user=jefe
    )

    if not campana:
        sys.exit(1)


if __name__ == '__main__':
    main()
