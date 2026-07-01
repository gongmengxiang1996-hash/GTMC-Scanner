$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\GTMC-Restart.lnk")
$Shortcut.TargetPath = "d:\GTMC_User_Profiles\mengxiang_gong\Documents\trae_projects\test\restart.bat"
$Shortcut.WorkingDirectory = "d:\GTMC_User_Profiles\mengxiang_gong\Documents\trae_projects\test"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Host "Shortcut created successfully"
