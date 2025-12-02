#!/bin/bash
# Script para ver logs del sistema Call Center en Ubuntu/Linux

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                    VER LOGS DEL SISTEMA                      ║"
echo "║                                                              ║"
echo "║  Seleccione qué logs desea ver:                              ║"
echo "║                                                              ║"
echo "║    1. Todos los servicios                                    ║"
echo "║    2. Solo Backend (Django)                                  ║"
echo "║    3. Solo Celery Worker (tareas)                            ║"
echo "║    4. Solo Celery Beat (programador)                         ║"
echo "║    5. Solo Frontend (Nginx)                                  ║"
echo "║    6. Solo Base de datos                                     ║"
echo "║    7. Solo Ngrok (webhooks)                                  ║"
echo "║    0. Salir                                                  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

read -p "Ingrese opción: " opcion

case $opcion in
    1) docker-compose logs -f ;;
    2) docker-compose logs -f backend ;;
    3) docker-compose logs -f celery-worker ;;
    4) docker-compose logs -f celery-beat ;;
    5) docker-compose logs -f frontend ;;
    6) docker-compose logs -f postgres ;;
    7) docker-compose logs -f ngrok ;;
    0) exit 0 ;;
    *) echo "Opción no válida" ;;
esac
