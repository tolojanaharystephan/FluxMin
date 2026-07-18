# Demarre ia-service (OCR + analyse) — requis pour toute analyse PJ
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Ia = Join-Path $Root "ia-service"
Set-Location $Ia

# Tesseract portable si absent
$Tess = Join-Path $Ia "vendor\tesseract\tesseract.exe"
if (-not (Test-Path $Tess)) {
  Write-Host "Tesseract vendor absent — lancement setup..."
  powershell -ExecutionPolicy Bypass -File (Join-Path $Ia "scripts\setup-tesseract.ps1")
}

Write-Host "IA Service → http://localhost:8000"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
