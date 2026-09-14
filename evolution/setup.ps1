# Evolution API kurulum scripti (Windows PowerShell)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Evolution API Kurulumu ===" -ForegroundColor Cyan

function New-EvolutionSecret {
    return ([guid]::NewGuid().ToString("N"))
}

if (-not (Test-Path ".env")) {
    $apiKey = New-EvolutionSecret
    @"
AUTHENTICATION_API_KEY=$apiKey
SERVER_URL=http://localhost:8080
SERVER_PORT=8080
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:evolution@postgres:5432/evolution
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379/0
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_LOCAL_ENABLED=false
LOG_LEVEL=ERROR
"@ | Set-Content -Path ".env" -Encoding UTF8
    Write-Host ".env olusturuldu (API key)" -ForegroundColor Green
} else {
    Write-Host ".env zaten var, atlaniyor" -ForegroundColor Yellow
}

$maxAttempts = 8
for ($i = 1; $i -le $maxAttempts; $i++) {
    Write-Host "Docker image indiriliyor (deneme $i/$maxAttempts)..." -ForegroundColor Cyan
    $env:DOCKER_CLIENT_TIMEOUT = "600"
    docker compose pull evolution-api
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Image indirildi." -ForegroundColor Green
        break
    }
    if ($i -eq $maxAttempts) {
        Write-Host "Image indirilemedi. Internet baglantinizi kontrol edip tekrar calistirin." -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 5
}

Write-Host "Evolution API baslatiliyor (port 8080)..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Baslatma basarisiz." -ForegroundColor Red
    exit 1
}

Write-Host "Servislerin hazir olmasi bekleniyor..." -ForegroundColor Cyan
Start-Sleep -Seconds 20

try {
    $health = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing -TimeoutSec 20
    Write-Host "Evolution API calisiyor: $($health.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Evolution API henuz hazir degil; loglari kontrol edin: docker compose logs -f evolution-api" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Hazir ===" -ForegroundColor Green
Write-Host "API       : http://localhost:8080"
Write-Host "Manager   : http://localhost:8080/manager"
Write-Host ""
Write-Host "Sonraki adim: Admin panel > Acente Yonetimi > Evolution WhatsApp" -ForegroundColor Cyan
