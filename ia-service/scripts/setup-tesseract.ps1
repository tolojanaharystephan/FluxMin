# FluxMin - install Tesseract into ia-service/vendor/tesseract (portable path)
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\ia-service\scripts\setup-tesseract.ps1

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IaRoot = Resolve-Path (Join-Path $ScriptDir "..")
$Target = Join-Path $IaRoot "vendor\tesseract"

$Candidates = @(
  "C:\Program Files\Tesseract-OCR",
  "C:\Program Files (x86)\Tesseract-OCR",
  "$env:LOCALAPPDATA\Programs\Tesseract-OCR"
)

Write-Host "Cible portable : $Target"

$Source = $null
foreach ($c in $Candidates) {
  $exe = Join-Path $c "tesseract.exe"
  if (Test-Path $exe) {
    $Source = $c
    break
  }
}

New-Item -ItemType Directory -Force -Path $Target | Out-Null

if ($null -ne $Source) {
  Write-Host "Copie depuis l'installation systeme : $Source"
  & robocopy $Source $Target /E /NFL /NDL /NJH /NJS /nc /ns /np
  $rc = $LASTEXITCODE
  if ($rc -ge 8) {
    throw "Echec robocopy (code $rc)"
  }
} else {
  Write-Host "Aucune install Tesseract trouvee. Telechargement UB-Mannheim..."
  $Url = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20240606/tesseract-ocr-w64-setup-5.4.0.20240606.exe"
  $Installer = Join-Path $env:TEMP "tesseract-fluxmin-setup.exe"
  Invoke-WebRequest -Uri $Url -OutFile $Installer -UseBasicParsing
  Write-Host "Installation silencieuse vers $Target ..."
  $proc = Start-Process -FilePath $Installer -ArgumentList "/S", "/D=$Target" -Wait -PassThru
  $targetExe = Join-Path $Target "tesseract.exe"
  if (($proc.ExitCode -ne 0) -and (-not (Test-Path $targetExe))) {
    throw "Installation Tesseract echouee (exit $($proc.ExitCode))."
  }
}

$Exe = Join-Path $Target "tesseract.exe"
if (-not (Test-Path $Exe)) {
  throw "tesseract.exe introuvable dans $Target"
}

$Tessdata = Join-Path $Target "tessdata"
$Fra = Join-Path $Tessdata "fra.traineddata"
if (-not (Test-Path $Fra)) {
  Write-Host "Attention : fra.traineddata manquant dans tessdata."
}

Write-Host ""
Write-Host "OK - Tesseract embarque :"
& $Exe --version 2>&1 | Select-Object -First 2
Write-Host ""
Write-Host "Chemin relatif pour .env :"
Write-Host "  TESSERACT_CMD=vendor/tesseract/tesseract.exe"
Write-Host "Ou laissez TESSERACT_CMD=auto"
