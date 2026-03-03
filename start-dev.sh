#!/bin/bash

echo "🚀 SwiftLogistics Development Environment"
echo "==========================================="

# ─────────────────────────────────────────────
# LAYER 0 — Install dependencies (first run)
# ─────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
    echo "[SETUP] node_modules not found — running npm install for all workspaces..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed. Please check your Node.js installation."
        exit 1
    fi
    echo "[SETUP] Workspace dependencies installed successfully."
    echo ""
fi

if [ ! -d "client-app/node_modules" ]; then
    echo "[SETUP] client-app node_modules not found — running npm install for frontend..."
    cd client-app
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] client-app npm install failed."
        exit 1
    fi
    cd ..
    echo "[SETUP] Frontend dependencies installed successfully."
    echo ""
fi

# Function to open a new terminal tab/window based on OS
open_terminal() {
    local title="$1"
    local command="$2"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: Use AppleScript to open Terminal tabs
        osascript -e "tell application \"Terminal\" to do script \"echo '$title'; $command\""
    else
        # Linux: Try common terminal emulators
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal --tab --title="$title" -- bash -c "echo '$title'; $command; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -T "$title" -e "echo '$title'; $command; exec bash" &
        else
            echo "⚠️  Running '$title' in background."
            eval "$command" &
        fi
    fi
}

# ─────────────────────────────────────────────
# LAYER 0 — Infrastructure (Docker)
# ─────────────────────────────────────────────
echo "[1/15] Starting Docker containers (RabbitMQ + PostgreSQL + pgAdmin)..."
docker compose up -d
sleep 8

# ─────────────────────────────────────────────
# LAYER 1 — Mock External Services
# ─────────────────────────────────────────────
echo "[2/15] Starting Mock ROS (Port 4002)..."
open_terminal "Mock ROS" "cd mock-services/mock-ros && npm run dev"

echo "[3/15] Starting Mock CMS (Port 4000)..."
open_terminal "Mock CMS" "cd mock-services/mock-cms && npm run dev"

echo "[4/15] Starting Mock WMS (Port 4001)..."
open_terminal "Mock WMS" "cd mock-services/mock-wms && npm run dev"

# ─────────────────────────────────────────────
# LAYER 2 — Protocol Adapters
# ─────────────────────────────────────────────
echo "[5/15] Starting REST Adapter (Port 3001)..."
open_terminal "REST Adapter" "cd adapters/rest-adapter && npm start"

echo "[6/15] Starting SOAP Adapter (Port 3002)..."
open_terminal "SOAP Adapter" "cd adapters/soap-adapter && npm start"

echo "[7/15] Starting TCP Adapter (Port 3003)..."
open_terminal "TCP Adapter" "cd adapters/tcp-adapter && npm start"

# Wait for mocks to fully start their servers before workers try to connect
sleep 5

# ─────────────────────────────────────────────
# LAYER 3 — Message Workers
# ─────────────────────────────────────────────
echo "[8/15] Starting ROS Worker..."
open_terminal "ROS Worker" "cd workers/ros-worker && npm start"

echo "[9/15] Starting CMS Worker..."
open_terminal "CMS Worker" "cd workers/cms-worker && npm start"

echo "[10/15] Starting WMS Worker..."
open_terminal "WMS Worker" "cd workers/wms-worker && npm start"

# ─────────────────────────────────────────────
# LAYER 4 — Core Services
# ─────────────────────────────────────────────
echo "[11/15] Starting Auth Service (Port 4005)..."
open_terminal "Auth Service" "cd auth-service && node index.js"

echo "[12/15] Starting Order Service (Port 4004)..."
open_terminal "Order Service" "cd order-service && node index.js"

echo "[13/15] Starting WebSocket Service (Port 4006)..."
open_terminal "WebSocket Service" "cd websocket-service && node index.js"

# Wait for auth service to initialize before starting gateway
sleep 3

# ─────────────────────────────────────────────
# LAYER 5 — API Gateway + Frontend
# ─────────────────────────────────────────────
echo "[14/15] Starting API Gateway (Port 5000)..."
open_terminal "API Gateway" "cd api-gateway && node index.js"

echo "[15/15] Starting Frontend (Port 5173)..."
open_terminal "Frontend" "cd client-app && npm run dev"

echo ""
echo "==================================================="
echo "   All 15 services started!"
echo "==================================================="
echo ""
echo "   Frontend:     http://localhost:5173"
echo "   API Gateway:  http://localhost:5000"
echo "   Metrics:      http://localhost:5000/metrics"
echo "   Health:       http://localhost:5000/health"
echo "   RabbitMQ:     http://localhost:15672  (guest/guest)"
echo "   pgAdmin:      http://localhost:5050   (admin@swift.com/admin)"
echo ""
echo "   Close this window to keep services running"
echo "   To stop all: close each terminal window"
echo ""
read -p "Press Enter to exit..."
echo ""
echo "  🖥️  Frontend:     http://localhost:5173"
echo "  🔗  API Gateway:  http://localhost:5000"
echo "  📊  Metrics:      http://localhost:5000/metrics"
echo "  🩺  Health:       http://localhost:5000/health"
echo "  🐰  RabbitMQ:     http://localhost:15672  (guest/guest)"
echo "  🐘  pgAdmin:      http://localhost:5050   (admin@swift.com/admin)"
echo ""
