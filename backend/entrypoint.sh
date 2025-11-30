#!/bin/bash
# Entrypoint script para el backend Django
# Este script se ejecuta al iniciar el contenedor

set -e

echo "========================================"
echo "  Iniciando Backend Call Center"
echo "========================================"

# Esperar a que PostgreSQL esté disponible
echo "⏳ Esperando a PostgreSQL..."
while ! python -c "import psycopg2; psycopg2.connect(dbname='$DB_NAME', user='$DB_USER', password='$DB_PASSWORD', host='$DB_HOST', port='$DB_PORT')" 2>/dev/null; do
    sleep 1
done
echo "✅ PostgreSQL disponible"

# Ejecutar migraciones
echo "⏳ Ejecutando migraciones..."
python manage.py migrate --noinput
echo "✅ Migraciones completadas"

# Poblar datos iniciales (TiposParametros)
echo "⏳ Poblando datos iniciales..."
python manage.py populate_tipos_parametros
echo "✅ Datos iniciales poblados"

# Recopilar archivos estáticos
echo "⏳ Recopilando archivos estáticos..."
python manage.py collectstatic --noinput
echo "✅ Archivos estáticos recopilados"

echo "========================================"
echo "  ✅ Backend listo para recibir peticiones"
echo "========================================"

# Ejecutar el comando principal (gunicorn o lo que se pase)
exec "$@"
