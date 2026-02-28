# 🔌 Protocol Adapters

The translation layer between the API Gateway and the message broker (RabbitMQ). Each adapter handles one protocol.

## What Are Adapters?

Adapters **translate** between different communication protocols. The real-world systems (CMS, ROS, WMS) each speak a different language. Adapters make them all work through one unified gateway.

```
API Gateway (:5000)
    │
    ├──→ REST Adapter (:3001)  ─── HTTP/JSON ───→ RabbitMQ → ROS Worker → Mock ROS
    ├──→ SOAP Adapter (:3002)  ─── SOAP/XML  ───→ RabbitMQ → CMS Worker → Mock CMS
    └──→ TCP Adapter  (:3003)  ─── TCP/Binary ──→ RabbitMQ → WMS Worker → Mock WMS
```

## The Three Adapters

| Adapter | Port | Protocol In | Protocol Out | Target System |
|---------|------|-------------|--------------|---------------|
| **REST Adapter** | 3001 | HTTP/JSON | AMQP (RabbitMQ) | Route Optimization (ROS) |
| **SOAP Adapter** | 3002 | SOAP/XML | AMQP (RabbitMQ) | Client Management (CMS) |
| **TCP Adapter** | 3003 | TCP/Binary | AMQP (RabbitMQ) | Warehouse Management (WMS) |

## How It Works

```
1. Client sends HTTP request to API Gateway
2. Gateway routes to the appropriate adapter based on URL path
3. Adapter receives the request
4. Adapter publishes a message to RabbitMQ (with a reply queue)
5. The corresponding Worker picks up the message
6. Worker calls the actual backend service
7. Worker sends the response back through RabbitMQ
8. Adapter receives the response and sends it back to the client
```

This is the **Request/Reply Pattern** — the adapter waits for a response from the worker via RabbitMQ.

## Starting All Adapters

```bash
# Terminal 1
cd adapters/rest-adapter && node index.js

# Terminal 2
cd adapters/soap-adapter && node index.js

# Terminal 3
cd adapters/tcp-adapter && node index.js
```

## Key Concepts

- **Protocol Translation**: Converting between REST, SOAP, TCP and AMQP messages
- **Request/Reply via RabbitMQ**: Using temporary queues for synchronous-style responses
- **Decoupling**: Adapters don't talk to backend systems directly — workers do
