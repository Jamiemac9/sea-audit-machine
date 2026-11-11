# Support Audit: install or update on Windows. Safe to run again at any time.
#
#   Installs (only what is missing): Python 3.12, Git for Windows, Claude Code,
#   Tesseract (scan reader), LibreOffice (Word converter).
#   Puts the app in        %USERPROFILE%\SupportAudit\app
#   Your working folders   %USERPROFILE%\SupportAudit\template    <- blank Support_Audit_OG.docx
#                          %USERPROFILE%\SupportAudit\reference   <- house style, SKILL.md, completed audits
#   Adds a desktop shortcut and starts it with Windows, then opens the page.
#
# Some installers ask "Do you want to allow this app to make changes?": click Yes.

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"
$Home_ = $env:USERPROFILE
$SA = Join-Path $Home_ "SupportAudit"
$App = Join-Path $SA "app"
$Repo = "https://github.com/Jamiemac9/sea-audit-machine.git"

function Say($m) { Write-Host ""; Write-Host "== $m" -ForegroundColor Cyan }
function RefreshPath {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
              [Environment]::GetEnvironmentVariable("Path", "User") + ";" +
              (Join-Path $Home_ ".local\bin")
}
function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function WingetInstall($id, $name) {
  Say "Installing $name"
  winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Host
  RefreshPath
}

RefreshPath
if (-not (Have "winget")) {
  Write-Host "This PC has no 'winget'. Install 'App Installer' from the Microsoft Store, then run this again." -ForegroundColor Red
  Read-Host "Press Enter to close"; exit 1
}

# ---- 1. tools ----
if (-not (Have "git")) { WingetInstall "Git.Git" "Git for Windows (Claude Code needs it)" } else { Say "Git: already installed" }

$py = $null
foreach ($c in @("py -3.12", "py -3", "python")) {
  try { $v = & cmd /c "$c --version 2>&1"; if ($v -match "Python 3\.(1[0-9])") { $py = $c; break } } catch {}
}
if (-not $py) { WingetInstall "Python.Python.3.12" "Python 3.12"; $py = "py -3.12"
  if (-not (Have "py")) { $py = (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe") } }
else { Say "Python: already installed ($py)" }

if (-not (Test-Path "C:\Program Files\Tesseract-OCR\tesseract.exe") -and -not (Have "tesseract")) {
  WingetInstall "UB-Mannheim.TesseractOCR" "Tesseract (reads scanned pages and photos)"
} else { Say "Tesseract: already installed" }

if (-not (Test-Path "C:\Program Files\LibreOffice\program\soffice.exe")) {
  WingetInstall "TheDocumentFoundation.LibreOffice" "LibreOffice (converts Word files so they can be redacted)"
} else { Say "LibreOffice: already installed" }

$claude = Join-Path $Home_ ".local\bin\claude.exe"
if (-not (Test-Path $claude) -and -not (Have "claude")) {
  Say "Installing Claude Code"
  try { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression } catch { Write-Host $_ -ForegroundColor Yellow }
  RefreshPath
} else { Say "Claude Code: already installed" }

# ---- 2. the app ----
New-Item -ItemType Directory -Force -Path $SA, (Join-Path $SA "template"), (Join-Path $SA "reference") | Out-Null
if (Test-Path (Join-Path $App ".git")) {
  Say "Updating the app"
  git -C $App pull --ff-only | Out-Host
} else {
  Say "Downloading the app"
  if (Test-Path $App) { Remove-Item -Recurse -Force $App }
  git clone --depth 1 $Repo $App | Out-Host
}
$DA = Join-Path $App "desktop-auditor"
if (-not (Test-Path $DA)) { Write-Host "Download failed. Check the internet connection and run this again." -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }

Say "Setting up the app (a few minutes the first time)"
Push-Location $DA
if (-not (Test-Path ".venv\Scripts\python.exe")) { & cmd /c "$py -m venv .venv" }
& .\.venv\Scripts\python.exe -m pip install -q --upgrade pip
& .\.venv\Scripts\pip.exe install -q -r requirements.txt
& .\.venv\Scripts\python.exe -c "import spacy; spacy.load('en_core_web_sm')" 2>$null
if ($LASTEXITCODE -ne 0) { & .\.venv\Scripts\python.exe -m spacy download en_core_web_sm -q }
Pop-Location

# ---- 3. shortcuts: desktop, and start with Windows (runs quietly in the background) ----
Say "Adding shortcuts"
$ws = New-Object -ComObject WScript.Shell
$pyw = Join-Path $DA ".venv\Scripts\pythonw.exe"
$startup = [Environment]::GetFolderPath("Startup")
$s = $ws.CreateShortcut((Join-Path $startup "Support Audit server.lnk"))
$s.TargetPath = $pyw; $s.Arguments = "server.py"; $s.WorkingDirectory = $DA; $s.WindowStyle = 7; $s.Save()
$desk = [Environment]::GetFolderPath("Desktop")
$u = $ws.CreateShortcut((Join-Path $desk "Support Audit.lnk"))
$u.TargetPath = Join-Path $DA "Support Audit (Windows).bat"; $u.WorkingDirectory = $DA; $u.WindowStyle = 7; $u.Save()
$f = $ws.CreateShortcut((Join-Path $desk "Support Audit files.lnk"))
$f.TargetPath = $SA; $f.Save()

# ---- 4. start it ----
Say "Starting Support Audit"
$up = $false
try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/api/state -TimeoutSec 2 | Out-Null; $up = $true } catch {}
if (-not $up) {
  Start-Process -FilePath $pyw -ArgumentList "server.py" -WorkingDirectory $DA -WindowStyle Hidden
  for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Milliseconds 500
    try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/api/state -TimeoutSec 2 | Out-Null; $up = $true; break } catch {} }
}
Start-Process "http://127.0.0.1:8765"
Start-Process explorer.exe $SA

# ---- 5. Claude login, once ----
RefreshPath
$c = if (Test-Path $claude) { $claude } else { "claude" }
$status = & $c auth status --json 2>$null | Out-String
if ($status -notmatch '"loggedIn":\s*true') {
  Say "Last step: log in to Claude (a browser window opens; sign in, then come back here)"
  & $c auth login
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "Drop the blank form in:      $SA\template"
Write-Host "Drop your reference files in: $SA\reference"
Write-Host "Open the app any time from the 'Support Audit' icon on your desktop, or http://127.0.0.1:8765"
Read-Host "Press Enter to close"
