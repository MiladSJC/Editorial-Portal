@echo off
REM ===== Content Portal - Start Server =====
setlocal

REM --- Settings ---
set "PROJECT_DIR=C:\Users\milad.moradi\Desktop\Content Portal"
set "ENV_NAME=content-portal"
set "PORT=8000"

title Content Portal - Uvicorn (%ENV_NAME%)

REM --- Initialize conda (ensures conda command is available) ---
CALL "%USERPROFILE%\anaconda3\Scripts\activate.bat"

REM --- Activate conda env ---
CALL conda activate "%ENV_NAME%"
IF ERRORLEVEL 1 (
  echo [!] Could not activate conda env "%ENV_NAME%".
  echo     Make sure Anaconda is installed and environment exists.
  pause
  exit /b 1
)

REM --- Go to project folder ---
cd /D "%PROJECT_DIR%" || (
  echo [!] Project folder not found: %PROJECT_DIR%
  pause
  exit /b 1
)

REM --- Quick sanity check ---
IF NOT EXIST "server.py" (
  echo [!] server.py not found in %PROJECT_DIR%
  pause
  exit /b 1
)

REM --- Show available frontends ---
echo.
echo ================================================
echo   Content Portal Server
echo ================================================
echo.
echo Available frontends:
echo.
IF EXIST "home.html" (
  echo   [Launcher]      http://127.0.0.1:%PORT%/
)

IF EXIST "crossword.html" (
  echo   [Crossword]     http://127.0.0.1:%PORT%/crossword.html
)

IF EXIST "horoscope.html" (
  echo   [Horoscope]     http://127.0.0.1:%PORT%/horoscope.html
)

echo.
echo ================================================
echo.

REM --- Launch server ---
echo [+] Starting Uvicorn on http://127.0.0.1:%PORT%
echo [+] Server will start in 2 seconds...
echo.
echo     Press CTRL+C to stop the server.
echo.
timeout /t 2 /nobreak >nul

REM --- Automatically open the browser ---
start http://127.0.0.1:%PORT%/

python -m uvicorn server:app --reload --port %PORT%

endlocal