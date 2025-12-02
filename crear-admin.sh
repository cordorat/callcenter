#!/bin/bash
# Script para crear usuario administrador en Ubuntu/Linux

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          CREAR USUARIO ADMINISTRADOR                         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Verificar que los servicios estén corriendo
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo "[ERROR] El sistema no está corriendo."
    echo "        Ejecute primero: ./iniciar.sh"
    echo ""
    exit 1
fi

echo "Creando usuario administrador..."
echo ""
docker-compose exec backend python manage.py createsuperuser

# Obtener la IP pública
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU-IP-PUBLICA")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║  Usuario creado. Puede acceder al panel de admin en:         ║"
echo "║                                                              ║"
echo "     →  http://$PUBLIC_IP:8000/admin"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
