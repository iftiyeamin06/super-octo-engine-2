@echo off
:: ============================================================
:: CentralAuth — Stop frontend + backend
:: ============================================================

echo.
echo  [CentralAuth] Stopping all services...
echo.

:: ── Close console windows by title ────────────────────────────
taskkill /FI "WINDOWTITLE eq CentralAuth API :5050" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CentralAuth UI :5173"  /T /F >nul 2>&1

:: ── Kill dotnet processes running the API ─────────────────────
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq dotnet.exe" /FO CSV /NH 2^>nul') do (
    wmic process where "ProcessId=%%~i" get CommandLine 2>nul | find "Central_auth_api" >nul
    if not errorlevel 1 (
        echo  Stopping API process PID %%~i ...
        taskkill /PID %%~i /T /F >nul 2>&1
    )
)

:: ── Kill node processes running Vite / frontend ───────────────
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH 2^>nul') do (
    wmic process where "ProcessId=%%~i" get CommandLine 2>nul | find "Central_auth" >nul
    if not errorlevel 1 (
        echo  Stopping Frontend process PID %%~i ...
        taskkill /PID %%~i /T /F >nul 2>&1
    )
)

echo.
echo  +===========================================+
echo  ^|       CentralAuth stopped                ^|
echo  ^|                                          ^|
echo  ^|  Frontend  -^>  http://localhost:5173 OFF ^|
echo  ^|  API       -^>  http://localhost:5050 OFF ^|
echo  +===========================================+
echo.
pause
