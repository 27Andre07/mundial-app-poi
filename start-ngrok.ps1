# Script para iniciar el proyecto Mundial App con ngrok
Write-Host 'Iniciando Mundial App POI con ngrok...' -ForegroundColor Green

# Verificar si XAMPP está corriendo
Write-Host "`nVerificando XAMPP..." -ForegroundColor Yellow
$xamppRunning = Get-Process "httpd" -ErrorAction SilentlyContinue
if (-not $xamppRunning) {
    Write-Host 'XAMPP/Apache no está corriendo. Inícialo desde el panel de control de XAMPP.' -ForegroundColor Red
    Write-Host '   Presiona Enter cuando XAMPP esté corriendo...'
    Read-Host
}

# Iniciar servidor Node.js en segundo plano
Write-Host "`nIniciando servidor Node.js (Socket.IO)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js"
Start-Sleep -Seconds 2

# Iniciar ngrok con la configuración
Write-Host "`nIniciando túneles ngrok..." -ForegroundColor Yellow
Write-Host '   - mundialpoi-app.ngrok.app -> localhost:80 (PHP/Apache)' -ForegroundColor Cyan
Write-Host '   - mundialpoi-ws.ngrok.app -> localhost:3000 (Node.js/Socket.IO)' -ForegroundColor Cyan

# Verificar si existe ngrok-config.yml
if (Test-Path "ngrok-config.yml") {
    Write-Host "`nUsando configuración de ngrok-config.yml" -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; ngrok start --all --config ngrok-config.yml"
} else {
    Write-Host "`nNo se encontró ngrok-config.yml. Iniciando túneles manualmente..." -ForegroundColor Yellow
    Write-Host "`nEjecuta estos comandos en terminales separadas:" -ForegroundColor Cyan
    Write-Host '   ngrok http 80 --domain=mundialpoi-app.ngrok.app' -ForegroundColor White
    Write-Host '   ngrok http 3000 --domain=mundialpoi-ws.ngrok.app' -ForegroundColor White
}

Write-Host "`nTodo listo! Accede a tu app en: https://mundialpoi-app.ngrok.app" -ForegroundColor Green
Write-Host '   Presiona Ctrl+C para detener los servicios.' -ForegroundColor Gray
