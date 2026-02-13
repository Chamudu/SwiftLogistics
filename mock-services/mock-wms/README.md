# Mock WMS (Warehouse Management System)

A mock TCP/IP service that simulates a proprietary warehouse management system.

## 🎯 Purpose

This service simulates the **WMS (Warehouse Management System)** mentioned in the SwiftLogistics scenario:
- Internal proprietary system
- Uses custom TCP/IP protocol
- Manages package creation, inventory, and warehouse operations
- Length-prefixed JSON protocol

## 🏗️ Architecture

```
Client/Middleware
     ↓ (TCP Connection)
┌─────────────────────┐
│   Mock WMS Server   │
│   (TCP Socket)      │
│   Port: 4001        │
└─────────────────────┘
     ↓ (Binary Protocol)
Client/Middleware
```

## 📡 Custom Protocol

### Message Format

We use a **length-prefixed JSON protocol**:

```
[4 bytes: length] [N bytes: JSON data]
```

Example:
```
0x00 0x00 0x00 0x2D {"type":"CREATE_PACKAGE","orderId":"ORD-123"}
^                   ^
|                   |
Length (45 bytes)   JSON payload
```

### Why Length-Prefixed?
- TCP is a **stream**, not discrete messages
- We need to know where one message ends and the next begins
- The 4-byte length header tells us how many bytes to read

## 🔧 Available Operations

### 1. CREATE_PACKAGE
Create a new package in the warehouse.

**Request:**
```json
{
  "type": "CREATE_PACKAGE",
  "orderId": "ORD-1001",
  "items": [
    { "sku": "ITEM-001", "quantity": 2 },
    { "sku": "ITEM-002", "quantity": 5 }
  ],
  "destination": "123 Main St, Colombo"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "packageId": "PKG-5001",
  "estimatedPickTime": "2024-02-13T15:30:00Z",
  "zone": "A1"
}
```

### 2. GET_PACKAGE_STATUS
Retrieve the current status of a package.

**Request:**
```json
{
  "type": "GET_PACKAGE_STATUS",
  "packageId": "PKG-5001"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "package": {
    "packageId": "PKG-5001",
    "orderId": "ORD-1001",
    "items": [...],
    "destination": "123 Main St, Colombo",
    "status": "PENDING",
    "zone": "A1",
    "estimatedPickTime": "2024-02-13T15:30:00Z",
    "createdAt": "2024-02-13T14:00:00Z"
  }
}
```

### 3. UPDATE_PACKAGE_STATUS
Update the status of a package (PENDING → PICKED → PACKED → SHIPPED).

**Request:**
```json
{
  "type": "UPDATE_PACKAGE_STATUS",
  "packageId": "PKG-5001",
  "newStatus": "PICKED"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "packageId": "PKG-5001",
  "newStatus": "PICKED"
}
```

### 4. REMOVE_PACKAGE
Cancel/remove a package and return items to inventory.

**Request:**
```json
{
  "type": "REMOVE_PACKAGE",
  "packageId": "PKG-5001"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Package PKG-5001 removed"
}
```

### 5. GET_INVENTORY
Get current inventory levels.

**Request:**
```json
{
  "type": "GET_INVENTORY"
}
```

**Response:**
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

## 🚀 Running the Service

### Install Dependencies
```bash
# No external dependencies! TCP is built into Node.js
# From project root
npm install

# Or from this directory
npm install
```

### Start the Server
```bash
# From project root
npm run dev:mock-wms

# Or from this directory
npm run dev
```

### Test the Service
```bash
# Using the test script
node test.js
```

## 📚 Learning Points

### What is TCP/IP?

**TCP** (Transmission Control Protocol) is a low-level network protocol:
- Connection-oriented (establishes a connection first)
- Reliable (guaranteed delivery, in-order)
- Stream-based (continuous flow of bytes, not discrete messages)
- Lower overhead than HTTP

### OSI Model Layers

```
Layer 7: Application (HTTP, SOAP, FTP)
         ↓
Layer 4: Transport (TCP, UDP)     ← We work here!
         ↓
Layer 3: Network (IP)
         ↓
Layer 1-2: Physical (Ethernet, WiFi)
```

### TCP vs HTTP

| Feature | TCP/IP (Raw) | HTTP |
|---------|-------------|------|
| **Layer** | Transport (Layer 4) | Application (Layer 7) |
| **Connection** | Persistent | Request-Response |
| **Format** | Custom (we define) | Standard (methods, headers) |
| **Overhead** | Low | Higher |
| **Complexity** | High | Low |
| **Browser** | ❌ No | ✅ Yes |
| **Use Case** | Custom protocols | Web APIs |

### When to Use TCP/IP

✅ **Use TCP when:**
- Working with legacy systems with custom protocols
- Need extremely low latency
- Building real-time systems (gaming, trading)
- Proprietary business logic
- Long-lived connections with state

❌ **Don't use TCP when:**
- Building standard web APIs (use REST)
- Need browser compatibility
- Want simplicity (HTTP is easier)
- Starting a new project (HTTP/REST is standard)

## 🔍 How It Works

### Server Side (index.js)

```javascript
// Create TCP server
const server = net.createServer((socket) => {
  // Handle each client connection
  socket.on('data', (data) => {
    // Parse length-prefixed message
    // Process request
    // Send response
  });
});

server.listen(4001);
```

### Client Side (test.js)

```javascript
// Create TCP client
const client = new net.Socket();

// Connect to server
client.connect(4001, 'localhost', () => {
  // Build length-prefixed message
  // Send to server
});

// Receive response
client.on('data', (data) => {
  // Parse response
});
```

### Message Flow

```
1. Client builds JSON object
2. Client converts to string
3. Client calculates byte length
4. Client prepends 4-byte length header
5. Client sends over TCP socket
   ↓
6. Server receives bytes
7. Server reads 4-byte length
8. Server reads N bytes of JSON
9. Server parses JSON
10. Server processes request
11. Server builds response
12. Server sends length-prefixed response
   ↓
13. Client receives response
14. Client parses response
```

## 📦 Pre-loaded Inventory

The service comes with test inventory:

- **ITEM-001**: Laptop Computer (50 units, Zone A1)
- **ITEM-002**: Wireless Mouse (200 units, Zone A2)
- **ITEM-003**: USB Cable (500 units, Zone B1)

## 🎓 TCP Concepts

### Connection States
```
CLOSED → SYN_SENT → ESTABLISHED → FIN_WAIT → CLOSED
```

### Persistent Connection
Unlike HTTP's request-response pattern, TCP connections stay open:
```
HTTP:  Connect → Request → Response → Close → Connect → ...
TCP:   Connect → Message ↔ Message ↔ Message → Close
```

### Stateful Communication
Server can remember client across messages:
```javascript
// Server can store client-specific data
const clientSessions = new Map();
clientSessions.set(socket.remoteAddress, { user: 'John', cart: [] });
```

## 🔧 Implementation Details

### Technology Stack
- **Node.js** with ES modules
- **net** module (built-in, no external dependencies!)

### Port
- **4001** (TCP, not HTTP)

### Protocol Design
- **Encoding**: UTF-8
- **Message Format**: Length-prefixed JSON
- **Length**: 4 bytes, big-endian unsigned integer
- **Payload**: JSON string

## 🎯 Next Steps

After understanding this mock service, we'll:
1. Build a TCP adapter to integrate with our middleware
2. Handle connection pooling and reconnection
3. Implement error handling and timeouts
4. Add TCP client to our workers

## 💡 Notes

- This is a **mock** service for testing and learning
- Real WMS would have database, complex inventory logic, and hardware integration
- The length-prefixed protocol is a common pattern for TCP services
- In production, you'd add authentication, encryption (TLS), and monitoring

## 🐛 Troubleshooting

### Connection Refused
- Make sure server is running: `npm run dev`
- Check port 4001 is not in use: `netstat -an | findstr 4001` (Windows)

### Invalid JSON Error
- Ensure message is properly length-prefixed
- Check UTF-8 encoding
- Verify JSON is valid

### Connection Timeouts
- TCP connections can timeout
- Implement reconnection logic
- Use keep-alive packets
