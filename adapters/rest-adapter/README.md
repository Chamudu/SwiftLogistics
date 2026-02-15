# REST Adapter

Protocol adapter that bridges HTTP/REST requests with RabbitMQ message queues.

## 🎯 Purpose

This adapter enables REST clients to interact with backend services through RabbitMQ, providing:
- **Decoupling**: Clients don't need to know about backend services
- **Reliability**: Messages persist in queues
- **Scalability**: Add workers to increase capacity
- **Load Balancing**: RabbitMQ distributes work evenly

## 🏗️ Architecture

```
HTTP Client
     ↓ POST /api/routes/optimize
REST Adapter (this)
     ↓ Publishes message
RabbitMQ Queue
     ↓ Delivers message
ROS Worker
     ↓ Calls
Mock ROS Service
     ↓ Response flows back
REST Adapter
     ↓ Returns HTTP response
HTTP Client
```

## 📡 API Endpoints

### POST /api/routes/optimize
Create a new route optimization request.

**Request:**
```bash
curl -X POST http://localhost:3001/api/routes/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "packageId": "PKG-001",
    "address": "123 Main St, Colombo",
    "priority": "high",
    "deliveryWindow": "2024-02-13T18:00:00Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "routeId": "ROUTE-1001",
  "estimatedDeliveryTime": "2024-02-13T17:30:00Z",
  "driverId": "DRV-42",
  "distance": 12.5,
  "sequence": 3
}
```

### GET /api/routes/:routeId
Get route details.

**Request:**
```bash
curl http://localhost:3001/api/routes/ROUTE-1001
```

### PUT /api/routes/:routeId
Update route information.

**Request:**
```bash
curl -X PUT http://localhost:3001/api/routes/ROUTE-1001 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_TRANSIT",
    "currentLocation": "Warehouse A"
  }'
```

### GET /health
Check adapter status.

**Request:**
```bash
curl http://localhost:3001/health
```

## 🚀 Running

### Prerequisites
- RabbitMQ running (port 5672)
- Node.js 18+

### Start
```bash
# From project root
npm install

# Start adapter
node adapters/rest-adapter/index.js
```

### Configuration
Edit these constants in `index.js`:
```javascript
const PORT = 3001;  // HTTP server port
const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';
```

## 🔧 RabbitMQ Setup

The adapter creates:

### Exchanges
- **ros_exchange** (direct) - Routes messages to ROS queues

### Queues
- **route.optimize** - Route creation requests
- **route.get** - Route retrieval requests
- **route.update** - Route update requests

### Bindings
```
ros_exchange --[route.optimize]--> route.optimize queue
ros_exchange --[route.get]------> route.get queue
ros_exchange --[route.update]---> route.update queue
```

## 📚 How It Works

### Request/Reply Pattern

1. **Client sends HTTP request** to adapter
2. **Adapter creates reply queue** (temporary, exclusive)
3. **Adapter publishes message** with:
   - Routing key (e.g., `route.optimize`)
   - Correlation ID (unique request identifier)
   - Reply-to queue name
4. **Adapter waits** for response on reply queue
5. **Worker processes** message and sends response
6. **Adapter receives** response matching correlation ID
7. **Adapter returns** HTTP response to client

### Message Flow Example

```javascript
// 1. Adapter receives HTTP POST
app.post('/api/routes/optimize', async (req, res) => {
  
  // 2. Create message
  const message = {
    action: 'OPTIMIZE_ROUTE',
    data: req.body,
    timestamp: new Date().toISOString()
  };
  
  // 3. Publish and wait
  const response = await publishAndWait(
    'ros_exchange',
    'route.optimize',
    message
  );
  
  // 4. Return response
  res.json(response);
});
```

## 🎓 Key Concepts

### AMQP Connection
```javascript
const connection = await amqp.connect(RABBITMQ_URL);
const channel = await connection.createChannel();
```

### Exchange Declaration
```javascript
await channel.assertExchange('ros_exchange', 'direct', {
  durable: true  // Survives broker restart
});
```

### Queue Declaration
```javascript
await channel.assertQueue('route.optimize', {
  durable: true  // Persists messages to disk
});
```

### Queue Binding
```javascript
await channel.bindQueue(
  'route.optimize',      // Queue name
  'ros_exchange',        // Exchange name
  'route.optimize'       // Routing key
);
```

### Publishing with Reply
```javascript
channel.publish(
  exchange,
  routingKey,
  Buffer.from(JSON.stringify(message)),
  {
    correlationId: 'unique-id',
    replyTo: 'temp-reply-queue',
    persistent: true,
    contentType: 'application/json'
  }
);
```

## 🐛 Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution:** Make sure RabbitMQ is running:
```bash
docker-compose up -d
```

### Timeout Errors
```
Error: Request timeout - no response from worker
```
**Solution:** Make sure a worker is running:
```bash
node workers/ros-worker/index.js
```

### Queue Not Found
**Solution:** Restart adapter to recreate queues

## 💡 Best Practices

1. **Correlation IDs**: Always use unique IDs to match requests/responses
2. **Reply Queues**: Use exclusive, auto-delete queues for replies
3. **Timeouts**: Set reasonable timeouts (default: 5 seconds)
4. **Error Handling**: Handle both RabbitMQ and HTTP errors
5. **Graceful Shutdown**: Close connections properly
6. **Connection Pooling**: Reuse connection and channel
7. **Monitoring**: Log all message flows for debugging

## 🔍 Monitoring

### Check Status
```bash
curl http://localhost:3001/health
```

### RabbitMQ Dashboard
- URL: http://localhost:15672
- Username: admin
- Password: admin123

### Watch Logs
The adapter logs:
- Incoming HTTP requests
- Message publications
- Responses received
- Errors

## 🚀 Scaling

### Add More Workers
```bash
# Terminal 1
node workers/ros-worker/index.js

# Terminal 2
node workers/ros-worker/index.js

# Terminal 3
node workers/ros-worker/index.js
```

RabbitMQ automatically distributes work evenly!

### Load Testing
```bash
node test-middleware.js
```

## 📖 Learn More

- [RabbitMQ Request/Reply Pattern](https://www.rabbitmq.com/tutorials/tutorial-six-javascript.html)
- [AMQP Protocol](https://www.amqp.org/)
- [amqplib Documentation](https://amqp-node.github.io/amqplib/)
