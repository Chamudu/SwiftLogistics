# SwiftLogistics — Development Changelog

A history of what was built in each phase.

---

## Phase 1: Foundation ✅

**Objective**: Create mock backend systems for development.

- **Mock ROS** (Port 4002) — REST API simulating route optimization
- **Mock CMS** (Port 4000) — SOAP/XML service simulating client management
- **Mock WMS** (Port 4001) — TCP socket simulating warehouse management
- Docker configuration for RabbitMQ
- Test suite: `test-all-protocols.js`

---

## Phase 2: Integration Layer ✅

**Objective**: Build the middleware that connects mock services.

### Protocol Adapters
- **REST Adapter** (Port 3001) — HTTP/JSON → RabbitMQ
- **SOAP Adapter** (Port 3002) — SOAP/XML → RabbitMQ
- **TCP Adapter** (Port 3003) — TCP/Binary → RabbitMQ

### Workers
- **ROS Worker** — RabbitMQ → REST calls to Mock ROS
- **CMS Worker** — RabbitMQ → SOAP calls to Mock CMS
- **WMS Worker** — RabbitMQ → TCP calls to Mock WMS

### RabbitMQ Setup
- 3 exchanges (ros_exchange, cms_exchange, wms_exchange)
- 11 queues with proper routing
- Request/Reply pattern for sync-style responses

---

## Phase 3: Gateway & Security ✅

**Objective**: Unified entry point with security and monitoring.

- **API Gateway** (Port 5000) — Single entry point for all protocols
- API key authentication
- Rate limiting (100 requests / 15 min)
- Structured logging with Winston
- Health endpoints and metrics
- Automatic retries with error handling

### SAGA Orchestrator (Part 3.5)
- **Order Service** (Port 4004) — Coordinates multi-step order creation
- SAGA pattern: Warehouse → Logistics → CMS
- Compensation logic for rollbacks on failure

---

## Phase 4: Authentication & Client ✅

**Objective**: Real user authentication and frontend dashboard.

### Auth Service (Port 4005)
- JWT authentication (access + refresh tokens)
- bcrypt password hashing
- Role-based access (admin, customer, driver)
- Rate limiting, token blacklisting
- Demo seed data (3 users)

### Client App (Port 5173)
- React + Vite dashboard
- Role-based views (admin/customer/driver)
- Quick login + email/password login
- API client with auto token refresh
- Dark theme UI

### Gateway Upgrade
- Dual auth: JWT bearer tokens + API keys
- Auth proxy routes (/auth/*)
- Order proxy routes (/orders/*)
- Public routes bypass for login/register

---

## Phase 5: Database Persistence ✅

**Objective**: Replace in-memory storage with PostgreSQL.

### PostgreSQL (Port 5432)
- `users` table — User accounts
- `orders` table — Order records with JSONB columns
- `refresh_tokens` table — JWT refresh token storage

### Shared Database Module
- Connection pool (20 max connections)
- Schema auto-creation on startup
- Parameterized queries (SQL injection prevention)
- Transaction support

### pgAdmin (Port 5050)
- Visual database management UI
- Auto-configured to connect to PostgreSQL

### Service Migrations
- Auth service: in-memory Map → PostgreSQL
- Order service: in-memory array → PostgreSQL
- Refresh tokens: in-memory Map → PostgreSQL

---

## Phase 6: Real-Time WebSocket ✅

**Objective**: Add real-time order tracking via WebSocket (Socket.IO).

### WebSocket Service (Port 4006)
- Socket.IO server with rooms (per-user, per-role, per-order)
- REST-to-WebSocket bridge (other services call `/emit/*` to push events)
- Auto-reconnection, fallback to HTTP polling
- Health endpoint with connected client tracking

### Order Service Integration
- Emits WebSocket events after each SAGA step
- Events: CREATED → WAREHOUSE → LOGISTICS → LEGACY_CMS → COMPLETED
- Graceful degradation (orders still work if WebSocket is down)

### Client App Integration
- Socket service auto-connects on login, disconnects on logout
- Order update subscriptions via `socketService.onOrderUpdate()`
- Per-order watching via `socketService.watchOrder(orderId)`

---

## Up Next

- [ ] **Polish Client App** — Wire all pages to live data

