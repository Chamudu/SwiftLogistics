

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5000'],
        methods: ['GET', 'POST']
    },
    // Prefer WebSocket, fall back to polling if WS is blocked
    transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

const PORT = 4006;


const connectedClients = new Map();


io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.id}`);

    socket.on('authenticate', (data) => {
        const { userId, role, name } = data;

        if (!userId) {
            socket.emit('error', { message: 'userId is required' });
            return;
        }

        // Join user-specific room (for targeted notifications)
        socket.join(`user:${userId}`);

        // Join role-based room (for role broadcasts)
        if (role) {
            socket.join(`role:${role}`);
        }

        // Track this client
        connectedClients.set(socket.id, {
            userId,
            role,
            name: name || 'Unknown',
            connectedAt: new Date()
        });

        console.log(`✅ Authenticated: ${name || userId} (${role}) → rooms: user:${userId}, role:${role}`);

        // Confirm authentication to the client
        socket.emit('authenticated', {
            message: 'Connected to real-time updates',
            rooms: [`user:${userId}`, `role:${role}`]
        });
    });

    // ── SUBSCRIBE TO SPECIFIC ORDER ──
    // Client can watch a specific order for live updates
    socket.on('watch:order', (orderId) => {
        socket.join(`order:${orderId}`);
        console.log(`👁️  ${socket.id} watching order ${orderId}`);
    });

    // ── UNSUBSCRIBE FROM ORDER ──
    socket.on('unwatch:order', (orderId) => {
        socket.leave(`order:${orderId}`);
        console.log(`👁️  ${socket.id} stopped watching order ${orderId}`);
    });

    // ── DISCONNECT ──
    socket.on('disconnect', (reason) => {
        const client = connectedClients.get(socket.id);
        if (client) {
            console.log(`❌ Disconnected: ${client.name} (${reason})`);
            connectedClients.delete(socket.id);
        } else {
            console.log(`❌ Disconnected: ${socket.id} (${reason})`);
        }
    });
});

app.post('/emit/order-update', (req, res) => {
    const { orderId, userId, status, sagaStep, message, details } = req.body;

    const event = {
        orderId,
        status,
        sagaStep,
        message: message || `Order ${orderId} is now ${status}`,
        details: details || {},
        timestamp: new Date().toISOString()
    };

    console.log(`📡 Broadcasting: ${event.message}`);

    // Send to everyone watching this specific order
    io.to(`order:${orderId}`).emit('order:updated', event);

    // Send to the user who placed the order
    if (userId) {
        io.to(`user:${userId}`).emit('order:updated', event);
    }

    // Send to all admins (they see all order updates)
    io.to('role:admin').emit('order:updated', event);

    res.json({ success: true, message: 'Event broadcasted', recipients: getRecipientCount(orderId, userId) });
});

// ── SYSTEM NOTIFICATION ──
// Broadcast a system-wide message to all connected clients
app.post('/emit/notification', (req, res) => {
    const { type, title, message, targetRole } = req.body;

    const event = {
        type: type || 'info',
        title,
        message,
        timestamp: new Date().toISOString()
    };

    if (targetRole) {
        // Send to specific role only
        io.to(`role:${targetRole}`).emit('notification', event);
        console.log(`📡 Notification to role:${targetRole}: ${title}`);
    } else {
        // Broadcast to everyone
        io.emit('notification', event);
        console.log(`📡 Notification to ALL: ${title}`);
    }

    res.json({ success: true, message: 'Notification sent' });
});

// ── HEALTH / STATUS ──
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'websocket-service',
        port: PORT,
        connections: connectedClients.size,
        clients: Array.from(connectedClients.values()).map(c => ({
            userId: c.userId,
            role: c.role,
            name: c.name,
            connectedAt: c.connectedAt
        })),
        uptime: process.uptime()
    });
});

// ── CONNECTED CLIENTS COUNT ──
app.get('/connections', (req, res) => {
    res.json({
        total: connectedClients.size,
        clients: Array.from(connectedClients.values())
    });
});

function getRecipientCount(orderId, userId) {
    let count = 0;
    const orderRoom = io.sockets.adapter.rooms.get(`order:${orderId}`);
    const userRoom = userId ? io.sockets.adapter.rooms.get(`user:${userId}`) : null;
    const adminRoom = io.sockets.adapter.rooms.get('role:admin');

    if (orderRoom) count += orderRoom.size;
    if (userRoom) count += userRoom.size;
    if (adminRoom) count += adminRoom.size;

    return count;
}


server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║   🔌 WEBSOCKET SERVICE — Real-Time Updates             ║
╠════════════════════════════════════════════════════════╣
║   🌐 WebSocket: ws://localhost:${PORT}                      ║
║   📡 REST API:  http://localhost:${PORT}                     ║
║   📊 Health:    http://localhost:${PORT}/health               ║
║                                                        ║
║   Events:                                              ║
║     order:updated   — Order status changes             ║
║     notification    — System-wide alerts               ║
║                                                        ║
║   REST Endpoints (for other services):                 ║
║     POST /emit/order-update   — Push order event       ║
║     POST /emit/notification   — Push notification      ║
║     GET  /health              — Service status         ║
║     GET  /connections         — Connected clients      ║
╚════════════════════════════════════════════════════════╝
    `);
});
