# Stops the Support Audit background server (used before an update, so the new version starts).
Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" |
  Where-Object { $_.CommandLine -like '*server.py*' -and $_.CommandLine -notlike '*pip*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
