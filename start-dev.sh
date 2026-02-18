#!/bin/bash

echo "🚀 SwiftLogistics Development Environment"
echo "======================================="

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
            echo "⚠️  Could not detect gnome-terminal or xterm. Running '$title' in background."
            eval "$command" &
        fi
    fi
}

echo "[1/12] Starting RabbitMQ..."
docker-compose up -d
sleep 5

# Mock Services
open_terminal "Mock ROS" "cd mock-services/mock-ros && npm run dev"
open_terminal "Mock CMS" "cd mock-services/mock-cms && npm run dev"
open_terminal "Mock WMS" "cd mock-services/mock-wms && npm run dev"

# Adapters
open_terminal "REST Adapter" "cd adapters/rest-adapter && npm start"
open_terminal "SOAP Adapter" "cd adapters/soap-adapter && npm start"
open_terminal "TCP Adapter" "cd adapters/tcp-adapter && npm start"

# Workers
open_terminal "ROS Worker" "cd workers/ros-worker && npm start"
open_terminal "CMS Worker" "cd workers/cms-worker && npm start"
open_terminal "WMS Worker" "cd workers/wms-worker && npm start"

# Core Services
open_terminal "Order Service" "cd order-service && node index.js"
open_terminal "Socket Service" "cd socket-service && node index.js"
open_terminal "API Gateway" "cd api-gateway && npm run dev"
open_terminal "Frontend" "cd client-app && npm run dev"

echo ""
echo "✅ All services starting..."
echo "📊 Dashboard: http://localhost:5173"
