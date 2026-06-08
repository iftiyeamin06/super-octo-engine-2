# Persistent API runner - hot-reloads on file changes
$root = Resolve-Path "$PSScriptRoot\.."

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Starting CentralAuth API with hot reload..." -ForegroundColor Cyan
dotnet watch run --project "$root\Central_auth_api" --urls "http://127.0.0.1:5089"
