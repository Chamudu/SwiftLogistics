The API Gateway is a unified entry point for all SwiftLogistics protocols. It provides intelligent routing, **Monitoring**, and **Security**.

## Features

✅ **Unified Entry Point** - Single port (5000) for all protocols  
✅ **Intelligent Routing** - Automatically routes to appropriate adapter  
✅ **Security** - API Key Authentication & Rate Limiting  
✅ **Resilience** - Automatic Retries & Error Handling  
✅ **Structured Logging** - Winston-based JSON logging (`gateway.log`)  
✅ **Metrics Console** - Real-time HTML dashboard (`monitoring-dashboard.html`)  
✅ **Health Monitoring** - Checks status of all backend services  
✅ **Error Handling** - Consistent error responses  

## Installation

```bash
cd api-gateway
npm install
```

## Running

```bash
npm run dev
```

The API Gateway will start on **http://localhost:5000**

## API Endpoints

### System Endpoints

#### Health Check
```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-02-15T14:30:00Z",
  "uptime": 3600,
  "services": {
    "restAdapter": "healthy",
    "soapAdapter": "healthy",
    "tcpAdapter": "assumed-healthy"
  }
}
```

#### Metrics
```bash
GET /metrics
```

**Response:**
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
  },
  "timestamp": "2024-02-15T14:30:00Z"
}
```

---

### REST API (Route Optimization)

#### Optimize Route
```bash
POST /api/routes/optimize
Content-Type: application/json

{
  "packageId": "PKG-001",
  "address": "123 Main St",
  "priority": "high"
}
```

#### Get Route
```bash
GET /api/routes/:routeId
```

#### Update Route
```bash
PUT /api/routes/:routeId
Content-Type: application/json

{
  "status": "DELIVERED"
}
```

---

### SOAP API (Client Management)

#### WSDL
```bash
GET /soap/wsdl
```

#### SOAP Endpoint
```bash
POST /soap
Content-Type: text/xml

<soap:Envelope>
  ...
</soap:Envelope>
```

---

### Warehouse API (TCP via REST)

#### Create Package
```bash
POST /api/warehouse/packages
Content-Type: application/json

{
  "packageId": "PKG-001",
  "items": [
    { "sku": "ITEM-001", "quantity": 2 }
  ],
  "destination": "Warehouse B"
}
```

#### Get Package Status
```bash
GET /api/warehouse/packages/:packageId
```

#### Get Inventory
```bash
GET /api/warehouse/inventory
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           Clients (Any Protocol)            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│          🌐 API GATEWAY (Port 5000)          │
│  ┌────────────────────────────────────────┐  │
│  │  • Protocol Detection                  │  │
│  │  • Request Routing                     │  │
│  │  • Logging & Metrics                   │  │
│  │  • Health Monitoring                   │  │
│  └────────────────────────────────────────┘  │
└──────┬──────────────┬──────────────┬─────────┘
       │              │              │
       ▼              ▼              ▼
  REST Adapter   SOAP Adapter   TCP Adapter
   (:3001)        (:3002)        (:3003)
       │              │              │
       ▼              ▼              ▼
   RabbitMQ      RabbitMQ       RabbitMQ
```

## Benefits

### For Clients
- **Single Endpoint**: No need to know about individual adapters
- **Consistent Interface**: Unified error handling and responses
- **Protocol Abstraction**: Easy to switch between protocols

### For Operations
- **Centralized Logging**: All requests in one place
- **Metrics**: Real-time visibility into system health
- **Monitoring**: Easy to track adapter status

### For Development
- **Easy Testing**: Single entry point for all protocols
- **Future-Proof**: Easy to add authentication, rate limiting, etc.
- **Scalability**: Can add load balancing later

## Examples

### Test REST via Gateway
```bash
curl -X POST http://localhost:5000/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-GW-001",
    "address": "456 Gateway Ave",
    "priority": "high"
  }'
```

### Check Gateway Health
```bash
curl http://localhost:5000/health
```

### View Metrics
```bash
curl http://localhost:5000/metrics
```

## Deployment

### Development
```bash
npm run dev
```

### Production (with PM2)
```bash
pm2 start index.js --name api-gateway
```

## Security

The gateway is protected by:
*   **API Key Authentication**: Required `x-api-key` header.
    *   Valid Keys: `swift-123-secret`, `logistic-999-key`, `test-key-001`
*   **Rate Limiting**: Max 100 requests per 15 minutes per IP.

## Resilience

The gateway uses a custom resilience module to ensure stability:
*   **Automatic Retries**: Failed requests are retried 3 times with exponential backoff.
*   **Error Handling**: Unified error responses for better client experience.

## Next Steps

Phase 3 Enhancements:
- [x] **Monitoring & Observability** (Completed)
- [x] **Security (API Keys & Rate Limit)** (Completed)
- [x] **Resilience (Retries)** (Completed)

---

**Phase**: 3 (All Parts)  
**Status**: ✅ FULLY COMPLETE
