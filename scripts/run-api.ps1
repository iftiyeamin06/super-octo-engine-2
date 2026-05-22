# Persistent API runner — restarts on crash
while ($true) {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting CentralAuth API..." -ForegroundColor Cyan
    & dotnet run --project "E:\Wold\super-octo-engine-2\Central_auth_api" --urls "http://localhost:5050" --no-build
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] API exited, restarting in 3s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
