# 📦 Order Service (SAGA Orchestrator)

Handles order creation using the SAGA pattern with persistent PostgreSQL storage.

## 📖 What This Service Does

The Order Service is the **SAGA orchestrator** — when a customer places an order, it coordinates 3 different services in sequence, and if any step fails, it undoes (compensates) the previous steps.

```
Client → Gateway (:5000) → Order Service (:4004) → PostgreSQL (:5432)
                                   │
                                   ├── Step 1: Warehouse (TCP Adapter)  → Reserve inventory
                                   ├── Step 2: Logistics (REST Adapter) → Schedule delivery
                                   └── Step 3: Legacy CMS (SOAP Adapter) → Submit order
```

## 🧠 Key Concepts

### The SAGA Pattern

A SAGA is a sequence of steps where each step can be **undone** if a later step fails:

```
HAPPY PATH:
  Step 1: Reserve Inventory  ✅
  Step 2: Schedule Delivery  ✅
  Step 3: Submit to CMS      ✅
  Result: Order COMPLETED ✅

FAILURE PATH:
  Step 1: Reserve Inventory  ✅
  Step 2: Schedule Delivery  ✅
  Step 3: Submit to CMS      ❌ FAILED!
  Compensate: Cancel Delivery  ↩️
  Compensate: Release Inventory ↩️
  Result: Order FAILED (but no orphaned data)
```

### PostgreSQL Storage

Orders are persisted in the database with their full SAGA history:

```sql
orders table:
| id       | user_id | status    | saga_log (JSONB)                       |
|----------|---------|-----------|----------------------------------------|
| ORD-001  | USR-001 | COMPLETED | [{"step":"WAREHOUSE","status":"OK"},..] |
| ORD-002  | USR-002 | FAILED    | [{"step":"WAREHOUSE","status":"OK"},..] |
| ORD-003  | USR-001 | PENDING   | []                                     |
```

### JSONB for Flexible Data

The `items` and `saga_log` columns use **JSONB** — PostgreSQL's JSON column type. This lets us store flexible, nested data without needing extra tables:

```javascript
items: [
    { sku: "ITEM-001", quantity: 2, name: "Widget A" },
    { sku: "ITEM-002", quantity: 1, name: "Gadget B" }
]

saga_log: [
    { step: "WAREHOUSE", status: "COMPLETED", data: {...} },
    { step: "LOGISTICS", status: "COMPLETED", data: {...} },
    { step: "LEGACY_CMS", status: "FAILED", error: "timeout" }
]
```

## 🚀 Quick Start

```bash
# Prerequisites: PostgreSQL + RabbitMQ running (docker-compose up -d)
cd order-service
npm install
node index.js
```

## 📍 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/orders` | List all orders (most recent first) |
| `POST` | `/orders` | Create order (triggers SAGA) |
| `GET`  | `/orders/:orderId` | Get a single order by ID |

### Create Order — Request Body

```json
{
    "items": [
        { "sku": "ITEM-001", "quantity": 2 }
    ],
    "destination": "42 Wallaby Way, Sydney",
    "paymentMethod": "credit_card"
}
```

### Create Order — Response

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

## 📊 Order Status Lifecycle

```
PENDING → COMPLETED   (all SAGA steps succeeded)
PENDING → FAILED      (a SAGA step failed, compensation ran)
```

## 📁 File Structure

```
order-service/
├── index.js       # Main server — SAGA orchestrator + routes
├── package.json   # Dependencies (express, axios, pg)
└── README.md      # This file
```

## 🔄 The SAGA Flow (Step by Step)

```
1. POST /orders received
2. INSERT INTO orders (status = 'PENDING') → Save to DB immediately
3. Step 1: POST /api/warehouse/packages → Reserve inventory
4. Step 2: POST /api/routes/optimize → Schedule delivery
5. Step 3: POST /soap/submit-order → Submit to legacy system
6. If ALL steps pass:
   UPDATE orders SET status = 'COMPLETED', saga_log = [...]
7. If ANY step fails:
   Run compensation (undo previous steps)
   UPDATE orders SET status = 'FAILED', saga_log = [...]
```

## 📚 Further Reading

- `.agent/Middleware_Learning_Guide.md` — Middleware concepts
- `.agent/PostgreSQL_Database_Deep_Dive.md` — Database concepts
- `.agent/SwiftLogistics_Architecture_Design.md` — Full system architecture
