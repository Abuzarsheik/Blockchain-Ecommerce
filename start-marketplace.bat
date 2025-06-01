@echo off
title Blocmerce NFT Marketplace Launcher

echo.
echo ================================================
echo        🚀 BLOCMERCE NFT MARKETPLACE 🚀
echo ================================================
echo.
echo Starting optimized NFT marketplace...
echo - Backend API on port 5000
echo - Frontend UI on port 3000
echo - IPFS Fallback Storage (Zero Errors!)
echo.

REM Start backend in new window
echo 🔧 Starting backend server...
start "Blocmerce Backend" cmd /k "cd /d %~dp0backend && npm start"

REM Wait for backend to start
timeout /t 8 /nobreak > nul

REM Start frontend in new window  
echo ⚛️ Starting frontend server...
start "Blocmerce Frontend" cmd /k "cd /d %~dp0frontend && npm start"

REM Wait for frontend to start
timeout /t 15 /nobreak > nul

echo.
echo ✅ Marketplace is starting up!
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔗 Backend:  http://localhost:5000
echo.
echo 📖 Guides:
echo    - OPTIMIZATION_TESTING_GUIDE.md
echo    - IPFS_SOLUTION_GUIDE.md
echo.
echo ✨ Ready to test your optimized NFT marketplace!
echo.

REM Ask if user wants to open browser
set /p openBrowser="Open browser automatically? (y/n): "
if /i "%openBrowser%"=="y" (
    start http://localhost:3000
)

echo.
echo Press any key to exit launcher...
pause > nul 