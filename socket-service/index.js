import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import amqp from 'amqplib';
import cors from 'cors';

const PORT = 3004;
const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

// Setup Express & Socket.io
const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for dev
        methods: ["GET", "POST"]
    }
});

// RabbitMQ Connection
async function startConsumer() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        console.log('✅ Connected to RabbitMQ');

        // Exchanges to listen to
        const exchanges = ['wms_exchange', 'ros_exchange', 'cms_exchange', 'saga_events'];

        // Create a dedicated queue for the dashboard (transient)
        const q = await channel.assertQueue('', { exclusive: true });

        for (const exchange of exchanges) {
            await channel.assertExchange(exchange, 'direct', { durable: true });
            // Bind to all relevant routing keys
            // Note: In a real app, strict routing keys are better. 
            // Here we verify specifics or use topic exchanges for wildcards.
            // For now, let's bind to known keys or use a topic exchange if possible.
            // Since we use 'direct' exchanges currently, we must bind exact keys.

            // WMS Keys
            if (exchange === 'wms_exchange') {
                channel.bindQueue(q.queue, exchange, 'inventory.reserved');
                channel.bindQueue(q.queue, exchange, 'inventory.released');
            }
            // ROS Keys
            if (exchange === 'ros_exchange') {
                channel.bindQueue(q.queue, exchange, 'delivery.scheduled');
            }
            // CMS Keys
            if (exchange === 'cms_exchange') {
                channel.bindQueue(q.queue, exchange, 'order.submit');
                // Note: order.submit is the REQUEST, usually we want the RESPONSE or status
                channel.bindQueue(q.queue, exchange, 'order.status');
            }
        }

        console.log('🎧 Waiting for messages in %s', q.queue);

        channel.consume(q.queue, (msg) => {
            if (msg.content) {
                const routingKey = msg.fields.routingKey;
                const content = JSON.parse(msg.content.toString());

                console.log(`⚡ Event [${routingKey}]:`, content);

                // Emit to all connected clients
                io.emit('system_event', {
                    pass: true, // Marker to show it's a verified system message
                    timestamp: new Date(),
                    routingKey,
                    data: content
                });
            }
        }, { noAck: true });

    } catch (error) {
        console.error('❌ RabbitMQ Error:', error);
        setTimeout(startConsumer, 5000); // Retry
    }
}

// Socket.io Events
io.on('connection', (socket) => {
    console.log('👤 New Client Connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('👋 Client Disconnected:', socket.id);
    });
});

// Start Server
httpServer.listen(PORT, () => {
    console.log(`
🚀 Socket Service running on port ${PORT}
📡 WebSocket URL: ws://localhost:${PORT}
    `);
    startConsumer();
});
