@echo off
chcp 65001 >nul
title WSFlow - Desplegar a VPS en Producción
color 0A

echo ====================================================================
echo             WSFlow - Lanzador de Despliegue a VPS
echo ====================================================================
echo.
echo Este script realizara:
echo   1. Compilar Backend localmente.
echo   2. Empaquetar el proyecto.
echo   3. Subir los cambios a la VPS (129.121.63.105:22022).
echo   4. Reconstruir los contenedores en produccion.
echo.
choice /c SN /n /m "Deseas proceder con el despliegue a https://wsflow.hostlapaz.com? [S/N]: "
if %ERRORLEVEL% NEQ 1 (
    echo Despliegue cancelado por el usuario.
    pause
    exit /b 0
)

echo.
python "%~dp0scripts\deploy-to-vps.py"

echo.
pause
