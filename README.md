# SwiftLogistics — SwiftTrack Middleware Platform

A full-stack middleware architecture integrating heterogeneous systems (CMS, ROS, WMS) for logistics management, featuring JWT authentication, PostgreSQL persistence, and a React dashboard.

## 🎯 Project Overview

This project demonstrates a complete middleware solution:

- **Microservices Architecture** — 14+ independent services
- **Protocol Adapters** — REST, SOAP, and TCP/IP integration
- **Message Broker** — RabbitMQ for async communication
- **SAGA Pattern** — Distributed transaction orchestration
- **JWT Authentication** — Secure login with role-based access
- **PostgreSQL Database** — Persistent data storage
- **WebSocket** — Real-time order tracking via Socket.IO
- **React Dashboard** — Role-based UI with dark theme

## 📁 Project Structure

```
SwiftLogistics/
│
├── mock-services/               # Simulated backend systems
│   ├── mock-ros/               # REST API  (Route Optimization)  :4002
│   ├── mock-cms/               # SOAP API  (Client Management)   :4000
│   └── mock-wms/               # TCP API   (Warehouse Mgmt)      :4001
│
├── adapters/                    # Protocol translation layer
│   ├── rest-adapter/           # HTTP/JSON adapter               :3001
│   ├── soap-adapter/           # SOAP/XML adapter                :3002
│   └── tcp-adapter/            # TCP/Binary adapter              :3003
│
├── workers/                     # RabbitMQ message processors
│   ├── ros-worker/             # REST → RabbitMQ bridge
│   ├── cms-worker/             # SOAP → RabbitMQ bridge
│   └── wms-worker/             # TCP → RabbitMQ bridge
│
├── api-gateway/                 # Unified entry point             :5000
│   └── index.js                # Routing, JWT/API key auth, metrics
│
├── auth-service/                # JWT authentication              :4005
│   ├── index.js                # Login, register, refresh, logout
│   ├── jwt-utils.js            # Token generation & verification
│   ├── password-utils.js       # bcrypt hashing
│   ├── user-store.js           # PostgreSQL user queries
│   └── middleware.js           # requireAuth, requireRole
│
├── order-service/               # SAGA orchestrator               :4004
│   └── index.js                # Multi-step order creation + WS events
│
├── websocket-service/           # Real-time updates (Socket.IO)   :4006
│   └── index.js                # Rooms, REST bridge, notifications
│
├── shared/                      # Shared utilities
│   └── database/               # PostgreSQL connection pool
│       └── index.js            # Schema init, query helpers
│
├── client-app/                  # React frontend (Vite)           :5173
│   ├── src/
│   │   ├── pages/              # Login, Dashboard, Orders, etc.
│   │   ├── context/            # AuthContext (JWT state + WebSocket)
│   │   ├── services/           # API client, WebSocket client
│   │   └── components/         # Layout, Sidebar, etc.
│   └── ...
│
├── docker-compose.yml           # RabbitMQ + PostgreSQL + pgAdmin
├── test-auth.js                 # Auth service test suite
├── test-all-protocols.js        # Protocol integration tests
└── test-gateway.js              # Gateway test suite
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Docker Desktop** (for RabbitMQ + PostgreSQL)
- **Git**

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts **3 containers**:
| Container | Port | Purpose |
|-----------|------|---------|
| PostgreSQL | 5432 | Database |
| RabbitMQ | 5672 / 15672 | Message broker + management UI |
| pgAdmin | 5050 | Database visual interface |

### 2. Install Dependencies

```bash
# Core services
cd shared/database && npm install && cd ../..
cd auth-service && npm install && cd ..
cd order-service && npm install && cd ..
cd websocket-service && npm install && cd ..
cd api-gateway && npm install && cd ..
cd client-app && npm install && cd ..

# Mock services & adapters
cd mock-services/mock-ros && npm install && cd ../..
cd mock-services/mock-cms && npm install && cd ../..
cd mock-services/mock-wms && npm install && cd ../..
cd adapters/rest-adapter && npm install && cd ../..
cd adapters/soap-adapter && npm install && cd ../..
cd adapters/tcp-adapter && npm install && cd ../..
cd workers/ros-worker && npm install && cd ../..
cd workers/cms-worker && npm install && cd ../..
cd workers/wms-worker && npm install && cd ../..
```

### 3. Start Services

Start each in a separate terminal:

```bash
# Mock backends
cd mock-services/mock-ros && npm run dev
cd mock-services/mock-cms && npm run dev
cd mock-services/mock-wms && npm run dev

# Protocol adapters
cd adapters/rest-adapter && node index.js
cd adapters/soap-adapter && node index.js
cd adapters/tcp-adapter && node index.js

# Workers
cd workers/ros-worker && node index.js
cd workers/cms-worker && node index.js
cd workers/wms-worker && node index.js

# Core services
cd auth-service && npm run dev
cd order-service && node index.js
cd websocket-service && npm run dev
cd api-gateway && npm run dev

# Frontend
cd client-app && npm run dev
```

### 4. Access

| Service | URL |
|---------|-----|
| **React App** | http://localhost:5173 |
| **API Gateway** | http://localhost:5000 |
| **RabbitMQ UI** | http://localhost:15672 (admin / admin123) |
| **pgAdmin** | http://localhost:5050 (admin@swift.com / admin123) |

### 5. Test

```bash
node test-auth.js           # Auth service tests
node test-all-protocols.js  # Protocol integration tests
node test-gateway.js        # Gateway tests
```

## 🏗️ Architecture

```
┌─────────────────┐
│   React Client  │ ← Role-based dashboards (admin/customer/driver)
│   (Port 5173)   │
└────────┬────────┘
         │ JWT Bearer Token
         ▼
┌──────────────────────────────────────────────────────┐
│              🌐 API GATEWAY (Port 5000)               │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │JWT Auth  │  │Rate Limit│  │Intelligent Routing│   │
│  └─────────┘  └──────────┘  └───────────────────┘   │
└───┬─────────┬──────────┬──────────┬─────────────────┘
    │         │          │          │
    ▼         ▼          ▼          ▼
┌────────┐┌────────┐┌────────┐┌──────────┐
│  Auth  ││ Order  ││REST    ││SOAP      │  ← Service Layer
│Service ││Service ││Adapter ││Adapter   │
│ :4005  ││ :4004  ││ :3001  ││ :3002    │
└───┬────┘└───┬────┘└───┬────┘└────┬─────┘
    │         │         │          │         ┌────────┐
    ▼         ▼         ▼          ▼         │TCP     │
┌──────────────────┐  ┌──────────────────┐   │Adapter │
│   PostgreSQL     │  │    RabbitMQ      │   │ :3003  │
│   (Port 5432)    │  │   (Port 5672)    │   └───┬────┘
│  ┌─────┐┌──────┐│  │  ┌─────┐┌──────┐│       │
│  │users││orders││  │  │queue ││queue ││       ▼
│  └─────┘└──────┘│  │  └─────┘└──────┘│   RabbitMQ
└──────────────────┘  └────────┬────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
               ┌────────┐┌────────┐┌────────┐
               │  ROS   ││  CMS   ││  WMS   │  ← Workers
               │ Worker ││ Worker ││ Worker │
               └───┬────┘└───┬────┘└───┬────┘
                   ▼         ▼         ▼
               ┌────────┐┌────────┐┌────────┐
               │Mock ROS││Mock CMS││Mock WMS│  ← Simulated Systems
               │ :4002  ││ :4000  ││ :4001  │
               └────────┘└────────┘└────────┘
```

## 📊 Service Port Map

| Port | Service | Protocol |
|------|---------|----------|
| 3001 | REST Adapter | HTTP/JSON |
| 3002 | SOAP Adapter | SOAP/XML |
| 3003 | TCP Adapter | TCP/Binary |
| 4000 | Mock CMS | SOAP |
| 4001 | Mock WMS | TCP |
| 4002 | Mock ROS | REST |
| 4004 | Order Service (SAGA) | HTTP |
| 4005 | Auth Service (JWT) | HTTP |
| 4006 | WebSocket Service | WS (Socket.IO) |
| 5000 | API Gateway | HTTP |
| 5173 | React Client | HTTP |
| 5432 | PostgreSQL | PostgreSQL |
| 5672 | RabbitMQ (AMQP) | AMQP |
| 15672 | RabbitMQ (UI) | HTTP |
| 5050 | pgAdmin (UI) | HTTP |

## 📝 Implementation Progress

- [x] **Phase 1: Foundation** — Mock services (REST, SOAP, TCP)
- [x] **Phase 2: Integration** — Adapters, Workers, RabbitMQ
- [x] **Phase 3: Gateway & Security** — API Gateway, rate limiting, resilience
- [x] **Phase 3.5: SAGA Pattern** — Order Service, distributed transactions
- [x] **Auth Service** — JWT login, registration, RBAC, refresh tokens
- [x] **Database** — PostgreSQL, connection pooling, schema auto-creation
- [x] **Client App** — React dashboard, real login, role-based views
- [x] **WebSocket Server** — Real-time order tracking via Socket.IO
- [ ] **Polish** — Wire all pages to live data

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data flows, component design |
| [API.md](./API.md) | API reference for REST, SOAP, TCP endpoints |
| [DOCKER.md](./DOCKER.md) | Docker setup, PostgreSQL & RabbitMQ commands |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Setup instructions and learning concepts |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment and configuration guide |

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Lucide Icons, Socket.IO Client |
| **API Gateway** | Express.js, Winston logging |
| **Auth** | JWT, bcrypt, express-rate-limit |
| **Real-Time** | Socket.IO (WebSocket + fallback) |
| **Database** | PostgreSQL 15, node-postgres (pg) |
| **Message Broker** | RabbitMQ 3.12, amqplib |
| **Protocols** | REST, SOAP (soap), TCP (net) |
| **Containers** | Docker, Docker Compose |
| **DB Admin** | pgAdmin 4 |

## 👤 About

A personal learning project exploring middleware architecture patterns and microservices integration. Built incrementally to understand distributed systems, protocol translation, and enterprise integration patterns.

## 📄 License

MIT License — Feel free to use this for your own learning!

---
