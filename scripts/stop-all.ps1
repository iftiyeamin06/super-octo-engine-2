# ============================================================
# CentralAuth — Stop frontend + backend
# ============================================================

function Write-Status($msg, $color = "Cyan") {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color
}

$stopped = 0

# ── Stop API (dotnet running Central_auth_api) ─────────────────
$apiProcs = Get-WmiObject Win32_Process |
    Where-Object { $_.Name -match "dotnet|CentralAuth" -and $_.CommandLine -match "Central_auth_api|CentralAuth.Api" }

if ($apiProcs) {
    foreach ($p in $apiProcs) {
        Write-Status "Stopping API  (PID $($p.ProcessId))..." "Yellow"
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $stopped++
    }
    Write-Status "API stopped." "Green"
} else {
    Write-Status "API is not running." "Gray"
}

# ── Stop Frontend (node/vite running Central_auth) ────────────
$uiProcs = Get-WmiObject Win32_Process |
    Where-Object { $_.Name -match "node" -and $_.CommandLine -match "Central_auth|vite" }

if ($uiProcs) {
    foreach ($p in $uiProcs) {
        Write-Status "Stopping Frontend  (PID $($p.ProcessId))..." "Yellow"
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        $stopped++
    }
    Write-Status "Frontend stopped." "Green"
} else {
    Write-Status "Frontend is not running." "Gray"
}

# ── Also close the console windows by title ───────────────────
$titles = @("CentralAuth API :5050", "CentralAuth UI :5173")
foreach ($title in $titles) {
    $wnd = Get-Process | Where-Object { $_.MainWindowTitle -eq $title } -ErrorAction SilentlyContinue
    if ($wnd) { $wnd | Stop-Process -Force -ErrorAction SilentlyContinue }
}

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
if ($stopped -gt 0) {
    Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "  ║       CentralAuth stopped ($stopped process$(if($stopped -ne 1){'es'} else {''}))       ║" -ForegroundColor Red
    Write-Host "  ║  Frontend  →  http://localhost:5173  OFF ║" -ForegroundColor Red
    Write-Host "  ║  API       →  http://localhost:5050  OFF ║" -ForegroundColor Red
    Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor Red
} else {
    Write-Host "  Nothing was running." -ForegroundColor Gray
}
Write-Host ""
