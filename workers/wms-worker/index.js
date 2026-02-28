/**
 * WMS Worker
 * 
 * Processes warehouse management system requests from RabbitMQ
 * and calls the Mock WMS TCP service.
 * 
 * LEARNING: This worker shows how to call a TCP service
 * using raw sockets and a custom protocol.
 */

import amqp from 'amqplib';
import net from 'net';

const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';
const MOCK_WMS_HOST = 'localhost';
const MOCK_WMS_PORT = 4001;

let connection = null;
let channel = null;

/**
 * Initialize RabbitMQ
 */
async function initRabbitMQ() {
    try {
        console.log('📡 Connecting to RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.prefetch(1);
        console.log('✅ Connected to RabbitMQ\n');
    } catch (error) {
        console.error('❌ RabbitMQ connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Call TCP Service
 * 
 * LEARNING: Calling a TCP service requires:
 * 1. Create socket connection
 * 2. Send message with length prefix
 * 3. Read response (handle buffering!)
 * 4. Parse response
 * 5. Close connection
 */
async function callTCPService(message) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        let buffer = Buffer.alloc(0);
        let expectedLength = null;

        socket.connect(MOCK_WMS_PORT, MOCK_WMS_HOST, () => {
            console.log(`  🔌 Connected to Mock WMS TCP service`);

            // Prepare message with length prefix
            const jsonString = JSON.stringify(message);
            const messageBuffer = Buffer.from(jsonString, 'utf8');
            const lengthBuffer = Buffer.alloc(4);
            lengthBuffer.writeUInt32BE(messageBuffer.length, 0);

            // Send length + message
            socket.write(lengthBuffer);
            socket.write(messageBuffer);

            console.log(`  📤 Sent ${messageBuffer.length} bytes to Mock WMS`);
        });

        socket.on('data', (chunk) => {
            // Append to buffer
            buffer = Buffer.concat([buffer, chunk]);

            // Try to read response
            while (buffer.length > 0) {
                if (expectedLength === null) {
                    if (buffer.length >= 4) {
                        expectedLength = buffer.readUInt32BE(0);
                        buffer = buffer.slice(4);
                        console.log(`  📏 Expecting response of ${expectedLength} bytes`);
                    } else {
                        break;
                    }
                }

                if (expectedLength !== null) {
                    if (buffer.length >= expectedLength) {
                        const responseBuffer = buffer.slice(0, expectedLength);
                        const responseString = responseBuffer.toString('utf8');

                        console.log(`  📥 Received ${expectedLength} bytes from Mock WMS`);

                        try {
                            const response = JSON.parse(responseString);
                            socket.end();
                            resolve(response);
                        } catch (error) {
                            socket.end();
                            reject(new Error('Invalid JSON response'));
                        }

                        return;
                    } else {
                        break;
                    }
                }
            }
        });

        socket.on('error', (err) => {
            console.error(`  ❌ TCP Socket error: ${err.message}`);
            reject(err);
        });

        socket.on('timeout', () => {
            console.error(`  ⏱️  TCP Socket timeout`);
            socket.end();
            reject(new Error('TCP connection timeout'));
        });

        socket.setTimeout(5000); // 5 second timeout
    });
}

/**
 * Handle Create Package
 */
async function handleCreatePackage(message) {
    // Message.data already contains the transformed WMS format from TCP adapter
    const wmsData = message.data;

    console.log(`  📦 Order: ${wmsData.orderId}`);
    console.log(`  📍 Destination: ${wmsData.destination}`);

    try {
        // Call TCP service with Mock WMS expected format
        const response = await callTCPService(wmsData);

        console.log(`  ✅ Mock WMS responded`);
        return response;

    } catch (error) {
        console.error(`  ❌ Error calling Mock WMS:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle Get Package Status
 */
async function handleGetPackageStatus(message) {
    const { packageId } = message.data;

    console.log(`  🔍 Package ID: ${packageId}`);

    try {
        const response = await callTCPService({
            type: 'GET_PACKAGE_STATUS',
            data: { packageId }
        });

        console.log(`  ✅ Mock WMS responded`);
        return response;
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle Update Package Status
 */
async function handleUpdatePackageStatus(message) {
    const { packageId, status, location } = message.data;

    console.log(`  📦 Package: ${packageId}`);
    console.log(`  🔄 New Status: ${status}`);

    try {
        const response = await callTCPService({
            type: 'UPDATE_PACKAGE_STATUS',
            data: { packageId, status, location }
        });

        console.log(`  ✅ Mock WMS responded`);
        return response;
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Handle Get Inventory
 */
async function handleGetInventory(message) {
    console.log(`  📊 Getting inventory`);

    try {
        const response = await callTCPService({
            type: 'GET_INVENTORY',
            data: message.data || {}
        });

        console.log(`  ✅ Mock WMS responded`);
        return response;
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Start Consuming
 */
async function startConsuming() {
    console.log('🎧 Starting to consume messages...\n');

    // Create Package queue
    channel.consume('package.create', async (msg) => {
        if (msg !== null) {
            console.log('═══════════════════════════════════════════');
            console.log('📨 New Message: CREATE_PACKAGE');
            console.log('═══════════════════════════════════════════');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleCreatePackage(message);

                if (msg.properties.replyTo) {
                    channel.sendToQueue(
                        msg.properties.replyTo,
                        Buffer.from(JSON.stringify(response)),
                        { correlationId: msg.properties.correlationId }
                    );
                }

                channel.ack(msg);
                console.log('═══════════════════════════════════════════\n');
            } catch (error) {
                console.error('❌ Error:', error.message);
                channel.nack(msg, false, true);
            }
        }
    }, { noAck: false });

    console.log('✅ Consuming: package.create');

    // Package Status queue
    channel.consume('package.status', async (msg) => {
        if (msg !== null) {
            console.log('📨 New Message: GET_PACKAGE_STATUS');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleGetPackageStatus(message);

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

    console.log('✅ Consuming: package.status');

    // Update Package queue
    channel.consume('package.update', async (msg) => {
        if (msg !== null) {
            console.log('📨 New Message: UPDATE_PACKAGE_STATUS');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleUpdatePackageStatus(message);

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

    console.log('✅ Consuming: package.update');

    // Get Inventory queue
    channel.consume('inventory.get', async (msg) => {
        if (msg !== null) {
            console.log('📨 New Message: GET_INVENTORY');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleGetInventory(message);

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

    console.log('✅ Consuming: inventory.get\n');
}

/**
 * Start Worker
 */
async function start() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              WMS Worker                        ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   📡 Connecting to services...                 ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');

    await initRabbitMQ();
    await startConsuming();

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          🎉 Worker Ready!                      ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   Listening to:                                ║');
    console.log('║   • package.create                             ║');
    console.log('║   • package.status                             ║');
    console.log('║   • package.update                             ║');
    console.log('║   • inventory.get                              ║');
    console.log('║                                                ║');
    console.log('║   Calling:                                     ║');
    console.log('║   • Mock WMS TCP (localhost:4001)              ║');
    console.log('║                                                ║');
    console.log('║   Status: Waiting for messages...              ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('✅ Closed connections');
    process.exit(0);
});

start();
