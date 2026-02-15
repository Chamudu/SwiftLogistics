# SwiftLogistics Middleware Architecture

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Protocol Details](#protocol-details)
- [Scalability & Resilience](#scalability--resilience)

## Overview

SwiftLogistics is a distributed middleware system that integrates multiple legacy systems using different communication protocols (REST, SOAP, TCP) through a central message broker (RabbitMQ).

### Key Objectives

- **Protocol Abstraction**: Hide protocol complexity from business logic
- **Decoupling**: Services communicate asynchronously via message broker
- **Scalability**: Horizontal scaling of workers and adapters
- **Reliability**: Message persistence and acknowledgment patterns

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  REST    │  │  SOAP    │  │   TCP    │                 │
│  │ Clients  │  │ Clients  │  │ Clients  │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
└───────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                         │
│             (Port 5000 | Monitoring & Auth)                 │
│                                                             │
│   ┌────────────────────────────────────────────────────┐    │
│   │             ⚡  Unified Entry Point  ⚡             │    │
│   └───────────────────────┬────────────────────────────┘    │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     ADAPTER LAYER                           │
│  ┌────▼─────┐  ┌───▼──────┐  ┌──▼───────┐               │
│  │   REST   │  │   SOAP   │  │   TCP    │               │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │               │
│  │ :3001    │  │  :3002   │  │  :3003   │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
└───────┼─────────────┼─────────────┼───────────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
┌─────────────────────▼─────────────────────────────────────┐
│              MESSAGE BROKER (RabbitMQ)                     │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ ros_exchange  │  │ cms_exchange  │  │ wms_exchange │  │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘  │
│          │                  │                  │          │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼───────┐  │
│  │ route.optimize│  │ order.submit  │  │package.create│  │
│  │ route.get     │  │ order.status  │  │package.status│  │
│  │ route.update  │  │ order.cancel  │  │package.update│  │
│  │               │  │ client.info   │  │inventory.get │  │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘  │
└──────────┼──────────────────┼──────────────────┼─────────┘
           │                  │                  │
┌──────────┼──────────────────┼──────────────────┼─────────┐
│          │                  │                  │         │
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼───────┐ │
│  │  ROS Worker   │  │  CMS Worker   │  │  WMS Worker  │ │
│  └───────┬───────┘  └───────┬───────┘  └──────┬───────┘ │
└──────────┼──────────────────┼──────────────────┼─────────┘
           │                  │                  │
┌──────────┼──────────────────┼──────────────────┼─────────┐
│  ┌───────▼───────┐  ┌───────▼───────┐  ┌──────▼───────┐ │
│  │   Mock ROS    │  │   Mock CMS    │  │   Mock WMS   │ │
│  │   REST API    │  │  SOAP Service │  │  TCP Socket  │ │
│  │    :4002      │  │     :4000     │  │    :4001     │ │
│  └───────────────┘  └───────────────┘  └──────────────┘ │
│                    LEGACY SYSTEMS LAYER                  │
└──────────────────────────────────────────────────────────┘
```

## Component Design

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

## Security Considerations

**Current Implementation (Development):**
- ⚠️ Hardcoded RabbitMQ credentials
- ⚠️ No authentication on adapters
- ⚠️ No TLS/SSL encryption
- ⚠️ No input validation

**Production Recommendations:**
- ✅ Environment variables for credentials
- ✅ OAuth/API keys for adapter authentication
- ✅ TLS for all communications
- ✅ Input validation and sanitization
- ✅ Rate limiting
- ✅ CORS configuration

## Conclusion

This architecture provides:
- ✅ **Flexibility**: Support for multiple protocols
- ✅ **Scalability**: Horizontal scaling of workers
- ✅ **Reliability**: Message persistence and acknowledgment
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Testability**: Easy to test individual components

The middleware successfully abstracts protocol complexity and enables seamless integration of heterogeneous systems through a unified message-based architecture.
