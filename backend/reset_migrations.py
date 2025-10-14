"""
Script para limpiar migraciones antiguas y preparar para nuevas migraciones.
Uso: python reset_migrations.py
"""
import os
import shutil
from pathlib import Path

# Apps del proyecto
APPS = [
    'apps/authn',
    'apps/calls',
    'apps/campaigns',
    'apps/integrations',
    'apps/kpis',
    'apps/recordings',
    'apps/users',
]

def reset_migrations():
    """Elimina todas las migraciones excepto __init__.py"""
    print("🧹 Limpiando migraciones antiguas...\n")
    
    for app in APPS:
        migrations_dir = Path(app) / 'migrations'
        
        if not migrations_dir.exists():
            print(f"⚠️  {app}: No existe directorio migrations")
            continue
        
        print(f"📂 Procesando {app}/migrations/")
        
        # Listar archivos en migrations
        files_deleted = 0
        for file in migrations_dir.iterdir():
            if file.is_file() and file.name != '__init__.py':
                if file.suffix == '.py' or file.suffix == '.pyc':
                    print(f"   ❌ Eliminando: {file.name}")
                    file.unlink()
                    files_deleted += 1
        
        # Limpiar __pycache__
        pycache_dir = migrations_dir / '__pycache__'
        if pycache_dir.exists():
            print(f"   🗑️  Limpiando __pycache__")
            shutil.rmtree(pycache_dir)
        
        print(f"   ✅ {files_deleted} archivos eliminados\n")
    
    print("✨ Limpieza completada!\n")
    print("📝 Próximos pasos:")
    print("   1. python manage.py makemigrations")
    print("   2. python manage.py migrate")
    print("   3. python poblar_tipos_parametros.py")
    print("   4. python manage.py createsuperuser")

if __name__ == '__main__':
    respuesta = input("⚠️  Esto eliminará TODAS las migraciones. ¿Continuar? (s/n): ")
    if respuesta.lower() in ['s', 'si', 'y', 'yes']:
        reset_migrations()
    else:
        print("❌ Operación cancelada")
