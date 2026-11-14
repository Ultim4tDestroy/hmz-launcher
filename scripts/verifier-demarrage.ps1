# Lance vraiment HMZ sous Windows et vérifie qu'il démarre bien :
#   - une fenêtre est ouverte,
#   - le journal contient « Fenêtre affichée » (avec la bonne version si demandée),
#   - aucun plantage ni mode secours n'est noté.
# -Exe : un HMZ installé (sinon : le code du dépôt avec Electron). -Version : version attendue.
param([string]$Exe = '', [string]$Version = '', [int]$Seconds = 35)
$ErrorActionPreference = 'Continue'
$log = Join-Path $env:APPDATA 'HMZ Launcher\hmz.log'
Remove-Item $log -ErrorAction SilentlyContinue
if ($Exe) {
  $name = [IO.Path]::GetFileNameWithoutExtension($Exe)
  $p = Start-Process -FilePath $Exe -PassThru
} else {
  node node_modules/electron/install.js | Out-Null
  $Exe = node -p "require('electron')"
  $name = 'electron'
  $p = Start-Process -FilePath $Exe -ArgumentList '.' -PassThru -RedirectStandardError err.txt -RedirectStandardOutput out.txt
}
Start-Sleep -Seconds $Seconds
$wins = @(Get-Process $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 })
$text = ''; if (Test-Path $log) { $text = Get-Content $log -Raw }
$errs = Get-Content err.txt -Raw -ErrorAction SilentlyContinue
Stop-Process -Name $name -Force -ErrorAction SilentlyContinue
"Programme : $Exe"
"Fenêtres ouvertes : $($wins.Count)"
if ($text) { "--- journal ---"; $text }
if ($errs) { "--- erreurs ---"; $errs }
$problems = @()
if ($wins.Count -lt 1) { $problems += 'aucune fenêtre ouverte' }
if ($text -notmatch 'Fenêtre affichée') { $problems += "la fenêtre n'a jamais été affichée" }
if ($text -notmatch 'Interface prête') { $problems += "l'interface ne s'est pas dessinée" }
if ($text -match 'ERREUR \(fenêtre\)') { $problems += "erreur dans l'interface" }
if ($Version -and $text -notmatch [regex]::Escape("HMZ $Version")) { $problems += "ce n'est pas la version $Version qui a démarré" }
if ($text -match 'PLANTAGE|SECOURS|error during load' -or $errs -match 'error during load') { $problems += 'plantage noté dans le journal' }
if ($problems.Count) { Write-Error ("HMZ ne démarre pas correctement : " + ($problems -join ', ') + '. Publication annulée.'); exit 1 }
'Démarrage OK'
