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
# Start all services with Docker Compose
docker-compose up

# Or start individual services
npm run dev --workspace=mock-cms
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

- [x] Phase 0: Architecture Design
- [ ] Phase 1: Mock Services (Week 1)
- [ ] Phase 2: Integration Layer (Week 2-3)
- [ ] Phase 3: Core Services (Week 3-4)
- [ ] Phase 4: Client Applications (Week 4-5)
- [ ] Phase 5: Documentation & Presentation (Week 5-6)

## 🛠️ Technology Stack

- **Runtime:** Node.js 18+
- **Message Broker:** RabbitMQ
- **Database:** PostgreSQL
- **Cache:** Redis
- **Frontend:** React + Vite
- **WebSockets:** Socket.io
- **Containerization:** Docker

## 👥 Team

Assignment for SCS2314 - Middleware Architecture
University of Colombo School of Computing

## 📄 License

Educational project - UCSC 2026
