$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$VbsPath = Join-Path $Root "app-launcher.vbs"
$IconPath = Join-Path $Root "icons\app.ico"
$ShortcutName = "벤치에서 발롱까지 에디션.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$DesktopDir = [Environment]::GetFolderPath("Desktop")
$ProgramsDir = [Environment]::GetFolderPath("Programs")

foreach ($TargetDir in @($DesktopDir, $ProgramsDir)) {
  if ($TargetDir -and (Test-Path $TargetDir)) {
    $LnkPath = Join-Path $TargetDir $ShortcutName
    $Sc = $WshShell.CreateShortcut($LnkPath)
    $Sc.TargetPath = "$env:WINDIR\System32\wscript.exe"
    $Sc.Arguments = "//B `"$VbsPath`""
    $Sc.WorkingDirectory = $Root
    if (Test-Path $IconPath) { $Sc.IconLocation = "$IconPath,0" }
    $Sc.Description = "벤치에서 발롱까지 : 선수 · 감독 에디션 (단독 앱 실행)"
    $Sc.Save()
    Write-Output "Created shortcut: $LnkPath"
  }
}
