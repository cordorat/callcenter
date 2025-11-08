"""
Script para crear un Centro y asignarle un Jefe de Centro ya creado.

Uso:
  python create_centro.py --jefe-email jefe@callcenter.com --nombre "Centro Secundario" --direccion "Calle 2"

Opciones:
  --jefe-email   Email del usuario que será asignado como jefe de centro (recomendado)
  --jefe-id      Documento (documento_id) del usuario jefe (alternativa a --jefe-email)
  --nombre       Nombre del centro (obligatorio)
  --direccion    Dirección del centro (opcional)
  --force        Forzar asignación aunque el usuario no tenga rol JEFE_CENTRO

El script inicializa Django localmente igual que otros scripts en /backend.
"""

import os
import sys
import django
import argparse

# Configurar Django (misma lógica que otros scripts en backend)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'callcenter.settings')
django.setup()

from apps.users.models import User, Centro
from django.db import IntegrityError


def crear_o_asignar_centro(jefe_email=None, jefe_id=None, nombre=None, direccion=None, force=False):
    """Crea un Centro y lo asigna al jefe especificado.

    Retorna el objeto Centro si todo va bien, o None en caso de error.
    """

    print("=" * 80)
    print("CREANDO / ASIGNANDO CENTRO")
    print("=" * 80)

    if not nombre:
        print("\n❌ ERROR: Debes indicar --nombre para el centro")
        return None

    # Buscar el usuario por email o documento
    user = None
    try:
        if jefe_email:
            user = User.objects.get(email=jefe_email)
        elif jefe_id:
            user = User.objects.get(documento_id=jefe_id)
        else:
            print("\n❌ ERROR: Debes indicar --jefe-email o --jefe-id")
            return None
    except User.DoesNotExist:
        print(f"\n❌ ERROR: No se encontró un usuario con los datos suministrados (email={jefe_email}, documento_id={jefe_id})")
        return None

    # Verificar rol
    if not user.is_jefe_centro() and not force:
        print(f"\n❌ ERROR: El usuario {user.email} no tiene rol JEFE_CENTRO. Usa --force para forzar la asignación.")
        return None

    try:
        centro, created = Centro.objects.get_or_create(
            nombre=nombre,
            defaults={
                'direccion': direccion or '',
                'jefe_centro': user
            }
        )

        if created:
            print(f"\n✅ Centro creado: {centro.nombre}")
        else:
            # Si existe y el jefe es distinto, actualizar
            if centro.jefe_centro and centro.jefe_centro.pk == user.pk:
                print(f"\nℹ️  Centro existente y ya asignado al mismo jefe: {centro.nombre}")
            else:
                centro.jefe_centro = user
                if direccion:
                    centro.direccion = direccion
                centro.save()
                print(f"\n✅ Centro existente actualizado y asignado al jefe: {centro.nombre}")

        print("\n📋 Información resultante:")
        print(f"   Nombre: {centro.nombre}")
        print(f"   Dirección: {centro.direccion}")
        print(f"   Jefe asignado: {user.full_name} <{user.email}>")
        print("\nProceso completado.")
        print("=" * 80)

        return centro

    except IntegrityError as e:
        print(f"\n❌ ERROR de integridad al crear/actualizar el centro: {e}")
        return None
    except Exception as e:
        print(f"\n❌ ERROR inesperado: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description='Crear un Centro y asignarle un Jefe existente')
    parser.add_argument('--jefe-email', help='Email del jefe de centro')
    parser.add_argument('--jefe-id', help='Documento (documento_id) del jefe de centro')
    parser.add_argument('--nombre', required=True, help='Nombre del centro')
    parser.add_argument('--direccion', help='Dirección del centro', default='')
    parser.add_argument('--force', help='Forzar asignación aunque el usuario no tenga rol JEFE_CENTRO', action='store_true')

    args = parser.parse_args()

    centro = crear_o_asignar_centro(
        jefe_email=args.jefe_email,
        jefe_id=args.jefe_id,
        nombre=args.nombre,
        direccion=args.direccion,
        force=args.force
    )

    if not centro:
        sys.exit(1)


if __name__ == '__main__':
    main()
