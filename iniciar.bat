@echo off
chcp 65001 >nul
title Call Center - Iniciando Sistema

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║              SISTEMA CALL CENTER - INICIANDO                 ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar que Docker esté corriendo
echo [1/5] Verificando Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║  ERROR: Docker no está corriendo                             ║
    echo ║                                                              ║
    echo ║  Por favor inicie Docker Desktop y espere a que esté listo  ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
echo        [OK] Docker está corriendo

REM Verificar que existe .env
echo [2/5] Verificando configuración...
if not exist .env (
    echo.
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║  ERROR: No se encontró el archivo .env                       ║
    echo ║                                                              ║
    echo ║  Por favor:                                                  ║
    echo ║  1. Copie el archivo .env.example a .env                     ║
    echo ║  2. Edite .env con sus credenciales de Twilio y AssemblyAI   ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
echo        [OK] Archivo .env encontrado

REM Construir imágenes
echo [3/5] Construyendo imágenes (esto puede tardar varios minutos la primera vez)...
docker-compose build --quiet
if errorlevel 1 (
    echo.
    echo [ERROR] Falló la construcción de imágenes
    pause
    exit /b 1
)
echo        [OK] Imágenes construidas

REM Iniciar servicios
echo [4/5] Iniciando servicios...
docker-compose up -d
if errorlevel 1 (
    echo.
    echo [ERROR] Falló el inicio de servicios
    pause
    exit /b 1
)
echo        [OK] Servicios iniciados

REM Esperar a que la base de datos esté lista
echo [5/6] Ejecutando migraciones de base de datos...
timeout /t 10 /nobreak >nul

REM Ejecutar migraciones
docker-compose exec -T backend python manage.py migrate --noinput >nul 2>&1
echo        [OK] Migraciones ejecutadas

REM Poblar datos iniciales
echo [6/6] Poblando datos iniciales del sistema...
docker-compose exec -T backend python manage.py populate_tipos_parametros >nul 2>&1
echo        [OK] Datos iniciales configurados

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║          ✓ SISTEMA INICIADO CORRECTAMENTE                    ║
echo ║                                                              ║
echo ║  Acceda a la aplicación en:                                  ║
echo ║                                                              ║
echo ║     →  http://localhost                                      ║
echo ║                                                              ║
echo ║  Panel de administración Django:                             ║
echo ║                                                              ║
echo ║     →  http://localhost:8000/admin                           ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Para detener el sistema, ejecute: detener.bat
echo.
pause
