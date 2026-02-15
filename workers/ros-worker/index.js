/**
 * ROS Worker
 * 
 * This worker:
 * 1. Listens to RabbitMQ queues
 * 2. Processes route optimization requests
 * 3. Calls Mock ROS service
 * 4. Sends response back through RabbitMQ
 * 
 * LEARNING POINTS:
 * - Worker Pattern (Consumer)
 * - Service Integration
 * - Message Acknowledgment
 * - Error Handling in Distributed Systems
 */

import amqp from 'amqplib';
import fetch from 'node-fetch';

const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';
const MOCK_ROS_URL = 'http://localhost:4002';

let connection = null;
let channel = null;

/**
 * Initialize RabbitMQ Connection
 */
async function initRabbitMQ() {
    try {
        console.log('📡 Connecting to RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ\n');

        // Set prefetch to 1 (process one message at a time)
        await channel.prefetch(1);

        /**
         * LEARNING: What is prefetch?
         * 
         * prefetch(1) means:
         * - Worker gets 1 message at a time
         * - Must acknowledge before getting next
         * - Ensures fair distribution across workers
         * 
         * Without prefetch:
         * - Worker A might get 10 messages
         * - Worker B might get 0 messages
         * - Unfair load distribution
         * 
         * With prefetch(1):
         * - Messages distributed evenly
         * - Slower workers don't get overwhelmed
         * - Better system balance
         */

        console.log('⚙️  Prefetch set to 1 (fair distribution)\n');

    } catch (error) {
        console.error('❌ RabbitMQ connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Call Mock ROS Service
 */
async function callMockROS(endpoint, method, body = null) {
    const url = `${MOCK_ROS_URL}${endpoint}`;

    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    console.log(`  📞 Calling Mock ROS: ${method} ${endpoint}`);

    const response = await fetch(url, options);
    const data = await response.json();

    console.log(`  ✅ Mock ROS responded: ${response.status}`);

    return data;
}

/**
 * Process Route Optimization Request
 */
async function handleOptimizeRoute(message) {
    const { packageId, address, priority, deliveryWindow } = message.data;

    console.log(`  📦 Package: ${packageId}`);
    console.log(`  📍 Address: ${address}`);
    console.log(`  ⚡ Priority: ${priority}`);

    try {
        // Call Mock ROS
        const result = await callMockROS('/api/routes/optimize', 'POST', {
            packageId,
            address,
            priority,
            deliveryWindow
        });

        return result;

    } catch (error) {
        console.error(`  ❌ Error calling Mock ROS:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process Get Route Request
 */
async function handleGetRoute(message) {
    const { routeId } = message.data;

    console.log(`  🔍 Route ID: ${routeId}`);

    try {
        const result = await callMockROS(`/api/routes/${routeId}`, 'GET');
        return result;
    } catch (error) {
        console.error(`  ❌ Error calling Mock ROS:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process Update Route Request
 */
async function handleUpdateRoute(message) {
    const { routeId, updates } = message.data;

    console.log(`  🔄 Route ID: ${routeId}`);
    console.log(`  📝 Updates:`, updates);

    try {
        const result = await callMockROS(`/api/routes/${routeId}`, 'PUT', updates);
        return result;
    } catch (error) {
        console.error(`  ❌ Error calling Mock ROS:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Start Consuming Messages
 */
async function startConsuming() {
    try {
        console.log('🎧 Starting to consume messages...\n');

        // Consume route.optimize queue
        channel.consume('route.optimize', async (msg) => {
            if (msg !== null) {
                console.log('═══════════════════════════════════════════');
                console.log('📨 New Message: OPTIMIZE_ROUTE');
                console.log('═══════════════════════════════════════════');

                try {
                    // Parse message
                    const message = JSON.parse(msg.content.toString());
                    console.log(`  Correlation ID: ${msg.properties.correlationId}`);
                    console.log(`  Reply To: ${msg.properties.replyTo}`);

                    // Process message
                    const response = await handleOptimizeRoute(message);

                    // Send response back
                    if (msg.properties.replyTo) {
                        channel.sendToQueue(
                            msg.properties.replyTo,
                            Buffer.from(JSON.stringify(response)),
                            {
                                correlationId: msg.properties.correlationId
                            }
                        );
                        console.log(`  ✅ Response sent to ${msg.properties.replyTo}`);
                    }

                    // Acknowledge message
                    channel.ack(msg);
                    console.log(`  ✅ Message acknowledged`);
                    console.log('═══════════════════════════════════════════\n');

                } catch (error) {
                    console.error('  ❌ Error processing message:', error.message);

                    // Negative acknowledgment - requeue the message
                    channel.nack(msg, false, true);
                    console.log('  ⚠️  Message requeued for retry\n');
                }
            }
        }, { noAck: false });

        /**
         * LEARNING: Message Acknowledgment
         * 
         * noAck: false means manual acknowledgment:
         * - Worker must explicitly ack() message
         * - If worker crashes, message goes back to queue
         * - Ensures message isn't lost
         * 
         * noAck: true means auto-acknowledgment:
         * - RabbitMQ removes message immediately
         * - If worker crashes, message is LOST
         * - Faster but risky
         * 
         * ack(msg):
         * - "I processed this successfully"
         * - RabbitMQ removes from queue
         * 
         * nack(msg, false, true):
         * - "I failed, please retry"
         * - false: don't ack multiple messages
         * - true: requeue (send back to queue)
         */

        console.log('✅ Consuming: route.optimize');

        // Consume route.get queue
        channel.consume('route.get', async (msg) => {
            if (msg !== null) {
                console.log('📨 New Message: GET_ROUTE');

                try {
                    const message = JSON.parse(msg.content.toString());
                    const response = await handleGetRoute(message);

                    if (msg.properties.replyTo) {
                        channel.sendToQueue(
                            msg.properties.replyTo,
                            Buffer.from(JSON.stringify(response)),
                            { correlationId: msg.properties.correlationId }
                        );
                    }

                    channel.ack(msg);
                    console.log('✅ Message processed\n');

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    channel.nack(msg, false, true);
                }
            }
        }, { noAck: false });

        console.log('✅ Consuming: route.get');

        // Consume route.update queue
        channel.consume('route.update', async (msg) => {
            if (msg !== null) {
                console.log('📨 New Message: UPDATE_ROUTE');

                try {
                    const message = JSON.parse(msg.content.toString());
                    const response = await handleUpdateRoute(message);

                    if (msg.properties.replyTo) {
                        channel.sendToQueue(
                            msg.properties.replyTo,
                            Buffer.from(JSON.stringify(response)),
                            { correlationId: msg.properties.correlationId }
                        );
                    }

                    channel.ack(msg);
                    console.log('✅ Message processed\n');

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    channel.nack(msg, false, true);
                }
            }
        }, { noAck: false });

        console.log('✅ Consuming: route.update\n');

    } catch (error) {
        console.error('❌ Failed to start consuming:', error.message);
        process.exit(1);
    }
}

/**
 * Start Worker
 */
async function start() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              ROS Worker                        ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   📡 Connecting to RabbitMQ...                 ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');

    await initRabbitMQ();
    await startConsuming();

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          🎉 Worker Ready!                      ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   Listening to:                                ║');
    console.log('║   • route.optimize                             ║');
    console.log('║   • route.get                                  ║');
    console.log('║   • route.update                               ║');
    console.log('║                                                ║');
    console.log('║   Calling:                                     ║');
    console.log('║   • Mock ROS (http://localhost:4002)           ║');
    console.log('║                                                ║');
    console.log('║   Status: Waiting for messages...              ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
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

/**
 * LEARNING SUMMARY: Worker Pattern
 * 
 * What is a Worker?
 * - Processes messages from queues
 * - Runs independently (can have multiple)
 * - Stateless (doesn't store data)
 * - Auto-scales (add more workers = more capacity)
 * 
 * Worker Lifecycle:
 * 1. Connect to RabbitMQ
 * 2. Start consuming queue
 * 3. Wait for message
 * 4. Process message
 * 5. Send response (if needed)
 * 6. Acknowledge or reject
 * 7. Repeat from step 3
 * 
 * Benefits:
 * ✅ Scalability: Run 10 workers = 10x throughput
 * ✅ Reliability: If one crashes, others continue
 * ✅ Load balancing: RabbitMQ distributes evenly
 * ✅ Resilience: Messages survive worker crashes
 * 
 * Best Practices:
 * ✅ Use prefetch(1) for fair distribution
 * ✅ Manual acknowledgment (noAck: false)
 * ✅ Graceful shutdown (close connections)
 * ✅ Error handling (nack + requeue)
 * ✅ Logging for debugging
 */
