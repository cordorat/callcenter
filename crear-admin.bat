@echo off
chcp 65001 >nul
title Call Center - Crear Usuario Administrador

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║          CREAR USUARIO ADMINISTRADOR                         ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar que los servicios estén corriendo
docker-compose ps | findstr "backend" | findstr "Up" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] El sistema no está corriendo.
    echo         Ejecute primero: iniciar.bat
    echo.
    pause
    exit /b 1
)

echo Creando usuario administrador...
echo.
docker-compose exec backend python manage.py createsuperuser

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║  Usuario creado. Puede acceder al panel de admin en:         ║
echo ║                                                              ║
echo ║     →  http://localhost:8000/admin                           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
