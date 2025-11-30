@echo off
chcp 65001 >nul
title Call Center - Deteniendo Sistema

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║             SISTEMA CALL CENTER - DETENIENDO                 ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo Deteniendo servicios...
docker-compose down

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║          ✓ SISTEMA DETENIDO CORRECTAMENTE                    ║
echo ║                                                              ║
echo ║  Los datos de la base de datos se han preservado.            ║
echo ║  Para iniciar nuevamente, ejecute: iniciar.bat               ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
pause
