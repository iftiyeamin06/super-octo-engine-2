@echo off
setlocal enabledelayedexpansion
:: CentralAuth - Start frontend + backend together

set ROOT=%~dp0..
set API=%ROOT%\Central_auth_api
set UI=%ROOT%\Central_auth

echo.
echo  [CentralAuth] Cleaning up existing instances...
echo.

taskkill /FI "WINDOWTITLE eq CentralAuth API :5089" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq CentralAuth UI :5173"  /T /F >nul 2>&1

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5089 " ^| findstr "LISTENING"') do (
    echo  Killing PID %%p on port 5089...
    taskkill /PID %%p /T /F >nul 2>&1
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo  Killing PID %%p on port 5173...
    taskkill /PID %%p /T /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo  [CentralAuth] Starting API and Frontend...
echo.

start "CentralAuth API :5089" cmd /k "title CentralAuth API :5089 && dotnet watch run --project "%API%" --urls http://127.0.0.1:5089"

echo  Waiting for API to be ready...
set READY=0
for /l %%w in (1,1,20) do (
    if !READY!==0 (
        timeout /t 1 /nobreak >nul
        curl -s -o nul -w "%%{http_code}" http://127.0.0.1:5089/health 2>nul | find "200" >nul
        if not errorlevel 1 (
            set READY=1
            echo  API is UP!
        )
    )
)
if !READY!==0 echo  API did not respond in time - check the API window for errors.

start "CentralAuth UI :5173" cmd /k "title CentralAuth UI :5173 && cd /d "%UI%" && npm run dev"

echo  Waiting for Frontend to start (5s)...
timeout /t 5 /nobreak >nul

echo  Opening browser...
start "" http://localhost:5173

echo.
echo  +===========================================+
echo  ^|       CentralAuth is running             ^|
echo  ^|                                          ^|
echo  ^|  Frontend  -^>  http://localhost:5173     ^|
echo  ^|  API       -^>  http://127.0.0.1:5089    ^|
echo  ^|                                          ^|
echo  ^|  Login: admin@stockdb.local              ^|
echo  ^|  Pass:  Admin@123!                       ^|
echo  ^|                                          ^|
echo  ^|  Run stop-all.cmd to stop both           ^|
echo  +===========================================+
echo.
pause
