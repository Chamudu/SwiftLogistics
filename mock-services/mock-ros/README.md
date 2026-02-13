# Mock ROS (Route Optimization System)

A mock REST API service that simulates a cloud-based route optimization system.

## 🎯 Purpose

This service simulates the **ROS (Route Optimization System)** mentioned in the SwiftLogistics scenario:
- Cloud-based third-party service
- Uses REST/JSON protocol
- Calculates optimal delivery routes
- Assigns drivers to deliveries

## 🏗️ Architecture

```
Client/Middleware
     ↓ (HTTP Request - JSON)
┌─────────────────────┐
│   Mock ROS Server   │
│   (Express.js)      │
│   Port: 4002        │
└─────────────────────┘
     ↓ (HTTP Response - JSON)
Client/Middleware
```

## 📡 API Endpoints

### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "Mock ROS (Route Optimization System)",
  "timestamp": "2024-02-10T10:30:00.000Z"
}
```

### 2. Optimize Route (Main Function)
```http
POST /api/routes/optimize
Content-Type: application/json

{
  "packageId": "PKG-123",
  "address": "123 Main St, Colombo",
  "priority": "normal",
  "deliveryWindow": "2024-02-10T14:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "routeId": "ROUTE-1001",
  "estimatedDeliveryTime": "2024-02-10T15:30:00Z",
  "driverId": "DRV-42",
  "distance": 12.5,
  "sequence": 3
}
```

### 3. Get Route Details
```http
GET /api/routes/:routeId
```

### 4. Update Route
```http
PUT /api/routes/:routeId
Content-Type: application/json

{
  "priority": "urgent"
}
```

### 5. Get All Routes
```http
GET /api/routes
```

### 6. Get Driver's Routes
```http
GET /api/drivers/:driverId/routes
```

## 🚀 Running the Service

### Install Dependencies
```bash
# From project root
npm install

# Or from this directory
npm install
```

### Start the Server
```bash
# From project root
npm run dev:mock-ros

# Or from this directory
npm run dev
```

### Test the Service
```bash
# Test health endpoint
curl http://localhost:4002/health

# Test route optimization
curl -X POST http://localhost:4002/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-123",
    "address": "123 Main St, Colombo",
    "priority": "normal"
  }'
```

## 📚 Learning Points

### What is REST?
**REST** (Representational State Transfer) is an architectural style for APIs:
- Uses standard HTTP methods (GET, POST, PUT, DELETE)
- Stateless (each request is independent)
- Resource-based (everything has a URL)
- JSON for data format

### HTTP Methods Used
- **GET**: Retrieve data (read-only, safe, no side effects)
- **POST**: Create new resource
- **PUT**: Update existing resource
- **DELETE**: Remove resource

### HTTP Status Codes
- **200 OK**: Success
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid input from client
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server-side error

### Express.js Framework
```javascript
// Define a GET endpoint
app.get('/endpoint', (req, res) => {
  res.json({ data: 'value' });
});

// Define a POST endpoint
app.post('/endpoint', (req, res) => {
  const data = req.body;  // Access request data
  res.status(201).json({ success: true });
});
```

## 🔍 How It Works

1. **Server Setup**: Express.js creates an HTTP server
2. **Middleware**: 
   - `cors()`: Allows requests from other domains
   - `express.json()`: Parses JSON request bodies
3. **Routes**: Define endpoints and their handlers
4. **In-Memory Storage**: Uses JavaScript `Map` to store routes
5. **Mock Logic**: Simulates route optimization with random data

## 🎓 Next Steps

After understanding this mock service, we'll:
1. Build Mock CMS (SOAP service)
2. Build Mock WMS (TCP service)
3. Create adapters to integrate with these services
4. Build the middleware layer

## 📝 Notes

- This is a **mock** service - it doesn't do real route optimization
- Routes are stored in memory (lost when server restarts)
- In production, you'd use a real database and actual optimization algorithms
- The random data helps simulate realistic behavior for testing
