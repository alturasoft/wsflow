@echo off
chcp 65001 >nul
title WSFlow - Sincronizar Flujos a VPS
color 0B

echo ====================================================================
echo          WSFlow - Sincronizador de Flujos (Local a VPS)
echo ====================================================================
echo.
echo Este script copiara todos los flujos creados y sus versiones
echo desde tu base de datos local hacia la VPS en produccion.
echo.
choice /c SN /n /m "Deseas proceder con la sincronizacion de flujos a https://wsflow.hostlapaz.com? [S/N]: "
if %ERRORLEVEL% NEQ 1 (
    echo Sincronizacion cancelada por el usuario.
    pause
    exit /b 0
)

echo.
python "%~dp0scripts\sync_flows_to_vps.py"

echo.
pause
