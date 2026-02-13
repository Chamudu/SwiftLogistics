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
  - [x] Message broker comparison

- [x] **Phase 1: Mock Services** ✅ COMPLETED!
  - [x] Mock ROS (REST/JSON) - Port 4002
  - [x] Mock CMS (SOAP/XML) - Port 4000
  - [x] Mock WMS (TCP/IP) - Port 4001
  - [x] Test scripts for all services
  - [x] Browser test dashboard

- [ ] **Phase 2: Integration Layer** (In Progress)
  - [ ] RabbitMQ setup
  - [ ] Protocol adapters (SOAP, REST, TCP)
  - [ ] Message queue workers

- [ ] **Phase 3: Core Services** (Week 3-4)
  - [ ] API Gateway
  - [ ] Order Service (SAGA)
  - [ ] Auth Service
  - [ ] WebSocket server

- [ ] **Phase 4: Client Applications**
  - [ ] Web portal (React)
  - [ ] Real-time tracking interface
  - [ ] Mobile app (optional)

- [ ] **Phase 5: Polish & Features**
  - [ ] Security enhancements
  - [ ] Performance optimization
  - [ ] Monitoring and logging
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
