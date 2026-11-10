@echo off
title Khoi dong toan bo he thong SOA (Bai TH 4)
echo ===================================================
echo     DANG KHOI DONG TOAN BO 3 DICH VU (SOA)
echo ===================================================

echo [1/3] Dang khoi dong Auth Service (Port 3000)...
start "Auth Service (Port 3000)" cmd /k "set NODE_PATH=%~dp0product-service\node_modules && node %~dp0dist\main.js"

timeout /t 3 /nobreak >nul

echo [2/3] Dang khoi dong Product Service (Port 3001)...
start "Product Service (Port 3001)" cmd /k "cd /d %~dp0product-service && npm run start"

timeout /t 3 /nobreak >nul

echo [3/3] Dang khoi dong Order Service (Port 3002)...
start "Order Service (Port 3002)" cmd /k "cd /d %~dp0order-service && npm run start"

echo.
echo ===================================================
echo   TAT CA 3 DICH VU DA DUOC KHOI DONG THANH CONG!
echo   - Auth Service:    http://localhost:3000
echo   - Product Service: http://localhost:3001
echo   - Order Service:   http://localhost:3002
echo ===================================================
pause
