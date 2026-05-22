# ============================================================
# CentralAuth — Start frontend + backend together
# ============================================================

$root = "E:\Wold\super-octo-engine-2"
$api  = "$root\Central_auth_api"
$ui   = "$root\Central_auth"

function Write-Status($msg, $color = "Cyan") {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color
}

# ── Kill existing titled windows ───────────────────────────────
Write-Status "Stopping any running CentralAuth instances..." "Yellow"
@("CentralAuth API :5050", "CentralAuth UI :5173") | ForEach-Object {
    $proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $_ } -ErrorAction SilentlyContinue
    if ($proc) { $proc | Stop-Process -Force -ErrorAction SilentlyContinue }
}

# ── Kill leftover dotnet / node processes by CommandLine ───────
Get-WmiObject Win32_Process |
    Where-Object { $_.Name -match "dotnet" -and $_.CommandLine -match "Central_auth_api" } |
    ForEach-Object {
        Write-Status "  Killing old API  (PID $($_.ProcessId))" "DarkYellow"
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
Get-WmiObject Win32_Process |
    Where-Object { $_.Name -match "node" -and $_.CommandLine -match "Central_auth|vite" } |
    ForEach-Object {
        Write-Status "  Killing old Frontend  (PID $($_.ProcessId))" "DarkYellow"
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
Start-Sleep -Seconds 1

# ── Kill whatever is still holding port 5050 or 5173 ──────────
foreach ($port in @(5050, 5173)) {
    $conn = netstat -ano | Select-String ":$port\s.*LISTENING"
    if ($conn) {
        $pid_ = ($conn -split '\s+')[-1]
        if ($pid_ -match '^\d+$' -and $pid_ -ne '0') {
            Write-Status "  Killing PID $pid_ on port $port" "DarkYellow"
            Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
        }
    }
}
Start-Sleep -Seconds 1

# ── Start API in its own titled window ────────────────────────
Write-Status "Starting API on http://localhost:5050 ..."
$apiProc = Start-Process -FilePath "cmd" `
    -ArgumentList "/k title CentralAuth API :5050 && dotnet run --project `"$api`" --urls http://localhost:5050 --no-build" `
    -WindowStyle Normal `
    -PassThru
Write-Status "API window opened  (PID $($apiProc.Id))" "Green"

# ── Poll until API responds ────────────────────────────────────
Write-Status "Waiting for API to be ready (up to 20s)..."
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    try {
        $null = Invoke-RestMethod "http://localhost:5050/health" -TimeoutSec 2
        $ready = $true
        break
    } catch {}
}

if ($ready) {
    Write-Status "API is UP!" "Green"
} else {
    Write-Status "API did not respond in time — check the API window for errors." "Red"
}

# ── Start Frontend in its own titled window ───────────────────
Write-Status "Starting Frontend on http://localhost:5173 ..."
$uiProc = Start-Process -FilePath "cmd" `
    -ArgumentList "/k title CentralAuth UI :5173 && cd /d `"$ui`" && npm run dev" `
    -WindowStyle Normal `
    -PassThru
Write-Status "Frontend window opened  (PID $($uiProc.Id))" "Green"

# ── Wait for Vite to bind the port ────────────────────────────
Write-Status "Waiting for Frontend to start (5s)..."
Start-Sleep -Seconds 5

# ── Open browser ──────────────────────────────────────────────
Write-Status "Opening browser at http://localhost:5173 ..." "Magenta"
Start-Process "http://localhost:5173"

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║       CentralAuth is running             ║" -ForegroundColor Magenta
Write-Host "  ║                                          ║" -ForegroundColor Magenta
Write-Host "  ║  Frontend  →  http://localhost:5173      ║" -ForegroundColor Magenta
Write-Host "  ║  API       →  http://localhost:5050      ║" -ForegroundColor Magenta
Write-Host "  ║                                          ║" -ForegroundColor Magenta
Write-Host "  ║  Login: admin@stockdb.local              ║" -ForegroundColor Magenta
Write-Host "  ║  Pass:  Admin@123!                       ║" -ForegroundColor Magenta
Write-Host "  ║                                          ║" -ForegroundColor Magenta
Write-Host "  ║  Run stop-all.ps1 to stop both           ║" -ForegroundColor Magenta
Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Two service windows are open:" -ForegroundColor Gray
Write-Host "    - ""CentralAuth API :5050""" -ForegroundColor Gray
Write-Host "    - ""CentralAuth UI :5173""" -ForegroundColor Gray
Write-Host "  Close those windows or run stop-all.ps1 to stop services." -ForegroundColor Gray
Write-Host ""
