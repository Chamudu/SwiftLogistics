/**
 * REST Protocol Adapter
 * 
 * This adapter sits between HTTP clients and RabbitMQ.
 * It translates REST API calls into message queue events.
 */

import express from 'express';
import cors from 'cors';
import amqp from 'amqplib';

const app = express();
const PORT = 3001;

// RabbitMQ Configuration
const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

// Middleware
app.use(cors());
app.use(express.json());

// Global RabbitMQ connection and channel
let connection = null;
let channel = null;


/**
 * Initialize RabbitMQ Connection
 */
async function initRabbitMQ() {
    try {
        console.log('📡 Connecting to RabbitMQ...');

        // Create connection to RabbitMQ
        connection = await amqp.connect(RABBITMQ_URL);

        console.log('✅ Connected to RabbitMQ');

        // Create a channel (like a session)
        channel = await connection.createChannel();

        console.log('✅ Channel created');

        /**
         * Example:
         * Message with routing key "route.optimize" 
         * → Goes to queue bound with "route.optimize"
         */

        // Create exchanges
        await channel.assertExchange('ros_exchange', 'direct', { durable: true });
        console.log('✅ Exchange created: ros_exchange (direct)');



        // Create queues
        await channel.assertQueue('route.optimize', { durable: true });
        await channel.assertQueue('route.get', { durable: true });
        await channel.assertQueue('route.update', { durable: true });

        console.log('✅ Queues created: route.optimize, route.get, route.update');

        // Bind queues to exchange
        await channel.bindQueue('route.optimize', 'ros_exchange', 'route.optimize');
        await channel.bindQueue('route.get', 'ros_exchange', 'route.get');
        await channel.bindQueue('route.update', 'ros_exchange', 'route.update');

        console.log('✅ Queues bound to exchange');

        console.log('🎉 RabbitMQ setup complete!\n');

    } catch (error) {
        console.error('❌ RabbitMQ connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Publish message to RabbitMQ and wait for response
 * 
 * This implements the Request/Reply pattern:
 * 1. Create temporary reply queue
 * 2. Send message with replyTo queue name
 * 3. Wait for response on reply queue
 * 4. Return response to HTTP client
 */
async function publishAndWait(exchange, routingKey, message, timeout = 5000) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create exclusive reply queue (auto-delete when connection closes)
            const { queue: replyQueue } = await channel.assertQueue('', {
                exclusive: true
            });

            // Generate unique correlation ID to match request/response
            const correlationId = generateId();

            console.log(`📤 Publishing message:`);
            console.log(`   Exchange: ${exchange}`);
            console.log(`   Routing Key: ${routingKey}`);
            console.log(`   Correlation ID: ${correlationId}`);
            console.log(`   Reply Queue: ${replyQueue}`);

            // Set timeout
            const timeoutId = setTimeout(() => {
                reject(new Error('Request timeout - no response from worker'));
            }, timeout);

            // Listen for response
            channel.consume(replyQueue, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                    clearTimeout(timeoutId);

                    const response = JSON.parse(msg.content.toString());
                    console.log(`📥 Received response for ${correlationId}`);

                    channel.ack(msg);
                    resolve(response);
                }
            }, { noAck: false });

            // Publish message
            channel.publish(
                exchange,
                routingKey,
                Buffer.from(JSON.stringify(message)),
                {
                    correlationId,
                    replyTo: replyQueue,
                    persistent: true,
                    contentType: 'application/json'
                }
            );

            console.log(`✅ Message published, waiting for response...\n`);

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generate unique ID
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

/**
 * REST ENDPOINTS
 */

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'REST Adapter',
        rabbitmq: connection ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/routes/optimize
 * 
 * Accepts route optimization request and forwards to RabbitMQ
 */
app.post('/api/routes/optimize', async (req, res) => {
    try {
        console.log('═══════════════════════════════════════════');
        console.log('🚀 New Route Optimization Request');
        console.log('═══════════════════════════════════════════');

        const { packageId, address, priority, deliveryWindow } = req.body;

        // Validation
        if (!packageId || !address) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: packageId and address'
            });
        }

        // Create message for queue
        const message = {
            action: 'OPTIMIZE_ROUTE',
            data: {
                packageId,
                address,
                priority: priority || 'normal',
                deliveryWindow
            },
            timestamp: new Date().toISOString()
        };

        // Publish to RabbitMQ and wait for response
        const response = await publishAndWait(
            'ros_exchange',
            'route.optimize',
            message
        );

        console.log('═══════════════════════════════════════════\n');

        // Return response to client
        res.status(response.success ? 201 : 500).json(response);

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/routes/:routeId
 * 
 * Get route details
 */
app.get('/api/routes/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;

        console.log(`🔍 Get route: ${routeId}`);

        const message = {
            action: 'GET_ROUTE',
            data: { routeId },
            timestamp: new Date().toISOString()
        };

        const response = await publishAndWait(
            'ros_exchange',
            'route.get',
            message
        );

        res.status(response.success ? 200 : 404).json(response);

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/routes/:routeId
 * 
 * Update route
 */
app.put('/api/routes/:routeId', async (req, res) => {
    try {
        const { routeId } = req.params;
        const updates = req.body;

        console.log(`🔄 Update route: ${routeId}`);

        const message = {
            action: 'UPDATE_ROUTE',
            data: { routeId, updates },
            timestamp: new Date().toISOString()
        };

        const response = await publishAndWait(
            'ros_exchange',
            'route.update',
            message
        );

        res.status(response.success ? 200 : 404).json(response);

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Start Server
 */
async function start() {
    try {
        // Initialize RabbitMQ first
        await initRabbitMQ();

        // Then start HTTP server
        app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║         REST Protocol Adapter                  ║');
            console.log('╠════════════════════════════════════════════════╣');
            console.log(`║   🌐 HTTP Server: http://localhost:${PORT}      ║`);
            console.log('║   📡 RabbitMQ: Connected                       ║');
            console.log('║   🔄 Translating: REST → AMQP                  ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log('');
            console.log('📝 REST Endpoints:');
            console.log(`   POST   http://localhost:${PORT}/api/routes/optimize`);
            console.log(`   GET    http://localhost:${PORT}/api/routes/:id`);
            console.log(`   PUT    http://localhost:${PORT}/api/routes/:id`);
            console.log('');
            console.log('🔧 RabbitMQ Exchanges:');
            console.log('   • ros_exchange (direct)');
            console.log('');
            console.log('📬 Queues:');
            console.log('   • route.optimize');
            console.log('   • route.get');
            console.log('   • route.update');
            console.log('');
            console.log('✅ Ready to accept requests!\n');
        });

    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');

    if (channel) await channel.close();
    if (connection) await connection.close();

    console.log('✅ Closed RabbitMQ connections');
    process.exit(0);
});

// Start!
start();
