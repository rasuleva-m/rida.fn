# RIDA.FN — Railway setup helper (run in PowerShell from repo root)
$ErrorActionPreference = "Stop"

Write-Host "`n=== RIDA.FN Railway Setup ===`n" -ForegroundColor Cyan

$railway = "railway"
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
  $railwayCmd = Join-Path $env:APPDATA "npm\railway.cmd"
  if (Test-Path $railwayCmd) {
    $railway = $railwayCmd
  } else {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
    $railway = Join-Path $env:APPDATA "npm\railway.cmd"
  }
}

Write-Host "1) Log in to Railway (browser will open)" -ForegroundColor Green
& $railway login

Write-Host "`n2) Link this folder to your Railway project" -ForegroundColor Green
& $railway link

Write-Host "`n3) Set variables (you will be prompted for BOT_TOKEN)" -ForegroundColor Green
$token = Read-Host "Paste BOT_TOKEN from BotFather"
$chatId = Read-Host "Paste MASTER_CHAT_ID (e.g. 7811117912)"
& $railway variables set "BOT_TOKEN=$token" "MASTER_CHAT_ID=$chatId" "ALLOWED_ORIGINS=https://gen-lang-client-0122413605.web.app"

Write-Host "`n4) Add persistent volume at /app/data" -ForegroundColor Green
& $railway volume add --mount-path /app/data

Write-Host "`n5) Deploy" -ForegroundColor Green
& $railway up

Write-Host "`n6) Open public URL" -ForegroundColor Green
& $railway domain

Write-Host "`nDone. Copy the domain above into VITE_BOOKING_API_URL, then:" -ForegroundColor Cyan
Write-Host '  $env:VITE_BOOKING_API_URL="https://YOUR-DOMAIN.up.railway.app"' -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  firebase deploy --only hosting`n" -ForegroundColor White
