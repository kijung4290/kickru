$ErrorActionPreference = "SilentlyContinue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Url = "http://localhost:3300/"

function Test-ServerReady {
  try {
    $resp = Invoke-WebRequest -Uri ($Url + "version.json") -UseBasicParsing -TimeoutSec 1
    return ($resp.StatusCode -eq 200)
  } catch {
    return $false
  }
}

if (-not (Test-ServerReady)) {
  Start-Process -FilePath "node" -ArgumentList "`"$Root\server.js`"" -WorkingDirectory $Root -WindowStyle Hidden
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 200
    if (Test-ServerReady) { break }
  }
}

$BrowserCandidates = @(
  "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles (x86)\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$BrowserExe = $BrowserCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($BrowserExe) {
  $ProfileDir = Join-Path $env:LOCALAPPDATA "KickruEditionAppProfile"
  Start-Process -FilePath $BrowserExe -ArgumentList @(
    "--app=$Url",
    "--user-data-dir=`"$ProfileDir`"",
    "--window-size=1100,820"
  )
} else {
  Start-Process $Url
}
