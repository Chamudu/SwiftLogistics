# SwiftLogistics - SwiftTrack Platform

A middleware architecture project integrating heterogeneous systems (CMS, ROS, WMS) for logistics management.

## 🎯 Project Overview

This project demonstrates a complete middleware solution featuring:
- **Microservices Architecture** with Event-Driven Design
- **RabbitMQ** for asynchronous message processing
- **Protocol Adapters** for SOAP, REST, and TCP/IP integration
- **SAGA Pattern** for distributed transaction management
- **Real-time tracking** using WebSockets

## 📁 Project Structure

```
SwiftLogistics/
├── .agent/                          # Documentation and guides
│   ├── SwiftLogistics_Architecture_Design.md
│   ├── Middleware_Learning_Guide.md
│   └── Message_Brokers_Deep_Dive.md
│
├── services/                        # Microservices
│   ├── api-gateway/                # API Gateway service
│   ├── order-service/              # Order orchestration service
│   ├── auth-service/               # Authentication service
│   ├── websocket-server/           # Real-time notification server
│   └── workers/                    # Message queue workers
│       ├── cms-worker/
│       ├── wms-worker/
│       └── ros-worker/
│
├── adapters/                        # Protocol adapters
│   ├── cms-adapter/                # SOAP adapter for CMS
│   ├── wms-adapter/                # TCP adapter for WMS
│   └── ros-adapter/                # REST adapter for ROS
│
├── mock-services/                   # Mock backend systems
│   ├── mock-cms/                   # Mock SOAP service
│   ├── mock-wms/                   # Mock TCP service
│   └── mock-ros/                   # Mock REST service
│
├── client/                          # Frontend applications
│   ├── web-portal/                 # React web application
│   └── mobile-app/                 # React Native mobile app
│
├── shared/                          # Shared utilities
│   ├── rabbitmq/                   # RabbitMQ connection utilities
│   ├── database/                   # Database utilities
│   └── utils/                      # Common utilities
│
├── docker/                          # Docker configurations
│   ├── docker-compose.yml          # Development environment
│   └── docker-compose.prod.yml     # Production environment
│
└── docs/                            # Additional documentation
    ├── api/                        # API documentation
    └── diagrams/                   # Architecture diagrams
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker Desktop
- Git

### Installation

```bash
# Clone the repository
cd c:/Users/Chamudu Hansana/Desktop/Projects/SwiftLogistics

# Install dependencies (we'll do this for each service)
# (Instructions below)
```

### Running the Project

```bash
# Start all services with Docker Compose (coming soon)
docker-compose up

# Or start individual services
npm run dev:mock-ros    # REST API on port 4002
npm run dev:mock-cms    # SOAP service on port 4000
npm run dev:mock-wms    # TCP service on port 4001

# Start all mock services at once
npm run dev:all-mocks
```

### Testing the Services

**Option 1: Browser Dashboard (Visual)**
```bash
# Open in browser
test-dashboard.html
```

**Option 2: Command Line Tests**
```bash
# Test Mock ROS
cd mock-services/mock-ros
node test.js

# Test Mock CMS
cd mock-services/mock-cms
node test.js

# Test Mock WMS
cd mock-services/mock-wms
node test.js
```

**Option 3: Middleware Integration Tests (Phase 2)**
```bash
# Make sure services are running:
# 1. RabbitMQ: docker-compose up -d
# 2. Mock ROS: npm run dev:mock-ros
# 3. REST Adapter: node adapters/rest-adapter/index.js
# 4. ROS Worker: node workers/ros-worker/index.js

# Run comprehensive middleware tests
node test-middleware.js
```

## 📚 Documentation

- [Architecture Design](./.agent/SwiftLogistics_Architecture_Design.md)
- [Middleware Learning Guide](./.agent/Middleware_Learning_Guide.md)
- [Message Brokers Deep Dive](./.agent/Message_Brokers_Deep_Dive.md)

## 🎓 Learning Approach

This project is built incrementally with a focus on understanding:
- **Why** we need each component
- **What** each pattern solves
- **How** to implement it correctly

## 📝 Implementation Phases

- [x] **Phase 0: Architecture Design**
  - [x] Complete architecture documentation
  - [x] Middleware learning guide
  - [x] Message## ✅ Current Progress: Phase 2 COMPLETE (100%)

### 🎉 Phase 2: Integration Layer - COMPLETE

**All protocol adapters and workers are fully implemented and tested!**

#### Protocol Adapters ✅
- [x] **REST Adapter** (Port 3001) - HTTP/JSON protocol adapter
  - Route optimization endpoint
  - Get/Update route endpoints
  - Full RabbitMQ integration
- [x] **SOAP Adapter** (Port 3002) - SOAP/XML protocol adapter
  - WSDL service definition
  - SubmitOrder, GetOrderStatus, CancelOrder, GetClientInfo operations
  - XML to JSON transformation
- [x] **TCP Adapter** (Port 3003) - Binary socket protocol adapter
  - Length-prefixed JSON protocol
  - CREATE_PACKAGE, GET_PACKAGE_STATUS, UPDATE_PACKAGE_STATUS, GET_INVENTORY
  - Binary data handling

#### Workers ✅
- [x] **ROS Worker** - Route Optimization System integration
  - REST client for Mock ROS
  - Route optimization processing
  - Full request/reply pattern
- [x] **CMS Worker** - Client Management System integration
  - SOAP client for Mock CMS
  - Order management operations
  - PascalCase/camelCase transformation
- [x] **WMS Worker** - Warehouse Management System integration
  - TCP client for Mock WMS
  - Package and inventory operations
  - Binary protocol handling

#### Message Broker ✅
- [x] **RabbitMQ Integration**
  - 3 exchanges (ros_exchange, cms_exchange, wms_exchange)
  - 11 queues with proper routing
  - Request/Reply pattern implementation
  - Message persistence and acknowledgment

#### Testing & Documentation ✅
- [x] **Complete Test Suite** (`test-all-protocols.js`)
  - REST protocol integration tests
  - SOAP protocol integration tests
  - TCP protocol integration tests
  - **100% pass rate** ✅
- [x] **Interactive Dashboard** (`middleware-dashboard.html`)
  - Real-time service status monitoring
  - Live REST API testing
  - Protocol documentation
- [x] **Comprehensive Documentation**
  - Architecture design (`ARCHITECTURE.md`)
  - API reference (`API.md`)
  - Deployment guide (`DEPLOYMENT.md`)
  - Setup instructions (`SETUP_GUIDE.md`)

### Phase 1: Foundation - COMPLETE ✅
- [x] Project setup and structure
- [x] Docker configuration for RabbitMQ
- [x] Mock ROS service (REST API)
- [x] Mock CMS service (SOAP)
- [x] Mock WMS service (TCP)
- [x] Basic documentation

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| **Protocol Adapters** | 3 (REST, SOAP, TCP) |
| **Workers** | 3 (ROS, CMS, WMS) |
| **Mock Services** | 3 (ROS, CMS, WMS) |
| **Total Services** | 10 (including RabbitMQ) |
| **API Endpoints** | 15+ |
| **Test Coverage** | 100% (all protocols tested) |
| **Documentation Pages** | 4 (Architecture, API, Deploy, Setup) |
| **Lines of Code** | 3000+ |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- Docker & Docker Compose
- 10 terminal windows (or use startup script)

### Installation

1. **Clone and Install**
```bash
git clone <repository-url>
cd SwiftLogistics
npm install
```

2. **Install All Dependencies**
```bash
# Install for each service
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

3. **Start RabbitMQ**
```bash
docker-compose up -d
```

4. **Start All Services** (in separate terminals)
```bash
# Terminal 1: Mock ROS
cd mock-services/mock-ros && npm run dev

# Terminal 2: Mock CMS
cd mock-services/mock-cms && npm run dev

# Terminal 3: Mock WMS
cd mock-services/mock-wms && npm run dev

# Terminal 4: REST Adapter
cd adapters/rest-adapter && node index.js

# Terminal 5: SOAP Adapter
cd adapters/soap-adapter && node index.js

# Terminal 6: TCP Adapter
cd adapters/tcp-adapter && node index.js

# Terminal 7: ROS Worker
cd workers/ros-worker && node index.js

# Terminal 8: CMS Worker
cd workers/cms-worker && node index.js

# Terminal 9: WMS Worker
cd workers/wms-worker && node index.js
```

5. **Test Everything**
```bash
node test-all-protocols.js
```

Expected output:
```
🎉🎉🎉 ALL PROTOCOLS WORKING! 🎉🎉🎉
✅ REST Protocol:  PASSED
✅ SOAP Protocol:  PASSED
✅ TCP Protocol:   PASSED
📊 Overall: 3/3 protocols working (100%)
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Complete system architecture, data flows, and component design |
| **[API.md](./API.md)** | Detailed API reference for REST, SOAP, and TCP protocols |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Installation, configuration, and deployment guide |
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** | Personal learning guide and middleware concepts |
| **[DOCKER.md](./DOCKER.md)** | Docker and RabbitMQ setup instructions |

---

## 🎯 Testing

### Run Complete Test Suite
```bash
node test-all-protocols.js
```

### Test Individual Protocols

**REST**:
```bash
curl -X POST http://localhost:3001/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-001","address":"123 Main St","priority":"high"}'
```

**SOAP**:
```
Open: http://localhost:3002/soap?wsdl
Use: Postman or SoapUI
```

**TCP**:
```bash
node test-all-protocols.js
```

### Interactive Dashboard
Open `middleware-dashboard.html` in your browser for real-time monitoring and testing.

---
### ✅ Phase 3: Advanced Middleware Features (Current)
- [x] **API Gateway**: Unified entry point (Port 5000) for all protocols.
- [x] **Monitoring & Observability**: Real-time dashboard, structured logging (Winston), and metrics.
- [x] **Security**: API Keys, Rate Limiting.
- [x] **Resilience**: Retries & Error Handling.
- [x] **Order Service**: SAGA Pattern Orchestrator (Port 4004).
- [ ] **Auth Service**: Implementing JWT/Login logic.
- [ ] **WebSocket Server**: For real-time order tracking updates.

- [ ] **Phase 4: Client Applications**
  - [ ] Web portal (React)
  - [ ] Real-time tracking interface
  - [ ] Mobile app (optional)

- [ ] **Phase 5: Polish & Features**
  - [ ] Performance optimization
  - [ ] Complete documentation

## 🛠️ Technology Stack

- **Runtime:** Node.js 18+
- **Message Broker:** RabbitMQ
- **Database:** PostgreSQL
- **Cache:** Redis
- **Frontend:** React + Vite
- **WebSockets:** Socket.io
- **Containerization:** Docker

## 👤 About This Project

A personal learning project exploring middleware architecture patterns and microservices integration. Built incrementally to understand the "why," "what," and "how" of distributed systems.

### Learning Goals
- Master different communication protocols (REST, SOAP, TCP/IP)
- Understand message broker patterns with RabbitMQ
- Implement distributed transaction management (SAGA pattern)
- Build real-time systems with WebSockets
- Practice microservices architecture

## 📄 License

MIT License - Feel free to use this for your own learning!

---

**Built with ❤️ as a learning journey into middleware architecture and distributed systems.**
