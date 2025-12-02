#!/bin/bash
# Script para iniciar el sistema Call Center en Ubuntu/Linux

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              SISTEMA CALL CENTER - INICIANDO                 ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que Docker esté corriendo
echo "[1/6] Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ERROR: Docker no está corriendo                             ║"
    echo "║                                                              ║"
    echo "║  Por favor inicie Docker con: sudo systemctl start docker    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    exit 1
fi
echo "       [OK] Docker está corriendo"

# Verificar que existe .env
echo "[2/6] Verificando configuración..."
if [ ! -f .env ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ERROR: No se encontró el archivo .env                       ║"
    echo "║                                                              ║"
    echo "║  Por favor:                                                  ║"
    echo "║  1. Copie el archivo .env.example a .env                     ║"
    echo "║  2. Edite .env con sus credenciales de Twilio y AssemblyAI   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    exit 1
fi
echo "       [OK] Archivo .env encontrado"

# Construir imágenes
echo "[3/6] Construyendo imágenes (esto puede tardar varios minutos la primera vez)..."
if ! docker-compose build --quiet; then
    echo ""
    echo "[ERROR] Falló la construcción de imágenes"
    exit 1
fi
echo "       [OK] Imágenes construidas"

# Iniciar servicios
echo "[4/6] Iniciando servicios..."
if ! docker-compose up -d; then
    echo ""
    echo "[ERROR] Falló el inicio de servicios"
    exit 1
fi
echo "       [OK] Servicios iniciados"

# Esperar a que la base de datos esté lista
echo "[5/6] Ejecutando migraciones de base de datos..."
sleep 10

# Ejecutar migraciones
docker-compose exec -T backend python manage.py migrate --noinput > /dev/null 2>&1
echo "       [OK] Migraciones ejecutadas"

# Poblar datos iniciales
echo "[6/6] Poblando datos iniciales del sistema..."
docker-compose exec -T backend python manage.py populate_tipos_parametros > /dev/null 2>&1
echo "       [OK] Datos iniciales configurados"

# Obtener la IP pública
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU-IP-PUBLICA")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✓ SISTEMA INICIADO CORRECTAMENTE                    ║"
echo "║                                                              ║"
echo "║  Acceda a la aplicación en:                                  ║"
echo "║                                                              ║"
echo "     →  http://$PUBLIC_IP"
echo "║                                                              ║"
echo "║  Panel de administración Django:                             ║"
echo "║                                                              ║"
echo "     →  http://$PUBLIC_IP:8000/admin"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Para detener el sistema, ejecute: ./detener.sh"
echo ""
