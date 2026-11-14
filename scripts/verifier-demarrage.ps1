# Lance vraiment HMZ (Electron) 35 secondes : la fenêtre doit s'ouvrir, sans plantage noté.
$ErrorActionPreference = 'Continue'
node node_modules/electron/install.js | Out-Null
$exe = node -p "require('electron')"
$log = Join-Path $env:APPDATA 'HMZ Launcher\hmz.log'
Remove-Item $log -ErrorAction SilentlyContinue
$p = Start-Process -FilePath $exe -ArgumentList '.' -PassThru -RedirectStandardError err.txt -RedirectStandardOutput out.txt
Start-Sleep -Seconds 35
$wins = Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
$text = ''
if (Test-Path $log) { $text = Get-Content $log -Raw }
$errs = Get-Content err.txt -Raw -ErrorAction SilentlyContinue
Stop-Process -Name electron -Force -ErrorAction SilentlyContinue
"Fenêtres ouvertes : $(@($wins).Count)"
if ($text) { "--- journal ---"; $text }
if ($errs) { "--- erreurs ---"; $errs }
if (@($wins).Count -lt 1 -or $text -match 'PLANTAGE|error during load' -or $errs -match 'error during load') {
  Write-Error 'HMZ ne démarre pas correctement : publication annulée.'
  exit 1
}
'Démarrage OK'
