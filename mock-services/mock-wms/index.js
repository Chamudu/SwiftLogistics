/**
 * Mock WMS (Warehouse Management System)
 * 
 * This is a mock TCP/IP service that simulates a proprietary warehouse system.
 * 
 * LEARNING POINTS:
 * - TCP/IP: Low-level network protocol (raw sockets, no HTTP)
 * - Custom Protocol: We define our own message format
 * - Binary/Text Data: Can send any format (we'll use length-prefixed JSON)
 * - Persistent Connections: Unlike HTTP, connections stay open
 * - Stateful: Server can remember client state across messages
 */

import net from 'net';

const PORT = 4001;
const HOST = '0.0.0.0';

// In-memory storage
const packages = new Map();
const inventory = new Map();
let packageIdCounter = 5000;

// Initialize some mock inventory
inventory.set('ITEM-001', { sku: 'ITEM-001', name: 'Laptop Computer', quantity: 50, zone: 'A1' });
inventory.set('ITEM-002', { sku: 'ITEM-002', name: 'Wireless Mouse', quantity: 200, zone: 'A2' });
inventory.set('ITEM-003', { sku: 'ITEM-003', name: 'USB Cable', quantity: 500, zone: 'B1' });

/**
 * LEARNING: What is TCP/IP?
 * 
 * TCP = Transmission Control Protocol
 * IP = Internet Protocol
 * 
 * Think of it as layers:
 * 
 * Layer 7: Application (HTTP, SOAP, FTP)
 *          ↓
 * Layer 4: Transport (TCP, UDP)
 *          ↓
 * Layer 3: Network (IP)
 *          ↓
 * Layer 1-2: Physical (Ethernet, WiFi)
 * 
 * When we say "TCP/IP service", we mean:
 * - We're working at the TCP layer directly
 * - No HTTP (no GET, POST, status codes)
 * - We define our own message format
 * - Raw byte streams
 * 
 * Why companies use custom TCP protocols:
 * - Legacy systems (built before HTTP was popular)
 * - Performance (avoid HTTP overhead)
 * - Proprietary (custom business logic)
 * - Real-time (persistent connections)
 */

/**
 * LEARNING: Our Custom Protocol
 * 
 * We'll use a simple length-prefixed JSON protocol:
 * 
 * Message Format:
 * [4 bytes: length] [N bytes: JSON data]
 * 
 * Example:
 * Length: 45 (as 4-byte integer)
 * Data: {"type":"CREATE_PACKAGE","orderId":"ORD-123"}
 * 
 * Wire format:
 * 0x00 0x00 0x00 0x2D {"type":"CREATE_PACKAGE",...}
 * ^                   ^
 * |                   |
 * Length (45 in hex)  JSON payload
 * 
 * Why length-prefix?
 * - TCP is a stream, not messages
 * - We need to know where one message ends and next begins
 * - Length tells us how many bytes to read
 */

// Protocol handler functions
const protocolHandlers = {
    /**
     * CREATE_PACKAGE - Create a new package in the warehouse
     * 
     * Request:
     * {
     *   "type": "CREATE_PACKAGE",
     *   "orderId": "ORD-1001",
     *   "items": [
     *     { "sku": "ITEM-001", "quantity": 2 },
     *     { "sku": "ITEM-002", "quantity": 5 }
     *   ],
     *   "destination": "123 Main St, Colombo"
     * }
     * 
     * Response:
     * {
     *   "status": "SUCCESS",
     *   "packageId": "PKG-5001",
     *   "estimatedPickTime": "2024-02-13T15:30:00Z",
     *   "zone": "A1"
     * }
     */
    CREATE_PACKAGE: (data) => {
        const { orderId, items, destination } = data;

        if (!orderId || !items || !destination) {
            return {
                status: 'ERROR',
                error: 'Missing required fields: orderId, items, destination'
            };
        }

        // Check inventory
        for (const item of items) {
            const inventoryItem = inventory.get(item.sku);
            if (!inventoryItem) {
                return {
                    status: 'ERROR',
                    error: `Item ${item.sku} not found in inventory`
                };
            }
            if (inventoryItem.quantity < item.quantity) {
                return {
                    status: 'ERROR',
                    error: `Insufficient quantity for ${item.sku}. Available: ${inventoryItem.quantity}`
                };
            }
        }

        // Create package
        const packageId = `PKG-${packageIdCounter++}`;
        const estimatedPickTime = new Date(Date.now() + Math.random() * 1800000 + 600000).toISOString(); // 10-40 min
        const zone = items[0] ? inventory.get(items[0].sku).zone : 'A1';

        const pkg = {
            packageId,
            orderId,
            items,
            destination,
            status: 'PENDING',
            zone,
            estimatedPickTime,
            createdAt: new Date().toISOString()
        };

        packages.set(packageId, pkg);

        // Update inventory
        items.forEach(item => {
            const inv = inventory.get(item.sku);
            inv.quantity -= item.quantity;
        });

        console.log(`📦 Package created: ${packageId}`);
        console.log(`   Order: ${orderId}`);
        console.log(`   Items: ${items.length}`);
        console.log(`   Zone: ${zone}`);

        return {
            status: 'SUCCESS',
            packageId,
            estimatedPickTime,
            zone
        };
    },

    /**
     * GET_PACKAGE_STATUS - Get status of a package
     */
    GET_PACKAGE_STATUS: (data) => {
        const { packageId } = data;

        if (!packageId) {
            return {
                status: 'ERROR',
                error: 'packageId is required'
            };
        }

        const pkg = packages.get(packageId);

        if (!pkg) {
            return {
                status: 'ERROR',
                error: `Package ${packageId} not found`
            };
        }

        console.log(`📋 Package status requested: ${packageId}`);

        return {
            status: 'SUCCESS',
            package: pkg
        };
    },

    /**
     * UPDATE_PACKAGE_STATUS - Update package status (picked, packed, shipped)
     */
    UPDATE_PACKAGE_STATUS: (data) => {
        const { packageId, newStatus } = data;

        if (!packageId || !newStatus) {
            return {
                status: 'ERROR',
                error: 'packageId and newStatus are required'
            };
        }

        const pkg = packages.get(packageId);

        if (!pkg) {
            return {
                status: 'ERROR',
                error: `Package ${packageId} not found`
            };
        }

        pkg.status = newStatus;
        pkg.updatedAt = new Date().toISOString();

        console.log(`🔄 Package status updated: ${packageId} → ${newStatus}`);

        return {
            status: 'SUCCESS',
            packageId,
            newStatus
        };
    },

    /**
     * REMOVE_PACKAGE - Remove/cancel a package
     */
    REMOVE_PACKAGE: (data) => {
        const { packageId } = data;

        if (!packageId) {
            return {
                status: 'ERROR',
                error: 'packageId is required'
            };
        }

        const pkg = packages.get(packageId);

        if (!pkg) {
            return {
                status: 'ERROR',
                error: `Package ${packageId} not found`
            };
        }

        // Return items to inventory
        pkg.items.forEach(item => {
            const inv = inventory.get(item.sku);
            if (inv) {
                inv.quantity += item.quantity;
            }
        });

        packages.delete(packageId);

        console.log(`❌ Package removed: ${packageId}`);

        return {
            status: 'SUCCESS',
            message: `Package ${packageId} removed`
        };
    },

    /**
     * GET_INVENTORY - Get current inventory levels
     */
    GET_INVENTORY: (data) => {
        const inventoryList = Array.from(inventory.values());

        console.log(`📊 Inventory requested (${inventoryList.length} items)`);

        return {
            status: 'SUCCESS',
            inventory: inventoryList
        };
    }
};

/**
 * Parse length-prefixed message
 */
function parseMessage(buffer) {
    if (buffer.length < 4) {
        return null; // Not enough data for length
    }

    const length = buffer.readUInt32BE(0);

    if (buffer.length < 4 + length) {
        return null; // Not enough data for full message
    }

    const jsonData = buffer.slice(4, 4 + length).toString('utf8');
    const remaining = buffer.slice(4 + length);

    try {
        const message = JSON.parse(jsonData);
        return { message, remaining };
    } catch (error) {
        throw new Error('Invalid JSON in message');
    }
}

/**
 * Create length-prefixed message
 */
function createMessage(data) {
    const json = JSON.stringify(data);
    const length = Buffer.byteLength(json, 'utf8');

    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(length, 0);

    return Buffer.concat([lengthBuffer, Buffer.from(json, 'utf8')]);
}

/**
 * Handle client connection
 */
function handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n🔌 New connection from: ${clientId}`);

    let buffer = Buffer.alloc(0);

    // Handle incoming data
    socket.on('data', (data) => {
        // Append to buffer
        buffer = Buffer.concat([buffer, data]);

        // Try to parse messages
        while (buffer.length > 0) {
            const result = parseMessage(buffer);

            if (!result) {
                // Not enough data yet, wait for more
                break;
            }

            const { message, remaining } = result;
            buffer = remaining;

            console.log(`📨 Received from ${clientId}:`, message);

            // Handle message
            const handler = protocolHandlers[message.type];
            let response;

            if (handler) {
                response = handler(message);
            } else {
                response = {
                    status: 'ERROR',
                    error: `Unknown message type: ${message.type}`
                };
            }

            console.log(`📤 Sending to ${clientId}:`, response);

            // Send response
            const responseBuffer = createMessage(response);
            socket.write(responseBuffer);
        }
    });

    // Handle connection close
    socket.on('end', () => {
        console.log(`👋 Connection closed: ${clientId}`);
    });

    // Handle errors
    socket.on('error', (err) => {
        console.error(`❌ Socket error from ${clientId}:`, err.message);
    });
}

// Create TCP server
const server = net.createServer(handleConnection);

// Start server
server.listen(PORT, HOST, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   📦 Mock WMS (Warehouse Management System)   ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║   🌐 Server running on: ${HOST}:${PORT}        ║`);
    console.log('║   📡 Protocol: TCP/IP (Custom Protocol)        ║');
    console.log('║   ✅ Status: Ready to accept connections       ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('🔧 Available Operations:');
    console.log('   • CREATE_PACKAGE      - Create package for order');
    console.log('   • GET_PACKAGE_STATUS  - Get package status');
    console.log('   • UPDATE_PACKAGE_STATUS - Update status');
    console.log('   • REMOVE_PACKAGE      - Remove/cancel package');
    console.log('   • GET_INVENTORY       - Get inventory levels');
    console.log('');
    console.log('📊 Current Inventory:');
    inventory.forEach(item => {
        console.log(`   • ${item.sku}: ${item.name} (${item.quantity} units, Zone ${item.zone})`);
    });
    console.log('');
    console.log('💡 Test with: node test.js');
    console.log('');
});

// Handle server errors
server.on('error', (err) => {
    console.error('❌ Server error:', err);
});

/**
 * LEARNING SUMMARY: TCP/IP vs HTTP
 * 
 * HTTP (REST/SOAP):
 * ✅ Request-Response pattern
 * ✅ Built-in methods (GET, POST, etc.)
 * ✅ Status codes (200, 404, etc.)
 * ✅ Headers, cookies, etc.
 * ✅ Stateless
 * ✅ Browser-friendly
 * ❌ More overhead
 * 
 * TCP/IP (Raw):
 * ✅ Persistent connections
 * ✅ Stateful (can remember client)
 * ✅ Lower overhead
 * ✅ Custom protocol (total control)
 * ✅ Can be faster
 * ❌ Manual protocol design
 * ❌ Not browser-friendly
 * ❌ More complex
 * 
 * When to use TCP/IP:
 * - Legacy systems with custom protocols
 * - Real-time systems (gaming, trading)
 * - High-performance requirements
 * - Proprietary business logic
 * - Long-lived connections
 * 
 * When to use HTTP:
 * - Web APIs
 * - Browser access
 * - Standard interfaces
 * - Most new projects
 */
