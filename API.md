# SwiftLogistics API Documentation

## 📋 Table of Contents

- [REST API](#rest-api)
- [SOAP API](#soap-api)
- [TCP API](#tcp-api)
- [Message Formats](#message-formats)
- [Error Handling](#error-handling)

---

## REST API

**Base URL**: `http://localhost:3001`

### Health Check

Check if the REST adapter is running.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "OK",
  "service": "REST Adapter",
  "uptime": 12345
}
```

---

### Optimize Route

Optimize delivery route for a package.

**Endpoint**: `POST /api/routes/optimize`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "packageId": "PKG-001",
  "address": "123 Main Street, Colombo",
  "priority": "high"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packageId` | string | Yes | Unique package identifier |
| `address` | string | Yes | Delivery address |
| `priority` | string | No | Priority level: "high", "medium", "low" (default: "medium") |

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

**Error Response** (400):
```json
{
  "success": false,
  "error": "Missing required field: packageId"
}
```

**Error Response** (500):
```json
{
  "success": false,
  "error": "Failed to optimize route"
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-001",
    "address": "123 Main St, Colombo",
    "priority": "high"
  }'
```

---

### Get Route

Retrieve details of a specific route.

**Endpoint**: `GET /api/routes/:routeId`

**URL Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `routeId` | string | Route identifier |

**Success Response** (200):
```json
{
  "success": true,
  "route": {
    "routeId": "ROUTE-1001",
    "driverId": "DRV-5",
    "packageId": "PKG-001",
    "status": "IN_TRANSIT",
    "currentLocation": "Colombo Fort",
    "estimatedDeliveryTime": "2024-02-15T14:30:00Z",
    "distance": 24.5,
    "createdAt": "2024-02-15T10:00:00Z"
  }
}
```

**Error Response** (404):
```json
{
  "success": false,
  "error": "Route not found"
}
```

**Example**:
```bash
curl http://localhost:3001/api/routes/ROUTE-1001
```

---

### Update Route

Update route information.

**Endpoint**: `PUT /api/routes/:routeId`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "status": "DELIVERED",
  "currentLocation": "Destination",
  "actualDeliveryTime": "2024-02-15T14:25:00Z"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Route status |
| `currentLocation` | string | No | Current location |
| `actualDeliveryTime` | string | No | Actual delivery timestamp |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Route updated successfully"
}
```

**Example**:
```bash
curl -X PUT http://localhost:3001/api/routes/ROUTE-1001 \
  -H "Content-Type: application/json" \
  -d '{"status": "DELIVERED"}'
```

---

## SOAP API

**WSDL URL**: `http://localhost:3002/soap?wsdl`  
**Endpoint**: `http://localhost:3002/soap`

### SubmitOrder

Create a new order in the system.

**Operation**: `SubmitOrder`

**Request**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SubmitOrder xmlns="http://swiftlogistics.com/cms">
      <clientId>CL-001</clientId>
      <packageId>PKG-001</packageId>
      <pickupAddress>100 Main Street, Kandy</pickupAddress>
      <deliveryAddress>200 King Street, Galle</deliveryAddress>
      <packageWeight>5.5</packageWeight>
      <packageDimensions>30x20x15</packageDimensions>
      <deliveryType>express</deliveryType>
    </SubmitOrder>
  </soap:Body>
</soap:Envelope>
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clientId` | string | Yes | Client identifier |
| `packageId` | string | Yes | Package identifier |
| `pickupAddress` | string | Yes | Pickup location |
| `deliveryAddress` | string | Yes | Delivery destination |
| `packageWeight` | float | Yes | Weight in kg |
| `packageDimensions` | string | Yes | Dimensions (LxWxH cm) |
| `deliveryType` | string | Yes | "standard" or "express" |

**Response**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SubmitOrderResponse xmlns="http://swiftlogistics.com/cms">
      <success>true</success>
      <orderId>ORD-1001</orderId>
      <message>Order successfully submitted</message>
      <estimatedCost>25.50</estimatedCost>
      <estimatedDeliveryDate>2024-02-16</estimatedDeliveryDate>
    </SubmitOrderResponse>
  </soap:Body>
</soap:Envelope>
```

**Node.js Example**:
```javascript
import soap from 'soap';

const url = 'http://localhost:3002/soap?wsdl';
const client = await soap.createClientAsync(url);

const args = {
  clientId: 'CL-001',
  packageId: 'PKG-001',
  pickupAddress: '100 Main St',
  deliveryAddress: '200 King St',
  packageWeight: 5.5,
  packageDimensions: '30x20x15',
  deliveryType: 'express'
};

const result = await client.SubmitOrderAsync(args);
console.log(result);
```

---

### GetOrderStatus

Query the status of an existing order.

**Operation**: `GetOrderStatus`

**Request**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetOrderStatus xmlns="http://swiftlogistics.com/cms">
      <orderId>ORD-1001</orderId>
    </GetOrderStatus>
  </soap:Body>
</soap:Envelope>
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | string | Yes | Order identifier |

**Response**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetOrderStatusResponse xmlns="http://swiftlogistics.com/cms">
      <success>true</success>
      <orderId>ORD-1001</orderId>
      <status>IN_TRANSIT</status>
      <currentLocation>Processing Center - Colombo</currentLocation>
      <estimatedDelivery>2024-02-16T10:00:00Z</estimatedDelivery>
      <lastUpdate>2024-02-15T14:30:00Z</lastUpdate>
    </GetOrderStatusResponse>
  </soap:Body>
</soap:Envelope>
```

---

### CancelOrder

Cancel an existing order.

**Operation**: `CancelOrder`

**Request**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CancelOrder xmlns="http://swiftlogistics.com/cms">
      <orderId>ORD-1001</orderId>
      <reason>Customer request</reason>
    </CancelOrder>
  </soap:Body>
</soap:Envelope>
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | string | Yes | Order identifier |
| `reason` | string | No | Cancellation reason |

**Response**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CancelOrderResponse xmlns="http://swiftlogistics.com/cms">
      <success>true</success>
      <orderId>ORD-1001</orderId>
      <message>Order cancelled successfully</message>
      <refundAmount>25.50</refundAmount>
    </CancelOrderResponse>
  </soap:Body>
</soap:Envelope>
```

---

### GetClientInfo

Retrieve client information.

**Operation**: `GetClientInfo`

**Request**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetClientInfo xmlns="http://swiftlogistics.com/cms">
      <clientId>CL-001</clientId>
    </GetClientInfo>
  </soap:Body>
</soap:Envelope>
```

**Response**:
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetClientInfoResponse xmlns="http://swiftlogistics.com/cms">
      <success>true</success>
      <clientId>CL-001</clientId>
      <name>Acme Corporation</name>
      <email>contact@acme.com</email>
      <phone>+94112345678</phone>
      <address>123 Business St, Colombo</address>
      <accountStatus>ACTIVE</accountStatus>
    </GetClientInfoResponse>
  </soap:Body>
</soap:Envelope>
```

---

## TCP API

**Protocol**: Custom length-prefixed JSON over TCP  
**Endpoint**: `localhost:3003`

### Protocol Specification

**Message Structure**:
```
[4 bytes: Message Length (UInt32BE)] [JSON Payload]
```

**Example Wire Format**:
```
0x00 0x00 0x00 0x9E  {...JSON...}
^                    ^
|                    |
Length (158 bytes)   Payload
```

---

### CREATE_PACKAGE

Create a new package in the warehouse.

**Action**: `CREATE_PACKAGE`

**Request**:
```json
{
  "action": "CREATE_PACKAGE",
  "data": {
    "packageId": "PKG-001",
    "items": [
      { "sku": "ITEM-001", "quantity": 2 },
      { "sku": "ITEM-002", "quantity": 5 }
    ],
    "destination": "Warehouse B"
  }
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packageId` | string | Yes | Package identifier |
| `items` | array | Yes | Array of items with sku and quantity |
| `destination` | string | Yes | Destination warehouse |

**Response**:
```json
{
  "status": "SUCCESS",
  "packageId": "PKG-5001",
  "estimatedPickTime": "2024-02-15T15:30:00Z",
  "zone": "A1"
}
```

**Node.js Example**:
```javascript
import net from 'net';

const socket = new net.Socket();

socket.connect(3003, 'localhost', () => {
  const message = {
    action: 'CREATE_PACKAGE',
    data: {
      packageId: 'PKG-001',
      items: [{ sku: 'ITEM-001', quantity: 2 }],
      destination: 'Warehouse B'
    }
  };
  
  const json = JSON.stringify(message);
  const length = Buffer.byteLength(json);
  
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(length, 0);
  
  socket.write(lengthBuffer);
  socket.write(Buffer.from(json));
});

socket.on('data', (data) => {
  const length = data.readUInt32BE(0);
  const json = data.slice(4, 4 + length).toString();
  const response = JSON.parse(json);
  console.log(response);
  socket.end();
});
```

---

### GET_PACKAGE_STATUS

Query the status of a package.

**Action**: `GET_PACKAGE_STATUS`

**Request**:
```json
{
  "action": "GET_PACKAGE_STATUS",
  "data": {
    "packageId": "PKG-5001"
  }
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packageId` | string | Yes | Package identifier |

**Response**:
```json
{
  "status": "SUCCESS",
  "package": {
    "packageId": "PKG-5001",
    "orderId": "ORD-1001",
    "status": "PENDING",
    "zone": "A1",
    "estimatedPickTime": "2024-02-15T15:30:00Z",
    "createdAt": "2024-02-15T14:00:00Z"
  }
}
```

---

### UPDATE_PACKAGE_STATUS

Update the status of a package.

**Action**: `UPDATE_PACKAGE_STATUS`

**Request**:
```json
{
  "action": "UPDATE_PACKAGE_STATUS",
  "data": {
    "packageId": "PKG-5001",
    "newStatus": "PICKED"
  }
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `packageId` | string | Yes | Package identifier |
| `newStatus` | string | Yes | New status: "PENDING", "PICKED", "PACKED", "SHIPPED" |

**Response**:
```json
{
  "status": "SUCCESS",
  "packageId": "PKG-5001",
  "newStatus": "PICKED"
}
```

---

### GET_INVENTORY

Retrieve current inventory levels.

**Action**: `GET_INVENTORY`

**Request**:
```json
{
  "action": "GET_INVENTORY",
  "data": {}
}
```

**Response**:
```json
{
  "status": "SUCCESS",
  "inventory": [
    {
      "sku": "ITEM-001",
      "name": "Laptop Computer",
      "quantity": 50,
      "zone": "A1"
    },
    {
      "sku": "ITEM-002",
      "name": "Wireless Mouse",
      "quantity": 200,
      "zone": "A2"
    }
  ]
}
```

---

## Message Formats

### RabbitMQ Message Format

All messages sent through RabbitMQ follow this structure:

```json
{
  "action": "ACTION_NAME",
  "data": {
    // Action-specific data
  },
  "timestamp": "2024-02-15T14:30:00Z"
}
```

**Message Properties**:
- `correlationId`: Unique identifier for request/reply matching
- `replyTo`: Temporary queue for receiving responses
- `persistent`: true (messages survive broker restarts)
- `contentType`: "application/json"

---

## Error Handling

### HTTP Error Codes (REST)

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (invalid parameters) |
| 404 | Not Found (resource doesn't exist) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (worker timeout) |

### SOAP Faults

```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Missing required field: ClientId</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

### TCP Error Responses

```json
{
  "status": "ERROR",
  "error": "Package not found"
}
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Request timeout" | Worker not responding | Check if worker is running |
| "Connection refused" | Service not running | Start the service |
| "Missing required field" | Invalid request | Check request parameters |
| "Package not found" | Invalid ID | Verify package exists |
| "Insufficient quantity" | Out of stock | Check inventory levels |

---

## Rate Limiting

**Current Implementation**: No rate limiting (development)

**Production Recommendations**:
- REST: 100 requests/minute per IP
- SOAP: 50 requests/minute per client
- TCP: 200 messages/minute per connection

---

## Testing Tools

### REST
```bash
curl -X POST http://localhost:3001/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{"packageId":"PKG-001","address":"123 Main St","priority":"high"}'
```

### SOAP
- **Postman**: Import WSDL from `http://localhost:3002/soap?wsdl`
- **SoapUI**: Create new SOAP project with WSDL URL
- **Node.js**: Use `node-soap` library

### TCP
```bash
node test-all-protocols.js
```

---

## Postman Collection

Import this collection to test REST APIs:

```json
{
  "info": {
    "name": "SwiftLogistics REST API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Optimize Route",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "http://localhost:3001/api/routes/optimize",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"packageId\": \"PKG-001\",\n  \"address\": \"123 Main St\",\n  \"priority\": \"high\"\n}"
        }
      }
    }
  ]
}
```

---

## Support

For issues or questions:
- Check logs in each service terminal
- Verify RabbitMQ is running: `http://localhost:15672`
- Run test suite: `node test-all-protocols.js`
- View architecture: `ARCHITECTURE.md`
