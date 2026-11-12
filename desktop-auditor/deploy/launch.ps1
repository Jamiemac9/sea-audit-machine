# Opens Support Audit: gets any updates (restarting the app if there were some), starts it if
# it isn't running, then opens the page. The desktop icon runs this; it is read in full before
# it runs, so updating it while it runs is safe.
$ErrorActionPreference = "Continue"
$DA = Split-Path -Parent $PSScriptRoot
$SA = Join-Path $env:USERPROFILE "SupportAudit"
New-Item -ItemType Directory -Force -Path $SA | Out-Null
Set-Location $DA
$py = Join-Path $DA ".venv\Scripts\python.exe"
$pyw = Join-Path $DA ".venv\Scripts\pythonw.exe"
function Up { try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/api/state -TimeoutSec 3 | Out-Null; $true } catch { $false } }

if (-not (Test-Path $py)) { Write-Host "Not set up yet: run the installer from your Downloads folder."; Read-Host "Press Enter"; exit 1 }

$old = (& git -C .. rev-parse HEAD 2>$null)
& git -C .. pull -q --ff-only 2>$null
$new = (& git -C .. rev-parse HEAD 2>$null)
if ($old -and $new -and $old -ne $new) {
  Write-Host "Updating Support Audit..."
  Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" |
    Where-Object { $_.CommandLine -like '*server.py*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
  & $py -m pip install -q -r requirements.txt
}
if (-not (Up)) {
  Start-Process -FilePath $pyw -ArgumentList "server.py" -WorkingDirectory $DA -WindowStyle Hidden
  for ($i = 0; $i -lt 40 -and -not (Up); $i++) { Start-Sleep -Milliseconds 500 }
}
if (Up) { Start-Process "http://127.0.0.1:8765" }
else {
  Write-Host "Support Audit did not start. Opening its log so you can send it to Claude."
  Start-Process notepad (Join-Path $SA "server.log"); Read-Host "Press Enter"
}
