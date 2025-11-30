@echo off
chcp 65001 >nul
title Call Center - Ver Logs

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║                    VER LOGS DEL SISTEMA                      ║
echo ║                                                              ║
echo ║  Seleccione qué logs desea ver:                              ║
echo ║                                                              ║
echo ║    1. Todos los servicios                                    ║
echo ║    2. Solo Backend (Django)                                  ║
echo ║    3. Solo Celery Worker (tareas)                            ║
echo ║    4. Solo Celery Beat (programador)                         ║
echo ║    5. Solo Frontend (Nginx)                                  ║
echo ║    6. Solo Base de datos                                     ║
echo ║    0. Salir                                                  ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set /p opcion="Ingrese opción: "

if "%opcion%"=="1" docker-compose logs -f
if "%opcion%"=="2" docker-compose logs -f backend
if "%opcion%"=="3" docker-compose logs -f celery-worker
if "%opcion%"=="4" docker-compose logs -f celery-beat
if "%opcion%"=="5" docker-compose logs -f frontend
if "%opcion%"=="6" docker-compose logs -f postgres
if "%opcion%"=="0" exit /b 0

pause
