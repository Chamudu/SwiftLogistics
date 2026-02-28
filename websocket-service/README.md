# 🔌 WebSocket Service

Real-time event broadcasting for SwiftLogistics. Pushes live order updates and notifications to connected clients instantly — no polling needed.

## 📖 What This Service Does

```
                                    ┌──────────────┐
Order Service ── POST /emit ──────→ │   WebSocket  │ ──── ws:// ────→ React App
                                    │   Service    │    (instant push)
                                    │   :4006      │
                                    └──────────────┘
```

**Without WebSocket**: React asks "any updates?" every 5 seconds (wasteful)  
**With WebSocket**: Server pushes updates the instant they happen (efficient)

## 🧠 Key Concepts

### Socket.IO vs Raw WebSocket

We use **Socket.IO** (a library that wraps WebSocket) because it adds:

| Feature | Raw WebSocket | Socket.IO |
|---------|--------------|-----------|
| Auto-reconnection | ❌ Manual | ✅ Built-in |
| Rooms (private channels) | ❌ Manual | ✅ Built-in |
| Fallback to polling | ❌ No | ✅ Yes |
| Named events | ❌ Strings only | ✅ `socket.emit('order:updated')` |
| Binary support | ✅ | ✅ |

### Rooms

A "room" is like a private channel. Users are placed in rooms based on identity:

```
user:USR-001     → Only messages for this user
role:admin       → All admin broadcasts
role:customer    → All customer broadcasts
role:driver      → All driver broadcasts
order:ORD-123    → Live tracking of a specific order
```

When Order #123 updates, only the user who placed it + admins are notified.

### REST-to-WebSocket Bridge

Other services (like Order Service) don't connect via WebSocket. Instead, they call our REST API to trigger broadcasts:

```
Order Service ──→ POST http://localhost:4006/emit/order-update
                  { orderId, userId, status, sagaStep, message }

WebSocket Server ──→ io.to('user:USR-001').emit('order:updated', data)
                 ──→ io.to('role:admin').emit('order:updated', data)
```

## 🚀 Quick Start

```bash
cd websocket-service
npm install
npm run dev
```

Starts on **ws://localhost:4006** (WebSocket) + **http://localhost:4006** (REST API)

## 📡 Events (Client ↔ Server)

### Client → Server

| Event | Data | Purpose |
|-------|------|---------|
| `authenticate` | `{ userId, role, name }` | Join user/role rooms |
| `watch:order` | `orderId` (string) | Subscribe to order updates |
| `unwatch:order` | `orderId` (string) | Unsubscribe from order |

### Server → Client

| Event | Data | When |
|-------|------|------|
| `authenticated` | `{ message, rooms }` | After successful auth |
| `order:updated` | `{ orderId, status, sagaStep, message, timestamp }` | SAGA step completes |
| `notification` | `{ type, title, message, timestamp }` | System notification |

## 📡 REST Endpoints (For Other Services)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/emit/order-update` | Push order status change |
| `POST` | `/emit/notification` | Broadcast system notification |
| `GET` | `/health` | Service status + connected clients |
| `GET` | `/connections` | List connected clients |

### POST /emit/order-update

```json
{
  "orderId": "ORD-123",
  "userId": "USR-001",
  "status": "PROCESSING",
  "sagaStep": "WAREHOUSE",
  "message": "Inventory reserved successfully"
}
```

### POST /emit/notification

```json
{
  "type": "info",
  "title": "System Update",
  "message": "Scheduled maintenance at 2AM",
  "targetRole": "admin"
}
```

## 📁 File Structure

```
websocket-service/
├── index.js         # Socket.IO server + REST bridge
├── package.json     # Dependencies
└── README.md        # This file
```

## 🔄 Integration Points

```
┌─────────────┐     REST POST        ┌──────────────┐      WebSocket
│   Order     │ ──────────────────→  │   WebSocket  │ ──────────────→  React App
│  Service    │  /emit/order-update  │   Service    │   order:updated
│  (:4004)    │                      │   (:4006)    │
└─────────────┘                      └──────────────┘
                                           │
                                           │ Broadcasts to:
                                           ├── user:USR-001 (order owner)
                                           ├── role:admin   (all admins)
                                           └── order:ORD-123 (watchers)
```
