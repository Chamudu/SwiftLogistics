# SwiftLogistics — Setup Guide

A complete guide to get the project running from scratch.

---

## 📋 Prerequisites

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 18+ | https://nodejs.org/ |
| npm | 9+ | Comes with Node.js |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop/ |
| Git | Latest | https://git-scm.com/ |

### Verify Installation

```bash
node --version    # Should be v18.x.x or higher
npm --version     # Should be 9.x.x or higher
docker --version  # Should be 20.x or higher
git --version     # Any version
```

---

## 🚀 Step-by-Step Setup

### Step 1: Start Docker Infrastructure

This starts PostgreSQL, RabbitMQ, and pgAdmin:

```bash
docker-compose up -d
```

Wait ~30 seconds for everything to be ready, then verify:

```bash
docker ps
```

You should see 3 containers running:
- `swiftlogistics-postgres` — Database (port 5432)
- `swiftlogistics-rabbitmq` — Message broker (port 5672 + UI at 15672)
- `swiftlogistics-pgadmin` — Database UI (port 5050)

### Step 2: Install Dependencies

```bash
# Shared database module
cd shared/database && npm install && cd ../..

# Core services
cd auth-service && npm install && cd ..
cd order-service && npm install && cd ..
cd api-gateway && npm install && cd ..
cd client-app && npm install && cd ..

# Mock services
cd mock-services/mock-ros && npm install && cd ../..
cd mock-services/mock-cms && npm install && cd ../..
cd mock-services/mock-wms && npm install && cd ../..

# Adapters
cd adapters/rest-adapter && npm install && cd ../..
cd adapters/soap-adapter && npm install && cd ../..
cd adapters/tcp-adapter && npm install && cd ../..

# Workers
cd workers/ros-worker && npm install && cd ../..
cd workers/cms-worker && npm install && cd ../..
cd workers/wms-worker && npm install && cd ../..
```

### Step 3: Start Services

Open a separate terminal for each service. Start in this order:

**Layer 1 — Mock Backends:**
```bash
cd mock-services/mock-ros && npm run dev    # :4002
cd mock-services/mock-cms && npm run dev    # :4000
cd mock-services/mock-wms && npm run dev    # :4001
```

**Layer 2 — Adapters:**
```bash
cd adapters/rest-adapter && node index.js   # :3001
cd adapters/soap-adapter && node index.js   # :3002
cd adapters/tcp-adapter && node index.js    # :3003
```

**Layer 3 — Workers:**
```bash
cd workers/ros-worker && node index.js
cd workers/cms-worker && node index.js
cd workers/wms-worker && node index.js
```

**Layer 4 — Core Services:**
```bash
cd auth-service && npm run dev              # :4005
cd order-service && node index.js           # :4004
cd api-gateway && npm run dev               # :5000
```

**Layer 5 — Frontend:**
```bash
cd client-app && npm run dev                # :5173
```

### Step 4: Access the Application

| What | URL | Credentials |
|------|-----|-------------|
| **React App** | http://localhost:5173 | Demo login on screen |
| **API Gateway** | http://localhost:5000 | — |
| **RabbitMQ UI** | http://localhost:15672 | admin / admin123 |
| **pgAdmin** | http://localhost:5050 | admin@swift.com / admin123 |

### Step 5: Test

```bash
node test-auth.js           # Auth service (14 tests)
node test-all-protocols.js  # All protocols (REST, SOAP, TCP)
node test-gateway.js        # API Gateway
```

---

## 🔌 Port Map

| Port | Service |
|------|---------|
| 3001 | REST Adapter |
| 3002 | SOAP Adapter |
| 3003 | TCP Adapter |
| 4000 | Mock CMS (SOAP) |
| 4001 | Mock WMS (TCP) |
| 4002 | Mock ROS (REST) |
| 4004 | Order Service (SAGA) |
| 4005 | Auth Service (JWT) |
| 5000 | API Gateway |
| 5050 | pgAdmin (DB UI) |
| 5173 | React Client |
| 5432 | PostgreSQL |
| 5672 | RabbitMQ (AMQP) |
| 15672 | RabbitMQ (UI) |

---

## ⚠️ Troubleshooting

### Docker won't start
```bash
# Make sure Docker Desktop is running first
docker-compose down -v   # Clean slate
docker-compose up -d     # Try again
```

### Port already in use
```bash
# Windows — find and kill process using the port
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

### Auth service can't connect to database
- Make sure PostgreSQL container is running: `docker ps`
- Check database logs: `docker logs swiftlogistics-postgres`
- Wait 10-15 seconds after starting Docker before starting services

### "Module not found" errors
```bash
cd <service-folder> && npm install
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Project overview |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and diagrams |
| [API.md](./API.md) | Complete API reference |
| [DOCKER.md](./DOCKER.md) | Docker commands and setup |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Full deployment guide |
