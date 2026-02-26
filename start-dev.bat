@echo off
echo ===================================================
echo   🚀 SwiftLogistics Development Environment
echo ===================================================
echo.

:: 1. Start RabbitMQ (Docker)
echo [1/12] Starting RabbitMQ...
docker-compose up -d
timeout /t 5 >nul

:: 2. Start Mock Services
echo [2/12] Starting Mock ROS (Port 4002)...
start "Mock ROS" cmd /k "cd mock-services/mock-ros && npm run dev"

echo [3/12] Starting Mock CMS (Port 4000)...
start "Mock CMS" cmd /k "cd mock-services/mock-cms && npm run dev"

echo [4/12] Starting Mock WMS (Port 4001)...
start "Mock WMS" cmd /k "cd mock-services/mock-wms && npm run dev"

:: 3. Start Adapters
echo [5/12] Starting REST Adapter (Port 3001)...
start "REST Adapter" cmd /k "cd adapters/rest-adapter && npm start"

echo [6/12] Starting SOAP Adapter (Port 3002)...
start "SOAP Adapter" cmd /k "cd adapters/soap-adapter && npm start"

echo [7/12] Starting TCP Adapter (Port 3003)...
start "TCP Adapter" cmd /k "cd adapters/tcp-adapter && npm start"

:: 4. Start Workers
echo [8/12] Starting ROS Worker...
start "ROS Worker" cmd /k "cd workers/ros-worker && npm start"

echo [9/12] Starting CMS Worker...
start "CMS Worker" cmd /k "cd workers/cms-worker && npm start"

echo [10/12] Starting WMS Worker...
start "WMS Worker" cmd /k "cd workers/wms-worker && npm start"

:: 5. Start Core Services
echo [11/12] Starting Order Service (Port 4004)...
start "Order Service" cmd /k "cd order-service && node index.js"

echo [12/12] Starting Socket Service (Port 3005)...
start "Socket Service" cmd /k "cd socket-service && node index.js"

echo [13/12] Starting API Gateway (Port 5000)...
start "API Gateway" cmd /k "cd api-gateway && npm run dev"

echo [14/12] Starting Frontend (Port 5173)...
start "Frontend" cmd /k "cd client-app && npm run dev"

echo.
echo ✅ All services started!
echo 📊 Dashboard: http:// localhost:5173
echo.
pause
