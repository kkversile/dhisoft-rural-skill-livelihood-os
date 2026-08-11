Set-Location "$PSScriptRoot\..\.."
npm run verify
Invoke-WebRequest http://localhost:7006/health -UseBasicParsing | Out-Null
Invoke-WebRequest http://localhost:7000/login -UseBasicParsing | Out-Null
Write-Host "Verified backend health at http://localhost:7006/health and frontend at http://localhost:7000/login"
