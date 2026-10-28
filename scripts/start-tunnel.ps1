# Script para exponer el Webhook local a Meta WhatsApp Cloud API mediante Cloudflare Tunnel
$Host.UI.RawUI.WindowTitle = "WSFlow - Tunel WhatsApp Cloud API"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   WSFlow - Exposicion de Webhook para WhatsApp API       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Iniciando tunel HTTPS publico apuntando a http://localhost:3000..." -ForegroundColor Yellow
Write-Host "Copia la URL https://*.trycloudflare.com que aparecera a continuacion" -ForegroundColor White
Write-Host "y configurala en Meta Developer Portal > WhatsApp > Configuration" -ForegroundColor Yellow
Write-Host "Ruta del webhook: https://<tu-url>.trycloudflare.com/webhook/whatsapp" -ForegroundColor Cyan
Write-Host "Token de verificacion: wsflow_webhook_verify_token_secure_2026" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Presiona Ctrl + C en esta ventana cuando desees detener el tunel." -ForegroundColor DarkGray
Write-Host ""

$cloudflaredCmd = "cloudflared"
if (Test-Path "C:\Program Files (x86)\cloudflared\cloudflared.exe") {
    $cloudflaredCmd = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
}

& $cloudflaredCmd tunnel --url http://localhost:3000
