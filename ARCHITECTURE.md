# SwiftLogistics Middleware Architecture

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Protocol Details](#protocol-details)
- [Scalability & Resilience](#scalability--resilience)

## Overview

SwiftLogistics is a full-stack distributed middleware system that integrates multiple legacy systems using different communication protocols (REST, SOAP, TCP) through a central message broker (RabbitMQ), with JWT authentication, PostgreSQL persistence, and a React dashboard.

### Key Objectives

- **Protocol Abstraction**: Hide protocol complexity from business logic
- **Decoupling**: Services communicate asynchronously via message broker
- **Authentication**: JWT-based auth with role-based access control
- **Persistence**: PostgreSQL database for users, orders, and tokens
- **Scalability**: Horizontal scaling of workers and adapters
- **Reliability**: Message persistence, ACID transactions, SAGA pattern

## System Architecture

### Diagram 1 — Layered Architecture (Layers & Tiers)

```
 LAYER                        COMPONENTS                                     TIER
 ─────                        ──────────                                     ────

                           ┌─────────────────────────────────────────┐
 PRESENTATION              │          React Dashboard (:5173)        │      Tier 1
 LAYER                     │     JWT Auth  •  Role-Based Views       │    (Client)
                           └─────────────────────┬───────────────────┘
                                                 │ HTTP (fetch)
                          ┌──────────────────────▼───────────────────┐
 GATEWAY                  │          API GATEWAY (:5000)             │      Tier 2
 LAYER                    │   JWT Auth • Rate Limit • Routing • Logs │    (Server)
                          └──────────────────────┬───────────────────┘
                                                 │ HTTP (proxy)
                    ┌────────────┬───────────────┼───────────┬──────────┐
                    ▼            ▼               ▼           ▼          ▼
               ┌───────── ┐   ┌─────────┐    ┌─────────┐┌─────────┐┌─────────┐
 BUSINESS      │  Auth    │   │  Order  │    │  REST   ││  SOAP   ││  TCP    │
 LOGIC         │  Service │   │ Service │    │ Adapter ││ Adapter ││ Adapter │
 LAYER         │  :4005   │   │  :4004  │    │  :3001  ││  :3002  ││  :3003  │
               └────┬─────┘   └──┬──┬───┘    └────┬────┘└────┬────┘└────┬────┘
                    │            │  │             │          │          │
                    │  ┌─────────┘  │             └───────── ┼──────────┘
                    │  │            │ SAGA (HTTP)            │ AMQP
                    ▼  ▼            └──────────────┐         │
              ┌────────────┐                       │         ▼
 DATA         │ PostgreSQL │               ┌───────┴───────────────────┐
 LAYER        │   :5432    │    MESSAGE    │       RabbitMQ (:5672)    │    Tier 2
              └────────────┘    BROKER     │  3 Exchanges • 11 Queues  │  (Server)
                                LAYER      └─────┬─────────┬─────────┬─┘
                                                 │         │         │ AMQP
                                            ┌────▼───┐┌────▼───┐┌────▼───┐
 INTEGRATION                                │  ROS   ││  CMS   ││  WMS   │
 LAYER                                      │ Worker ││ Worker ││ Worker │
                                            └────┬───┘└────┬───┘└────┬───┘
                                                 │         │         │
                                              HTTP(REST) SOAP(XML) TCP(Binary)
                                                 │         │         │
                                            ┌────▼───┐┌────▼───┐┌────▼───┐
 EXTERNAL                                   │Mock ROS││Mock CMS││Mock WMS│   Tier 3
 SYSTEMS                                    │ :4002  ││ :4000  ││ :4001  │  (Data /
                                            └────────┘└────────┘└────────┘  External)

 ADMIN TOOLS:   pgAdmin (:5050) ──── TCP ────→ PostgreSQL (:5432)
                RabbitMQ UI (:15672)              (web dashboards)
```

### Diagram 2 — Connection Map (Who Talks to Whom)

Every arrow below is a real network connection in the system:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   React App (:5173)                                                     │
│      │                                                                  │
│      │ ① HTTP GET/POST (JWT Bearer token in Authorization header)       │
│      ▼                                                                  │
│   API Gateway (:5000)                                                   │
│      │                                                                  │
│      ├── ② HTTP POST /auth/* ──────────────→ Auth Service (:4005)       │
│      │                                          │                       │
│      │                                          │ ③ SQL queries (pg)    │
│      │                                          ▼                       │
│      │                                       PostgreSQL (:5432)         │
│      │                                          ▲                       │
│      │                                          │ ④ SQL queries (pg)    │
│      │                                          │                       │
│      ├── ⑤ HTTP POST /orders ──────────────→ Order Service (:4004)      │
│      │                                          │                       │
│      │                              ┌───────────┤                       │
│      │                              │           │                       │
│      │                   ⑥ SAGA Step 1:         │                       │
│      │                   HTTP POST              │                       │
│      │                   /api/warehouse/        │                       │
│      │                   packages               │                       │
│      │                              │    ⑦ SAGA Step 2:                 │
│      │                              │    HTTP POST                      │
│      │                              │    /api/routes/optimize           │
│      │                              │           │                       │
│      │                              │           │  ⑧ SAGA Step 3:       │
│      │                              │           │  HTTP POST            │
│      │                              │           │  /soap/submit-order   │
│      │                              ▼           ▼                       │
│      ├── ⑨ HTTP /api/routes/* ──→ REST Adapter (:3001)                  │
│      │                              │                                   │
│      │                              │ ⑩ AMQP publish → ros_exchange     │
│      │                              ▼                                   │
│      │                           RabbitMQ (:5672)                       │
│      │                              │                                   │
│      │                              │ ⑪ AMQP consume ← route.* queues  │
│      │                              ▼                                   │
│      │                           ROS Worker                             │
│      │                              │                                   │
│      │                              │ ⑫ HTTP GET/POST (axios)           │
│      │                              ▼                                   │
│      │                           Mock ROS (:4002)                       │
│      │                                                                  │
│      ├── ⑬ HTTP /soap/* ────────→ SOAP Adapter (:3002)                  │
│      │                              │ ⑭ AMQP → cms_exchange             │
│      │                              ▼                                   │
│      │                           CMS Worker                             │
│      │                              │ ⑮ SOAP/XML (node-soap)            │
│      │                              ▼                                   │
│      │                           Mock CMS (:4000)                       │
│      │                                                                  │
│      └── ⑯ HTTP /api/warehouse/* → TCP Adapter (:3003)                  │
│                                     │ ⑰ AMQP → wms_exchange             │
│                                     ▼                                   │
│                                  WMS Worker                             │
│                                     │ ⑱ TCP socket (net module)          │
│                                     ▼                                   │
│                                  Mock WMS (:4001)                       │
│                                                                         │
│   ADMIN TOOLS (not in main flow):                                       │
│   pgAdmin (:5050) ─── ⑲ TCP (pg protocol) ──→ PostgreSQL (:5432)       │
│   Browser ─────────── ⑳ HTTP ────────────────→ RabbitMQ UI (:15672)     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### All 20 Connections Explained

| # | From | To | Protocol | Purpose |
|---|------|----|----------|---------|
| ① | React App | API Gateway | HTTP (JWT Bearer) | All frontend API calls |
| ② | Gateway | Auth Service | HTTP proxy | Login, register, verify, me, logout |
| ③ | Auth Service | PostgreSQL | SQL (pg lib) | Read/write users, refresh_tokens |
| ④ | Order Service | PostgreSQL | SQL (pg lib) | Read/write orders |
| ⑤ | Gateway | Order Service | HTTP proxy | Create/list orders |
| ⑥ | Order Service | TCP Adapter | HTTP (SAGA Step 1) | Reserve inventory |
| ⑦ | Order Service | REST Adapter | HTTP (SAGA Step 2) | Schedule delivery |
| ⑧ | Order Service | SOAP Adapter | HTTP (SAGA Step 3) | Submit to legacy CMS |
| ⑨ | Gateway | REST Adapter | HTTP proxy | Direct route optimization calls |
| ⑩ | REST Adapter | RabbitMQ | AMQP publish | Send to ros_exchange |
| ⑪ | RabbitMQ | ROS Worker | AMQP consume | Worker picks up from queue |
| ⑫ | ROS Worker | Mock ROS | HTTP (axios) | Call actual REST backend |
| ⑬ | Gateway | SOAP Adapter | HTTP proxy | SOAP/CMS requests |
| ⑭ | SOAP Adapter → RabbitMQ → CMS Worker | AMQP | Publish → consume cycle |
| ⑮ | CMS Worker | Mock CMS | SOAP/XML (node-soap) | Call actual SOAP backend |
| ⑯ | Gateway | TCP Adapter | HTTP proxy | Warehouse requests |
| ⑰ | TCP Adapter → RabbitMQ → WMS Worker | AMQP | Publish → consume cycle |
| ⑱ | WMS Worker | Mock WMS | TCP socket (net) | Call actual TCP backend |
| ⑲ | pgAdmin | PostgreSQL | TCP (pg protocol) | Admin database access |
| ⑳ | Browser | RabbitMQ UI | HTTP | Admin queue monitoring |

### Layers & Tiers

**Layers** = *logical separation* (what each part does):

| Layer | Responsibility | Components |
|-------|---------------|------------|
| **Presentation** | User interface, user interaction | React Dashboard |
| **Gateway** | Single entry point, auth, rate limiting, routing | API Gateway |
| **Business Logic** | Core features, orchestration | Auth Service, Order Service (SAGA) |
| **Integration** | Protocol translation, message consumers | REST/SOAP/TCP Adapters, Workers |
| **Message Broker** | Asynchronous decoupling | RabbitMQ (exchanges, queues) |
| **Data** | Persistent storage | PostgreSQL |
| **External Systems** | Third-party backends (simulated) | Mock ROS, Mock CMS, Mock WMS |

**Tiers** = *physical separation* (where each part runs):

| Tier | What | Where |
|------|------|-------|
| **Tier 1 — Client** | React App | User's browser |
| **Tier 2 — Server** | Gateway, Auth, Order, Adapters, Workers, RabbitMQ | Node.js processes on backend |
| **Tier 3 — Data** | PostgreSQL, Mock Services | Docker containers |

> **Why does this matter?**
> - **Layers** let you change one part without breaking others (e.g., swap PostgreSQL for MongoDB without touching the Auth Service API)
> - **Tiers** let you scale independently (e.g., deploy the React app on a CDN, the services on a server, and the database on a managed cloud service)

## Component Design

### 0. Authentication & Storage

#### Auth Service (Port 4005)
- **Technology**: Express.js, JWT, bcrypt
- **Database**: PostgreSQL (users, refresh_tokens tables)
- **Endpoints**:
  - `POST /auth/register` — Create account
  - `POST /auth/login` — Login, receive tokens
  - `POST /auth/refresh` — Refresh access token
  - `POST /auth/logout` — Invalidate tokens
  - `GET /auth/me` — Get user profile
  - `GET /auth/verify` — Token validation (for Gateway)
  - `GET /auth/users` — Admin: list all users
- **Security**: bcrypt password hashing, rate limiting, token blacklisting

#### Order Service (Port 4004)
- **Technology**: Express.js, SAGA orchestrator
- **Database**: PostgreSQL (orders table with JSONB columns)
- **Pattern**: SAGA — coordinates Warehouse → Logistics → CMS in sequence
- **Compensation**: If any step fails, previous steps are undone

#### PostgreSQL Database (Port 5432)
- **image**: postgres:15-alpine (via Docker)
- **Tables**: users, orders, refresh_tokens
- **Connection**: Shared pool via `shared/database/index.js`
- **Features**: JSONB columns for flexible data, foreign keys, cascade deletes

### 1. Protocol Adapters

#### REST Adapter (Port 3001)
- **Technology**: Express.js
- **Protocol**: HTTP/JSON
- **Endpoints**:
  - `POST /api/routes/optimize` - Optimize delivery route
  - `GET /api/routes/:id` - Get route details
  - `PUT /api/routes/:id` - Update route
- **Flow**: HTTP Request → JSON → AMQP Message → RabbitMQ

#### SOAP Adapter (Port 3002)
- **Technology**: node-soap
- **Protocol**: SOAP/XML
- **WSDL**: `http://localhost:3002/soap?wsdl`
- **Operations**:
  - `SubmitOrder` - Create new order
  - `GetOrderStatus` - Query order status
  - `CancelOrder` - Cancel existing order
  - `GetClientInfo` - Retrieve client details
- **Flow**: SOAP Request → XML Parse → JSON → AMQP Message → RabbitMQ

#### TCP Adapter (Port 3003)
- **Technology**: Node.js net module
- **Protocol**: Custom length-prefixed JSON over TCP
- **Message Format**:
  ```
  [4 bytes: message length][JSON payload]
  ```
- **Actions**:
  - `CREATE_PACKAGE` - Create warehouse package
  - `GET_PACKAGE_STATUS` - Query package status
  - `UPDATE_PACKAGE_STATUS` - Update package status
  - `GET_INVENTORY` - Check inventory levels
- **Flow**: TCP Socket → Buffer → Parse JSON → AMQP Message → RabbitMQ

### 2. Message Broker (RabbitMQ)

#### Configuration
- **Host**: localhost:5672
- **Management UI**: localhost:15672
- **Credentials**: admin/admin123
- **Connection**: AMQP protocol

#### Exchanges
| Exchange | Type | Purpose |
|----------|------|---------|
| `ros_exchange` | direct | Route optimization messages |
| `cms_exchange` | direct | Client management messages |
| `wms_exchange` | direct | Warehouse management messages |

#### Queues
| Queue | Exchange | Routing Key | Consumer |
|-------|----------|-------------|----------|
| `route.optimize` | ros_exchange | route.optimize | ROS Worker |
| `route.get` | ros_exchange | route.get | ROS Worker |
| `route.update` | ros_exchange | route.update | ROS Worker |
| `order.submit` | cms_exchange | order.submit | CMS Worker |
| `order.status` | cms_exchange | order.status | CMS Worker |
| `order.cancel` | cms_exchange | order.cancel | CMS Worker |
| `client.info` | cms_exchange | client.info | CMS Worker |
| `package.create` | wms_exchange | package.create | WMS Worker |
| `package.status` | wms_exchange | package.status | WMS Worker |
| `package.update` | wms_exchange | package.update | WMS Worker |
| `inventory.get` | wms_exchange | inventory.get | WMS Worker |

### 3. Workers

#### ROS Worker
- **Purpose**: Interface with Route Optimization System
- **Protocol**: REST (HTTP)
- **Target**: Mock ROS (localhost:4002)
- **Operations**:
  - Optimize delivery routes
  - Retrieve route information
  - Update route assignments

#### CMS Worker
- **Purpose**: Interface with Client Management System
- **Protocol**: SOAP (XML)
- **Target**: Mock CMS (localhost:4000)
- **Operations**:
  - Submit orders
  - Query order status
  - Cancel orders
  - Retrieve client information
- **Special Handling**: 
  - Transforms camelCase → PascalCase for requests
  - Transforms PascalCase → camelCase for responses

#### WMS Worker
- **Purpose**: Interface with Warehouse Management System
- **Protocol**: TCP (Binary)
- **Target**: Mock WMS (localhost:4001)
- **Operations**:
  - Create packages
  - Query package status
  - Update package status
  - Check inventory levels
- **Protocol**: Length-prefixed JSON over TCP sockets

### 4. Mock Services

#### Mock ROS (Port 4002)
- **Type**: REST API
- **Technology**: Express.js
- **Data**: In-memory storage
- **Features**:
  - Route optimization algorithm (random assignment for demo)
  - Driver tracking
  - Distance calculation

#### Mock CMS (Port 4000)
- **Type**: SOAP Service
- **Technology**: node-soap
- **Data**: In-memory storage
- **Features**:
  - Order management
  - Client database
  - Cost estimation
  - PascalCase field naming convention

#### Mock WMS (Port 4001)
- **Type**: TCP Socket Server
- **Technology**: Node.js net module
- **Data**: In-memory storage
- **Features**:
  - Package tracking
  - Inventory management
  - Zone-based warehouse organization
  - Custom binary protocol

## Data Flow

### Request/Reply Pattern

The system uses the **Request/Reply** pattern for synchronous-like communication over asynchronous messaging:

```
1. Client sends request to Adapter
2. Adapter publishes message to RabbitMQ with:
   - correlationId (unique request identifier)
   - replyTo (temporary reply queue)
3. Worker consumes message from queue
4. Worker calls legacy system
5. Worker publishes response to replyTo queue with same correlationId
6. Adapter receives response, matches correlationId
7. Adapter sends response back to client
```

### Example Flow: Route Optimization

```
┌──────────┐    HTTP POST    ┌─────────────┐
│  Client  │──────────────────▶│ REST Adapter│
│          │                   │   :3001     │
└──────────┘                   └──────┬──────┘
                                      │ AMQP Publish
                                      │ Exchange: ros_exchange
                                      │ Routing Key: route.optimize
                                      │ CorrelationId: abc123
                                      │ ReplyTo: amq.gen-xyz
                                      ▼
                              ┌───────────────┐
                              │   RabbitMQ    │
                              │ ros_exchange  │
                              └───────┬───────┘
                                      │ Queue: route.optimize
                                      ▼
                              ┌───────────────┐
                              │  ROS Worker   │
                              └───────┬───────┘
                                      │ HTTP GET
                                      ▼
                              ┌───────────────┐
                              │   Mock ROS    │
                              │     :4002     │
                              └───────┬───────┘
                                      │ Response
                                      ▼
                              ┌───────────────┐
                              │  ROS Worker   │
                              └───────┬───────┘
                                      │ AMQP Publish
                                      │ Queue: amq.gen-xyz
                                      │ CorrelationId: abc123
                                      ▼
                              ┌───────────────┐
                              │   RabbitMQ    │
                              └───────┬───────┘
                                      │
                                      ▼
┌──────────┐    HTTP Response ┌─────────────┐
│  Client  │◀──────────────────│ REST Adapter│
│          │                   │   :3001     │
└──────────┘                   └─────────────┘
```

## Protocol Details

### REST Protocol

**Request Example:**
```json
POST /api/routes/optimize
Content-Type: application/json

{
  "packageId": "PKG-001",
  "address": "123 Main St, Colombo",
  "priority": "high"
}
```

**Response Example:**
```json
{
  "success": true,
  "routeId": "ROUTE-1001",
  "driverId": "DRV-5",
  "distance": 24.5,
  "estimatedDeliveryTime": "2024-02-15T14:30:00Z"
}
```

### SOAP Protocol

**Request Example:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SubmitOrder>
      <clientId>CL-001</clientId>
      <packageId>PKG-001</packageId>
      <pickupAddress>100 Main St</pickupAddress>
      <deliveryAddress>200 King St</deliveryAddress>
      <packageWeight>5.5</packageWeight>
      <packageDimensions>30x20x15</packageDimensions>
      <deliveryType>express</deliveryType>
    </SubmitOrder>
  </soap:Body>
</soap:Envelope>
```

**Response Example:**
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SubmitOrderResponse>
      <success>true</success>
      <orderId>ORD-1001</orderId>
      <message>Order successfully submitted</message>
      <estimatedCost>25.50</estimatedCost>
      <estimatedDeliveryDate>2024-02-16</estimatedDeliveryDate>
    </SubmitOrderResponse>
  </soap:Body>
</soap:Envelope>
```

### TCP Protocol

**Message Structure:**
```
Byte 0-3:  Message Length (UInt32BE)
Byte 4+:   JSON Payload
```

**Request Example:**
```
Length: 0x00 0x00 0x00 0x9E (158 bytes)
Payload:
{
  "action": "CREATE_PACKAGE",
  "data": {
    "packageId": "PKG-001",
    "items": [
      { "sku": "ITEM-001", "quantity": 2 }
    ],
    "destination": "Warehouse B"
  }
}
```

**Response Example:**
```
Length: 0x00 0x00 0x00 0x78 (120 bytes)
Payload:
{
  "status": "SUCCESS",
  "packageId": "PKG-5001",
  "estimatedPickTime": "2024-02-15T15:30:00Z",
  "zone": "A1"
}
```

## Scalability & Resilience

### Horizontal Scaling

**Workers can be scaled horizontally:**
```bash
# Terminal 1
node workers/ros-worker/index.js

# Terminal 2
node workers/ros-worker/index.js

# Terminal 3
node workers/ros-worker/index.js
```

RabbitMQ automatically load-balances messages across multiple worker instances using round-robin.

### Message Persistence

- **Durable Exchanges**: Survive RabbitMQ restarts
- **Durable Queues**: Messages persist to disk
- **Persistent Messages**: Messages survive broker crashes

### Error Handling

**Adapter Level:**
- Connection retry logic
- Timeout handling (default: 5 seconds)
- Error responses to clients

**Worker Level:**
- Message acknowledgment after successful processing
- Automatic retry on failure (via RabbitMQ)
- Dead Letter Queue for failed messages

### Monitoring

**RabbitMQ Management UI:**
- Queue depths
- Message rates
- Consumer counts
- Connection status

**Application Logs:**
- Request/response logging
- Error tracking
- Performance metrics

## Performance Characteristics

| Component | Throughput | Latency | Concurrency |
|-----------|-----------|---------|-------------|
| REST Adapter | ~1000 req/s | <50ms | Node.js event loop |
| SOAP Adapter | ~500 req/s | <100ms | SOAP parsing overhead |
| TCP Adapter | ~2000 msg/s | <20ms | Raw socket performance |
| RabbitMQ | ~10k msg/s | <5ms | Highly concurrent |
| Workers | Depends on backend | Variable | 1 msg at a time (scalable) |

## Security Features

**Implemented:**
- ✅ JWT authentication (access + refresh tokens)
- ✅ bcrypt password hashing (10 salt rounds)
- ✅ API key authentication for internal services
- ✅ Role-based access control (admin, customer, driver)
- ✅ Rate limiting (10 login / 100 general per 15 min)
- ✅ Parameterized SQL queries (SQL injection prevention)
- ✅ Token blacklisting on logout
- ✅ CORS configuration
- ✅ Anti-enumeration (same error for wrong email/password)

**Production Recommendations:**
- ⬜ Environment variables for all secrets
- ⬜ TLS/SSL encryption
- ⬜ httpOnly cookies for token storage
- ⬜ Input validation middleware
- ⬜ HTTPS everywhere

## Conclusion

This architecture provides:
- ✅ **Flexibility**: Support for multiple protocols (REST, SOAP, TCP)
- ✅ **Security**: JWT auth, RBAC, rate limiting, bcrypt
- ✅ **Persistence**: PostgreSQL with schema auto-creation
- ✅ **Scalability**: Horizontal scaling of workers
- ✅ **Reliability**: Message persistence, ACID transactions, SAGA pattern
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Testability**: Comprehensive test suites per service

The middleware successfully abstracts protocol complexity and enables seamless integration of heterogeneous systems through a unified, authenticated, persistent message-based architecture.
