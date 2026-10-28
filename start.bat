@echo off
chcp 65001 >nul
title WSFlow - Entorno de Desarrollo y Pruebas
color 0B

echo ====================================================================
echo            WSFlow - Lanzador de Entorno de Desarrollo
echo ====================================================================
echo.

:: 1. Verificación de Docker
echo [1/4] Verificando estado del motor Docker...
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 goto docker_ready

echo [!] Docker no esta en ejecucion. Intentando iniciar Docker Desktop...
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
    start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
) else if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
) else (
    echo [!] No se encontro el ejecutable de Docker Desktop.
    echo     Por favor abre Docker Desktop manualmente y vuelve a ejecutar este script.
    pause
    exit /b 1
)

echo [*] Esperando que Docker Desktop inicialice...
:wait_docker
timeout /t 4 /nobreak >nul
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo     Aguardando conexion con Docker daemon...
    goto wait_docker
)

:docker_ready
echo [OK] Docker esta activo y listo.
echo.

:: 2. Levantar Contenedores PostgreSQL y Redis
echo [2/4] Iniciando servicios de base de datos (PostgreSQL 16 + Redis 7)...
cd /d "%~dp0"
docker compose up -d postgres redis
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo al levantar los contenedores con docker compose.
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] PostgreSQL y Redis activos en segundo plano.
echo.

:: 3. Iniciar Backend en su propia ventana
echo [3/4] Iniciando servidor Backend (NestJS en puerto 3000)...
start "WSFlow - Backend (NestJS :3000)" cmd /k "cd /d ""%~dp0backend"" && echo Iniciando Backend... && npm run start:dev"
echo [OK] Ventana del Backend lanzada.
echo.

:: 4. Iniciar Frontend en su propia ventana
echo [4/4] Iniciando servidor Frontend (Vite + React Flow en puerto 5173)...
start "WSFlow - Frontend (Vite :5173)" cmd /k "cd /d ""%~dp0frontend"" && echo Iniciando Frontend... && npm run dev"
echo [OK] Ventana del Frontend lanzada.
echo.

:: 5. Preguntar por el túnel de Meta (Cloudflare)
echo --------------------------------------------------------------------
echo Deseas iniciar el tunel Cloudflare para pruebas con WhatsApp real?
echo (Necesario solo si vas a recibir webhooks en vivo desde Meta)
choice /c SN /n /m "[S] Si, iniciar tunel  /  [N] No, solo pruebas locales/simulador: "
if %ERRORLEVEL% EQU 1 (
    start "WSFlow - Tunel Cloudflare" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0scripts\start-tunnel.ps1"
    echo [OK] Tunel iniciado en ventana independiente.
)
echo.

:: 6. Abrir navegador
echo --------------------------------------------------------------------
echo Deseas abrir el Frontend en el navegador web ahora?
choice /c SN /n /m "[S] Si  /  [N] No: "
if %ERRORLEVEL% EQU 1 (
    timeout /t 2 /nobreak >nul
    start http://localhost:5173
)

echo.
echo ====================================================================
echo  Entorno iniciado con exito:
echo   - Backend API:  http://localhost:3000
echo   - Frontend App: http://localhost:5173
echo ====================================================================
echo Puedes cerrar esta ventana. Las terminales de cada servicio seguiran activas.
echo.
pause
