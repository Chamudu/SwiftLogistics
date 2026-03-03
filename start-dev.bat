@echo off
echo ===================================================
echo   🚀 SwiftLogistics Development Environment
echo ===================================================
echo.

:: ─────────────────────────────────────────────
:: LAYER 0 — Install dependencies (first run)
:: ─────────────────────────────────────────────
if not exist "node_modules" (
    echo [SETUP] node_modules not found — running npm install for all workspaces...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Please check your Node.js installation.
        pause
        exit /b 1
    )
    echo [SETUP] Workspace dependencies installed successfully.
    echo.
)

if not exist "client-app\node_modules" (
    echo [SETUP] client-app node_modules not found — running npm install for frontend...
    cd client-app
    npm install
    if errorlevel 1 (
        echo [ERROR] client-app npm install failed.
        pause
        exit /b 1
    )
    cd ..
    echo [SETUP] Frontend dependencies installed successfully.
    echo.
)

:: ─────────────────────────────────────────────
:: LAYER 0 — Infrastructure (Docker)
:: ─────────────────────────────────────────────
echo [1/15] Starting Docker containers (RabbitMQ + PostgreSQL + pgAdmin)...
docker compose up -d
timeout /t 8 >nul

:: ─────────────────────────────────────────────
:: LAYER 1 — Mock External Services
:: ─────────────────────────────────────────────
echo [2/15] Starting Mock ROS (Port 4002)...
start "Mock ROS" cmd /k "cd mock-services/mock-ros && npm run dev"

echo [3/15] Starting Mock CMS (Port 4000)...
start "Mock CMS" cmd /k "cd mock-services/mock-cms && npm run dev"

echo [4/15] Starting Mock WMS (Port 4001)...
start "Mock WMS" cmd /k "cd mock-services/mock-wms && npm run dev"

:: ─────────────────────────────────────────────
:: LAYER 2 — Protocol Adapters
:: ─────────────────────────────────────────────
echo [5/15] Starting REST Adapter (Port 3001)...
start "REST Adapter" cmd /k "cd adapters/rest-adapter && npm start"

echo [6/15] Starting SOAP Adapter (Port 3002)...
start "SOAP Adapter" cmd /k "cd adapters/soap-adapter && npm start"

echo [7/15] Starting TCP Adapter (Port 3003)...
start "TCP Adapter" cmd /k "cd adapters/tcp-adapter && npm start"

:: Wait for mocks to fully start their servers before workers try to connect
timeout /t 5 >nul

:: ─────────────────────────────────────────────
:: LAYER 3 — Message Workers
:: ─────────────────────────────────────────────
echo [8/15] Starting ROS Worker...
start "ROS Worker" cmd /k "cd workers/ros-worker && npm start"

echo [9/15] Starting CMS Worker...
start "CMS Worker" cmd /k "cd workers/cms-worker && npm start"

echo [10/15] Starting WMS Worker...
start "WMS Worker" cmd /k "cd workers/wms-worker && npm start"

:: ─────────────────────────────────────────────
:: LAYER 4 — Core Services
:: ─────────────────────────────────────────────
echo [11/15] Starting Auth Service (Port 4005)...
start "Auth Service" cmd /k "cd auth-service && node index.js"

echo [12/15] Starting Order Service (Port 4004)...
start "Order Service" cmd /k "cd order-service && node index.js"

echo [13/15] Starting WebSocket Service (Port 4006)...
start "WebSocket Service" cmd /k "cd websocket-service && node index.js"

:: ─────────────────────────────────────────────
:: LAYER 5 — API Gateway + Frontend
:: ─────────────────────────────────────────────
:: Wait for auth service to initialize before starting gateway
timeout /t 3 >nul

echo [14/15] Starting API Gateway (Port 5000)...
start "API Gateway" cmd /k "cd api-gateway && node index.js"

echo [15/15] Starting Frontend (Port 5173)...
start "Frontend" cmd /k "cd client-app && npm run dev"

echo.
echo ===================================================
echo    All 15 services started!
echo ===================================================
echo.
echo    Frontend:     http://localhost:5173
echo    API Gateway:  http://localhost:5000
echo    Metrics:      http://localhost:5000/metrics
echo    Health:       http://localhost:5000/health
echo    RabbitMQ:     http://localhost:15672  (guest/guest)
echo    pgAdmin:      http://localhost:5050   (admin@swift.com/admin)
echo.
echo    Close this window to keep services running
echo    To stop all: close each terminal window
echo.
pause
