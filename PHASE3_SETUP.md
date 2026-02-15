# Phase 3 - API Gateway Setup Guide

## 🎯 What We Built

The **API Gateway** is a unified entry point that sits in front of all your protocol adapters, providing:
- Single port (5000) for all client requests
- Intelligent routing to REST, SOAP, or TCP adapters
- Request logging and metrics
- Health monitoring
- Consistent error handling

---

## 📥 Installation

### Step 1: Install Dependencies

```bash
cd api-gateway
npm install
```

### Step 2: Verify All Services Are Running

You need these services running **BEFORE** starting the gateway:

1. **RabbitMQ** (port 5672)
   ```bash
   docker-compose up -d
   ```

2. **Mock Services** (3 terminals)
   ```bash
   cd mock-services/mock-ros && npm run dev
   cd mock-services/mock-cms && npm run dev
   cd mock-services/mock-wms && npm run dev
   ```

3. **Protocol Adapters** (3 terminals)
   ```bash
   cd adapters/rest-adapter && node index.js
   cd adapters/soap-adapter && node index.js
   cd adapters/tcp-adapter && node index.js
   ```

4. **Workers** (3 terminals)
   ```bash
   cd workers/ros-worker && node index.js
   cd workers/cms-worker && node index.js
   cd workers/wms-worker && node index.js
   ```

---

## 🚀 Running the Gateway

### Terminal 11: API Gateway

```bash
cd api-gateway
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║           🌐 API GATEWAY - PHASE 3                    ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║   🚀 Gateway URL: http://localhost:5000                ║
║                                                        ║
║   📍 REST API:        /api/routes/*                    ║
║   📍 SOAP API:        /soap                            ║
║   📍 Warehouse API:   /api/warehouse/*                 ║
║                                                        ║
║   🏥 Health Check:    /health                          ║
║   📊 Metrics:         /metrics                         ║
╚════════════════════════════════════════════════════════╝
```

---

## 🧪 Testing the Gateway

### Quick Test: Health Check

```bash
curl http://localhost:5000/health
```

### Run Full Test Suite

```bash
node test-gateway.js
```

Expected output:
```
🎉🎉🎉 API GATEWAY FULLY OPERATIONAL! 🎉🎉🎉

✨ Phase 3 - Part 1: API Gateway ✅ COMPLETE

📊 Overall: 5/5 tests passing (100%)
```

---

## 📍 Using the Gateway

### Before (Phase 2):
Clients had to know about 3 different ports:
- REST: http://localhost:3001/api/routes/optimize
- SOAP: http://localhost:3002/soap
- TCP: Raw socket to localhost:3003

### After (Phase 3):
Everything goes through **one port**:
- REST: http://localhost:5000/api/routes/optimize
- SOAP: http://localhost:5000/soap
- Warehouse: http://localhost:5000/api/warehouse/packages

---

## 🌟 New Capabilities

### 1. Health Monitoring

```bash
curl http://localhost:5000/health
```

Returns:
```json
{
  "status": "healthy",
  "services": {
    "restAdapter": "healthy",
    "soapAdapter": "healthy",
    "tcpAdapter": "assumed-healthy"
  }
}
```

### 2. Metrics Tracking

```bash
curl http://localhost:5000/metrics
```

Returns:
```json
{
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

### 3. Intelligent Routing

The gateway automatically detects protocol and routes:

```bash
# REST request → routes to REST Adapter
curl -X POST http://localhost:5000/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-001","address":"123 St","priority":"high"}'

# Warehouse request → routes to TCP Adapter
curl -X POST http://localhost:5000/api/warehouse/packages \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-002","items":[{"sku":"ITEM-001","quantity":2}],"destination":"Warehouse A"}'
```

---

## 🎨 Architecture Evolution

### Phase 2:
```
Clients → 3 Different Adapters (3001, 3002, 3003)
```

### Phase 3:
```
Clients → API Gateway (5000) → 3 Adapters (transparent)
```

---

## ✅ Checklist

- [ ] RabbitMQ running
- [ ] All 3 mock services running
- [ ] All 3 adapters running
- [ ] All 3 workers running  
- [ ] API Gateway running (`npm run dev`)
- [ ] **Winston installed** (`npm install winston`)
- [ ] **Dashboard working** (`monitoring-dashboard.html`)
- [ ] **Security active** (API Key + Rate Limit)
- [ ] `node test-security.js` passes 4/4
- [ ] `node test-gateway.js` passes 5/5 tests

---

## 🚀 What's Next?

### Phase 3 - Part 4: Resilience
- Circuit breaker pattern
- Retry logic
- Dead letter queues
- Fallback strategies

---

## 📚 Resources

- **API Gateway README**: `api-gateway/README.md`
- **Dashboard**: `monitoring-dashboard.html`
- **Security Check**: `node test-security.js`

---

**Status**: Phase 3 - Part 3 ✅ COMPLETE  
**Next**: Part 4 - Resilience
