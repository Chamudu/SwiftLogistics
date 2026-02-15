# ROS Worker

Message queue worker that processes route optimization requests from RabbitMQ and calls the Mock ROS service.

## 🎯 Purpose

This worker:
- Listens to RabbitMQ queues for route-related messages
- Processes requests asynchronously
- Calls Mock ROS REST API
- Returns responses through RabbitMQ
- Enables horizontal scaling (run multiple workers)

## 🏗️ Architecture

```
RabbitMQ Queue (route.optimize)
      ↓ Delivers message
ROS Worker (this)
      ↓ Parses message
      ↓ Calls Mock ROS API
Mock ROS Service (port 4002)
      ↓ Returns response
ROS Worker
      ↓ Sends to reply queue
REST Adapter
      ↓ Returns to client
```

## 📬 Queues Consumed

### route.optimize
Processes route optimization requests.

**Message Format:**
```json
{
  "action": "OPTIMIZE_ROUTE",
  "data": {
    "packageId": "PKG-001",
    "address": "123 Main St",
    "priority": "high",
    "deliveryWindow": "2024-02-13T18:00:00Z"
  },
  "timestamp": "2024-02-13T10:00:00Z"
}
```

**Mock ROS Call:**
```
POST http://localhost:4002/api/routes/optimize
```

### route.get
Retrieves route information.

**Message Format:**
```json
{
  "action": "GET_ROUTE",
  "data": {
    "routeId": "ROUTE-1001"
  },
  "timestamp": "2024-02-13T10:00:00Z"
}
```

**Mock ROS Call:**
```
GET http://localhost:4002/api/routes/ROUTE-1001
```

### route.update
Updates route status.

**Message Format:**
```json
{
  "action": "UPDATE_ROUTE",
  "data": {
    "routeId": "ROUTE-1001",
    "updates": {
      "status": "IN_TRANSIT"
    }
  },
  "timestamp": "2024-02-13T10:00:00Z"
}
```

**Mock ROS Call:**
```
PUT http://localhost:4002/api/routes/ROUTE-1001
```

## 🚀 Running

### Prerequisites
- RabbitMQ running (port 5672)
- Mock ROS running (port 4002)
- Node.js 18+

### Start
```bash
# From project root
npm install

# Start worker
node workers/ros-worker/index.js
```

### Configuration
Edit these constants in `index.js`:
```javascript
const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';
const MOCK_ROS_URL = 'http://localhost:4002';
```

## 🔧 How It Works

### Worker Lifecycle

```
1. Connect to RabbitMQ
    ↓
2. Set prefetch(1) for fair distribution
    ↓
3. Start consuming queues
    ↓
4. Wait for message
    ↓
5. Message arrives
    ↓
6. Parse message content
    ↓
7. Call Mock ROS API
    ↓
8. Get response
    ↓
9. Send to reply queue
    ↓
10. Acknowledge message
    ↓
11. Back to step 4
```

### Message Processing

```javascript
channel.consume('route.optimize', async (msg) => {
  try {
    // 1. Parse message
    const message = JSON.parse(msg.content.toString());
    
    // 2. Process (call Mock ROS)
    const response = await handleOptimizeRoute(message);
    
    // 3. Send response
    if (msg.properties.replyTo) {
      channel.sendToQueue(
        msg.properties.replyTo,
        Buffer.from(JSON.stringify(response)),
        { correlationId: msg.properties.correlationId }
      );
    }
    
    // 4. Acknowledge
    channel.ack(msg);
    
  } catch (error) {
    // 5. Reject and requeue on error
    channel.nack(msg, false, true);
  }
}, { noAck: false });  // Manual acknowledgment
```

## 🎓 Key Concepts

### Prefetch
```javascript
await channel.prefetch(1);
```
**What it does:**
- Worker gets 1 message at a time
- Must acknowledge before getting next
- Ensures fair distribution across multiple workers

**Example:**
```
Without prefetch:
Worker A: ████████████ (12 messages)
Worker B: ██ (2 messages)

With prefetch(1):
Worker A: ███████ (7 messages)
Worker B: ███████ (7 messages)
```

### Manual Acknowledgment

**Success:**
```javascript
channel.ack(msg);  // Remove from queue
```

**Failure:**
```javascript
channel.nack(msg, false, true);
// false: don't reject multiple
// true: requeue for retry
```

**Why manual?**
- If worker crashes before processing, message goes back to queue
- No messages lost
- Other workers can pick up failed messages

### Reply Pattern

```javascript
// Worker reads reply queue from message
const replyQueue = msg.properties.replyTo;
const correlationId = msg.properties.correlationId;

// Worker sends response to reply queue
channel.sendToQueue(
  replyQueue,
  Buffer.from(JSON.stringify(response)),
  { correlationId }
);
```

## 🎯 Scaling

### Run Multiple Workers

**Terminal 1:**
```bash
node workers/ros-worker/index.js
```

**Terminal 2:**
```bash
node workers/ros-worker/index.js
```

**Terminal 3:**
```bash
node workers/ros-worker/index.js
```

**Benefits:**
- 3x throughput
- Load balanced automatically
- If one crashes, others continue
- No code changes needed!

### Test Scaling

```bash
# Send 100 requests
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/routes/optimize \
    -H "Content-Type: application/json" \
   -d "{\"packageId\":\"PKG-$i\",\"address\":\"Test\"}"
done
```

**Watch:**
- All workers process messages
- Fair distribution
- Fast processing

## 🐛 Troubleshooting

### Can't Connect to RabbitMQ
```
Error: connect ECONNREFUSED 127.0.0.1:5672
```
**Solution:**
```bash
docker-compose up -d
```

### Can't Reach Mock ROS
```
Error: connect ECONNREFUSED 127.0.0.1:4002
```
**Solution:**
```bash
npm run dev:mock-ros
```

### Messages Not Being Processed
**Check:**
1. Worker is running
2. Queues exist in RabbitMQ dashboard
3. Messages are in queue
4. No errors in worker logs

## 💡 Best Practices

1. **Prefetch**: Use `prefetch(1)` for fair distribution
2. **Manual Ack**: Always use manual acknowledgment
3. **Error Handling**: Catch all errors, nack on failure
4. **Timeouts**: Add timeouts for external API calls
5. **Logging**: Log all message processing
6. **Graceful Shutdown**: Close connections properly
7. **Idempotency**: Handle duplicate messages gracefully

## 🔍 Monitoring

### Worker Status
- Check console output
- Look for "Waiting for messages..." status

### RabbitMQ Dashboard
- URL: http://localhost:15672
- Check queue consumers
- Monitor message rates
- View unacknowledged messages

### Key Metrics
- **Messages/second**: Processing rate
- **Consumers**: Number of active workers
- **Unacked**: Messages being processed
- **Ready**: Messages waiting in queue

## 📊 Performance

### Single Worker
- ~100-200 messages/second
- Depends on Mock ROS response time

### Three Workers
- ~300-600 messages/second
- Linear scaling!

### Optimization Tips
1. Increase prefetch for faster workers
2. Connection pooling for API calls
3. Batch processing where possible
4. Cache frequent Mock ROS responses

## 🚀 Next Steps

After ROS Worker, build:
1. CMS Worker (SOAP protocol)
2. WMS Worker (TCP protocol)
3. Error handling worker
4. Dead letter queue processor

## 📖 Learn More

- [RabbitMQ Consumer Prefetch](https://www.rabbitmq.com/consumer-prefetch.html)
- [Message Acknowledgments](https://www.rabbitmq.com/confirms.html)
- [Worker Queues Tutorial](https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html)
