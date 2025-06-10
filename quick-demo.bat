@echo off
echo.
echo ===============================================
echo 🚀 BLOCMERCE - RECRUITMENT DEMO SETUP
echo ===============================================
echo.
echo This script will:
echo 1. Start the backend server with sample data
echo 2. Launch the frontend application  
echo 3. Open browser tabs for easy demo
echo.
echo ⚠️  Make sure MongoDB is running first!
echo.
pause

echo.
echo 📦 Adding sample demo data...
node scripts/setup-demo.js
timeout /t 2 /nobreak > nul

echo.
echo 🔥 Starting Backend Server...
start "Blocmerce Backend" cmd /k "node server.js"
timeout /t 5 /nobreak > nul

echo.
echo 🎨 Starting Frontend Application...
start "Blocmerce Frontend" cmd /k "cd frontend && npm start"
timeout /t 10 /nobreak > nul

echo.
echo 🌐 Opening demo pages...
timeout /t 15 /nobreak > nul
start http://localhost:3000
start http://localhost:3000/products
start http://localhost:3000/nft
start http://localhost:5000

echo.
echo ✅ DEMO READY!
echo ===============================================
echo 🏠 Frontend: http://localhost:3000
echo 🔧 Backend:  http://localhost:5000  
echo 🎨 NFT:      http://localhost:3000/nft
echo 🛒 Shop:     http://localhost:3000/products
echo ===============================================
echo.
echo 📸 READY FOR SCREENSHOTS & VIDEO RECORDING!
echo.
echo Tips for great demo:
echo - Show homepage with products
echo - Demonstrate shopping cart
echo - Show NFT marketplace
echo - Display admin dashboard
echo - Connect MetaMask wallet
echo.
pause 