# Script de PowerShell para iniciar Dashboard con ngrok
# Ejecutar con: .\start-ngrok.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DASHBOARD LINISCO CON IA + NGROK" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si ngrok está instalado
try {
    $ngrokVersion = ngrok version 2>$null
    Write-Host "✅ ngrok detectado: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok no encontrado. Instalando..." -ForegroundColor Red
    npm install -g ngrok
}

# Verificar si el puerto 3000 está libre
$portCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "⚠️  Puerto 3000 en uso. Deteniendo procesos..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*3000*" } | Stop-Process -Force
    Start-Sleep -Seconds 2
}

Write-Host "🚀 Iniciando servidor web en puerto 3000..." -ForegroundColor Green

# Iniciar servidor web en background
$webServerJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node web/server.js
}

# Esperar a que el servidor se inicie
Write-Host "⏳ Esperando 5 segundos para que el servidor se inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar que el servidor esté corriendo
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Servidor web iniciado correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: No se pudo conectar al servidor web" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que no haya errores en el servidor" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🌐 Iniciando túnel ngrok..." -ForegroundColor Green
Write-Host ""

# Mostrar información importante
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INFORMACIÓN IMPORTANTE:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Dashboard local: http://localhost:3000" -ForegroundColor White
Write-Host "🌐 URL pública: Se mostrará abajo" -ForegroundColor White
Write-Host "🤖 Funcionalidades de IA disponibles:" -ForegroundColor White
Write-Host "   • Chat con IA para consultas en lenguaje natural" -ForegroundColor Gray
Write-Host "   • Análisis inteligente de patrones de ventas" -ForegroundColor Gray
Write-Host "   • Predicciones basadas en datos históricos" -ForegroundColor Gray
Write-Host "   • Recomendaciones para optimizar el negocio" -ForegroundColor Gray
Write-Host "   • Visualizaciones automáticas con gráficos" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Para detener: Ctrl+C" -ForegroundColor Yellow
Write-Host "📱 Accede desde cualquier dispositivo usando la URL de ngrok" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar ngrok
try {
    ngrok http 3000
} catch {
    Write-Host "❌ Error iniciando ngrok" -ForegroundColor Red
    Write-Host "💡 Verifica que ngrok esté instalado: npm install -g ngrok" -ForegroundColor Yellow
} finally {
    # Limpiar procesos al salir
    Write-Host ""
    Write-Host "🛑 Deteniendo procesos..." -ForegroundColor Yellow
    Stop-Job $webServerJob -ErrorAction SilentlyContinue
    Remove-Job $webServerJob -ErrorAction SilentlyContinue
    Write-Host "✅ Procesos detenidos" -ForegroundColor Green
}

