#!/bin/bash
# Script para ver el estado de los servicios en Ubuntu/Linux

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              ESTADO DE LOS SERVICIOS                         ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

docker-compose ps

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Obtener la IP pública
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU-IP-PUBLICA")

echo "URLs de acceso:"
echo "  Frontend:    http://$PUBLIC_IP"
echo "  Backend API: http://$PUBLIC_IP:8000/api/"
echo "  Admin:       http://$PUBLIC_IP:8000/admin/"
echo "  Ngrok Panel: http://$PUBLIC_IP:4040"
echo ""

# Verificar uso de recursos
echo "═══════════════════════════════════════════════════════════════"
echo "Uso de recursos:"
echo ""
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""
