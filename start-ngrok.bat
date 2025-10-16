@echo off
echo.
echo ========================================
echo   DASHBOARD LINISCO CON IA + NGROK
echo ========================================
echo.

echo Iniciando servidor web en puerto 3000...
start "Dashboard Server" cmd /k "cd /d %~dp0 && node web/server.js"

echo.
echo Esperando 5 segundos para que el servidor se inicie...
timeout /t 5 /nobreak > nul

echo.
echo Iniciando tunel ngrok...
echo.
echo ========================================
echo   INFORMACION IMPORTANTE:
echo ========================================
echo - Dashboard local: http://localhost:3000
echo - URL publica: Se mostrara en la ventana de ngrok
echo - Para detener: Cierra ambas ventanas o presiona Ctrl+C
echo - Accede desde cualquier dispositivo usando la URL de ngrok
echo ========================================
echo.

ngrok http 3000

pause

