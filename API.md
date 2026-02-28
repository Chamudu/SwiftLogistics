# SwiftLogistics API Documentation

## 📋 Table of Contents

- [Authentication API](#authentication-api)
- [Orders API](#orders-api)
- [REST API (Routes)](#rest-api-routes)
- [SOAP API (Client Management)](#soap-api-client-management)
- [TCP API (Warehouse)](#tcp-api-warehouse)
- [WebSocket API (Real-Time)](#websocket-api-real-time)
- [System Endpoints](#system-endpoints)
- [Error Handling](#error-handling)

---

## Gateway Access

**Base URL**: `http://localhost:5000`

All endpoints go through the API Gateway on port 5000. The gateway handles routing, authentication, and rate limiting.

### Authentication Headers

Most endpoints require authentication via one of:

```
# JWT Bearer token (from frontend)
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# API key (for internal services)
x-api-key: swift-123-secret
```

### Public Endpoints (No Auth Required)
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `GET /health`
- `GET /metrics`

---

## Authentication API

**Service**: Auth Service (Port 4005, proxied through Gateway)

### Register

Create a new user account.

**Endpoint**: `POST /auth/register`  
**Auth Required**: No

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure123",
  "role": "customer"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Full name |
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Min 6 characters |
| `role` | string | No | `customer` (default) or `driver` |

**Success Response** (201):
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "USR-A1B2C3D4",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "title": "Business Client",
    "avatar": "JD"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

---

### Login

Authenticate and receive JWT tokens.

**Endpoint**: `POST /auth/login`  
**Auth Required**: No

**Request Body**:
```json
{
  "email": "sarah@swiftlogistics.com",
  "password": "password123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "USR-001",
    "name": "Sarah Chen",
    "email": "sarah@swiftlogistics.com",
    "role": "admin",
    "title": "Operations Manager"
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": "15m"
  }
}
```

**Error Response** (401):
```json
{
  "success": false,
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
```

**Demo Credentials**:

| Role | Email | Password |
|------|-------|----------|
| Admin | sarah@swiftlogistics.com | password123 |
| Customer | james@acmecorp.com | password123 |
| Driver | mike@swiftlogistics.com | password123 |

---

### Refresh Token

Get a new access token using the refresh token.

**Endpoint**: `POST /auth/refresh`  
**Auth Required**: No

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "tokens": {
    "accessToken": "eyJ...(new)...",
    "expiresIn": "15m"
  }
}
```

---

### Logout

Invalidate the current session.

**Endpoint**: `POST /auth/logout`  
**Auth Required**: Yes (Bearer token)

**Success Response** (200):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Profile

Get the authenticated user's profile.

**Endpoint**: `GET /auth/me`  
**Auth Required**: Yes (Bearer token)

**Success Response** (200):
```json
{
  "success": true,
  "user": {
    "id": "USR-001",
    "name": "Sarah Chen",
    "email": "sarah@swiftlogistics.com",
    "role": "admin",
    "title": "Operations Manager",
    "avatar": "SC",
    "created_at": "2024-02-28T09:00:00.000Z"
  }
}
```

---

### Verify Token

Check if a token is valid (used by API Gateway).

**Endpoint**: `GET /auth/verify`  
**Auth Required**: Yes (Bearer token)

**Success Response** (200):
```json
{
  "success": true,
  "valid": true,
  "user": {
    "userId": "USR-001",
    "email": "sarah@swiftlogistics.com",
    "role": "admin",
    "name": "Sarah Chen"
  }
}
```

---

### List Users (Admin Only)

**Endpoint**: `GET /auth/users`  
**Auth Required**: Yes (Admin Bearer token)

**Success Response** (200):
```json
{
  "success": true,
  "count": 3,
  "users": [
    { "id": "USR-001", "name": "Sarah Chen", "role": "admin", ... },
    { "id": "USR-002", "name": "James Wilson", "role": "customer", ... },
    { "id": "USR-003", "name": "Mike Torres", "role": "driver", ... }
  ]
}
```

---

## Orders API

**Service**: Order Service (Port 4004, proxied through Gateway)

### List Orders

**Endpoint**: `GET /orders`  
**Auth Required**: Yes

**Success Response** (200):
```json
[
  {
    "id": "ORD-1709100000000",
    "user_id": "USR-001",
    "items": [{"sku": "ITEM-001", "quantity": 2}],
    "destination": "42 Wallaby Way, Sydney",
    "status": "COMPLETED",
    "saga_log": [
      {"step": "WAREHOUSE", "status": "COMPLETED"},
      {"step": "LOGISTICS", "status": "COMPLETED"},
      {"step": "LEGACY_CMS", "status": "COMPLETED"}
    ],
    "created_at": "2024-02-28T09:00:00.000Z"
  }
]
```

---

### Create Order

Triggers the SAGA orchestration (Warehouse → Logistics → CMS).

**Endpoint**: `POST /orders`  
**Auth Required**: Yes

**Request Body**:
```json
{
  "items": [
    { "sku": "ITEM-001", "quantity": 2 },
    { "sku": "ITEM-002", "quantity": 1 }
  ],
  "destination": "42 Wallaby Way, Sydney"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "orderId": "ORD-1709100000000",
  "message": "Order created successfully",
  "details": {
    "packageId": "PKG-ORD-...",
    "routeId": "RTE-...",
    "status": "CONFIRMED"
  },
  "sagaLog": [
    { "step": "WAREHOUSE", "status": "COMPLETED" },
    { "step": "LOGISTICS", "status": "COMPLETED" },
    { "step": "LEGACY_CMS", "status": "COMPLETED" }
  ]
}
```

---

### Get Order

**Endpoint**: `GET /orders/:orderId`  
**Auth Required**: Yes

**Success Response** (200):
```json
{
  "id": "ORD-1709100000000",
  "user_id": "USR-001",
  "items": [...],
  "destination": "...",
  "status": "COMPLETED",
  "saga_log": [...]
}
```

---

## REST API (Routes)

**Service**: REST Adapter (Port 3001, proxied through Gateway)

### Optimize Route

**Endpoint**: `POST /api/routes/optimize`  
**Auth Required**: Yes

**Request Body**:
```json
{
  "packageId": "PKG-001",
  "address": "123 Main Street, Colombo",
  "priority": "high"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packageId` | string | Yes | Unique package identifier |
| `address` | string | Yes | Delivery address |
| `priority` | string | No | `high`, `medium` (default), `low` |

**Success Response** (200):
```json
{
  "success": true,
  "routeId": "ROUTE-1001",
  "driverId": "DRV-5",
  "distance": 24.5,
  "estimatedDeliveryTime": "2024-02-15T14:30:00Z"
}
```

---

### Get Route

**Endpoint**: `GET /api/routes/:routeId`  
**Auth Required**: Yes

---

### Update Route

**Endpoint**: `PUT /api/routes/:routeId`  
**Auth Required**: Yes

**Request Body**:
```json
{
  "status": "DELIVERED",
  "currentLocation": "Destination"
}
```

---

## SOAP API (Client Management)

**Service**: SOAP Adapter (Port 3002, proxied through Gateway)

### JSON Endpoint (via Gateway)

**Endpoint**: `POST /soap/submit-order`  
**Auth Required**: Yes

**Request Body** (JSON — gateway converts to SOAP):
```json
{
  "clientId": "CL-001",
  "packageId": "PKG-001",
  "pickupAddress": "100 Main Street, Kandy",
  "deliveryAddress": "200 King Street, Galle",
  "packageWeight": "5.5",
  "packageDimensions": "30x20x15",
  "deliveryType": "express"
}
```

### Direct SOAP Endpoint

**WSDL**: `GET /soap/wsdl`  
**SOAP**: `POST /soap` (Content-Type: text/xml)

### Operations
- `SubmitOrder` — Create a new order
- `GetOrderStatus` — Query order status
- `CancelOrder` — Cancel an order
- `GetClientInfo` — Retrieve client info

---

## TCP API (Warehouse)

**Service**: TCP Adapter (Port 3003, accessed via REST proxy through Gateway)

### Create Package

**Endpoint**: `POST /api/warehouse/packages`  
**Auth Required**: Yes

**Request Body**:
```json
{
  "packageId": "PKG-001",
  "items": [
    { "sku": "ITEM-001", "quantity": 2 }
  ],
  "destination": "Warehouse B"
}
```

### Get Package Status

**Endpoint**: `GET /api/warehouse/packages/:packageId`  
**Auth Required**: Yes

### Get Inventory

**Endpoint**: `GET /api/warehouse/inventory`  
**Auth Required**: Yes

---

## System Endpoints

### Health Check

**Endpoint**: `GET /health`  
**Auth Required**: No

```json
{
  "status": "healthy",
  "timestamp": "2024-02-28T09:00:00Z",
  "uptime": 3600,
  "services": {
    "restAdapter": "healthy",
    "soapAdapter": "healthy",
    "tcpAdapter": "assumed-healthy",
    "authService": "healthy"
  }
}
```

### Metrics

**Endpoint**: `GET /metrics`  
**Auth Required**: No

```json
{
  "uptime": "3600s",
  "totalRequests": 150,
  "successfulRequests": 145,
  "failedRequests": 5,
  "successRate": "96.67%",
  "requestsByProtocol": {
    "rest": 80,
    "soap": 45,
    "tcp": 25
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (new resource) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (e.g., email already exists) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "success": false,
  "error": "Short error name",
  "message": "Human-readable explanation"
}
```

---

## WebSocket API (Real-Time)

**URL**: `ws://localhost:4006` (Socket.IO)

The WebSocket service provides real-time updates. It is a **separate service** (not behind the gateway).

### Client Connection (Socket.IO)

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4006', {
    transports: ['websocket', 'polling']
});

// Authenticate after connecting
socket.emit('authenticate', {
    userId: 'USR-001',
    role: 'admin',
    name: 'Sarah'
});

// Listen for order updates
socket.on('order:updated', (data) => {
    console.log(data);
    // { orderId, status, sagaStep, message, timestamp }
});

// Watch a specific order
socket.emit('watch:order', 'ORD-123');
```

### Events (Client → Server)

| Event | Payload | Purpose |
|-------|---------|--------|
| `authenticate` | `{ userId, role, name }` | Join user/role rooms |
| `watch:order` | `"ORD-123"` | Subscribe to order updates |
| `unwatch:order` | `"ORD-123"` | Unsubscribe |

### Events (Server → Client)

| Event | Payload | When |
|-------|---------|------|
| `authenticated` | `{ message, rooms }` | After auth |
| `order:updated` | `{ orderId, status, sagaStep, message, timestamp }` | SAGA step completes |
| `notification` | `{ type, title, message, timestamp }` | System alert |

### REST Bridge Endpoints

Other services use these REST endpoints to trigger WebSocket broadcasts:

#### `POST http://localhost:4006/emit/order-update`

```json
{
    "orderId": "ORD-123",
    "userId": "USR-001",
    "status": "PROCESSING",
    "sagaStep": "WAREHOUSE",
    "message": "Inventory reserved"
}
```

#### `POST http://localhost:4006/emit/notification`

```json
{
    "type": "info",
    "title": "System Update",
    "message": "Maintenance at 2AM",
    "targetRole": "admin"
}
```

#### `GET http://localhost:4006/health`

Returns service status and connected clients.

---

## Testing

```bash
# Auth tests (14 tests)
node test-auth.js

# Protocol integration tests
node test-all-protocols.js

# Gateway tests
node test-gateway.js
```
