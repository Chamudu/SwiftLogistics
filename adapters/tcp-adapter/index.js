/**
 * TCP Protocol Adapter
 * 
 * This adapter listens for TCP socket connections and translates
 * the custom length-prefixed JSON protocol into RabbitMQ messages.

 */

import net from 'net';
import amqp from 'amqplib';

const TCP_PORT = 3003;
const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

let rabbitConnection = null;
let rabbitChannel = null;


/**
 * Initialize RabbitMQ
 */
async function initRabbitMQ() {
    try {
        console.log('📡 Connecting to RabbitMQ...');
        rabbitConnection = await amqp.connect(RABBITMQ_URL);
        rabbitChannel = await rabbitConnection.createChannel();
        console.log('✅ Connected to RabbitMQ\n');

        // Create WMS exchange
        await rabbitChannel.assertExchange('wms_exchange', 'direct', { durable: true });
        console.log('✅ Exchange created: wms_exchange');

        // Create WMS queues
        await rabbitChannel.assertQueue('package.create', { durable: true });
        await rabbitChannel.assertQueue('package.status', { durable: true });
        await rabbitChannel.assertQueue('package.update', { durable: true });
        await rabbitChannel.assertQueue('inventory.get', { durable: true });

        console.log('✅ Queues created');

        // Bind queues
        await rabbitChannel.bindQueue('package.create', 'wms_exchange', 'package.create');
        await rabbitChannel.bindQueue('package.status', 'wms_exchange', 'package.status');
        await rabbitChannel.bindQueue('package.update', 'wms_exchange', 'package.update');
        await rabbitChannel.bindQueue('inventory.get', 'wms_exchange', 'inventory.get');

        console.log('✅ Queues bound to exchange\n');

    } catch (error) {
        console.error('❌ RabbitMQ connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Publish to RabbitMQ and wait for response
 */
async function publishAndWait(exchange, routingKey, message, timeout = 5000) {
    return new Promise(async (resolve, reject) => {
        try {
            const { queue: replyQueue } = await rabbitChannel.assertQueue('', { exclusive: true });
            const correlationId = generateId();

            console.log(`📤 Publishing to queue: ${routingKey}`);

            const timeoutId = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, timeout);

            rabbitChannel.consume(replyQueue, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                    clearTimeout(timeoutId);
                    const response = JSON.parse(msg.content.toString());
                    console.log(`📥 Received response\n`);
                    rabbitChannel.ack(msg);
                    resolve(response);
                }
            }, { noAck: false });

            rabbitChannel.publish(
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

        } catch (error) {
            reject(error);
        }
    });
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

/**
 * Send message to TCP client using length-prefixed protocol
 */
function sendTCPMessage(socket, message) {
    const jsonString = JSON.stringify(message);
    const messageBuffer = Buffer.from(jsonString, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(messageBuffer.length, 0);

    socket.write(lengthBuffer);
    socket.write(messageBuffer);

    console.log(`📤 Sent ${messageBuffer.length} bytes to TCP client`);
}

/**
 * Handle TCP Connection
 */
function handleConnection(socket) {
    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;

    console.log('═══════════════════════════════════════════');
    console.log(`🔌 New TCP Connection: ${clientAddress}`);
    console.log('═══════════════════════════════════════════');

    let buffer = Buffer.alloc(0);
    let expectedLength = null;

    /**
     * Handle incoming data
     * 
     */
    socket.on('data', async (chunk) => {
        // Append new data to buffer
        buffer = Buffer.concat([buffer, chunk]);

        // Try to read messages from buffer
        while (buffer.length > 0) {
            // If we don't know the expected length, try to read it
            if (expectedLength === null) {
                if (buffer.length >= 4) {
                    expectedLength = buffer.readUInt32BE(0);
                    buffer = buffer.subarray(4); // Remove length prefix

                    console.log(`📏 Expecting message of ${expectedLength} bytes`);
                } else {
                    // Not enough data for length prefix yet
                    break;
                }
            }

            // If we know the length, try to read the message
            if (expectedLength !== null) {
                if (buffer.length >= expectedLength) {
                    // We have the complete message!
                    const messageBuffer = buffer.subarray(0, expectedLength);
                    buffer = buffer.subarray(expectedLength); // Remove message from buffer

                    const messageString = messageBuffer.toString('utf8');
                    console.log(`📨 Received complete message (${expectedLength} bytes)`);

                    try {
                        const message = JSON.parse(messageString);
                        console.log(`📋 Action: ${message.action}`);

                        // Process based on action
                        let response;
                        const timestamp = new Date().toISOString();

                        // Map action to  appropriate queue and transform message for Mock WMS
                        switch (message.action) {
                            case 'CREATE_PACKAGE':
                                // Transform to Mock WMS format
                                const wmsMessage = {
                                    type: 'CREATE_PACKAGE',
                                    orderId: message.data.packageId || 'ORD-' + Date.now(),
                                    items: message.data.items || [
                                        { sku: 'ITEM-001', quantity: 1 }
                                    ],
                                    destination: message.data.destination || message.data.address || 'Unknown'
                                };

                                response = await publishAndWait(
                                    'wms_exchange',
                                    'package.create',
                                    { action: message.action, data: wmsMessage, timestamp }
                                );
                                break;

                            case 'GET_PACKAGE_STATUS':
                                response = await publishAndWait(
                                    'wms_exchange',
                                    'package.status',
                                    { action: message.action, data: message.data, timestamp }
                                );
                                break;

                            case 'UPDATE_PACKAGE_STATUS':
                                response = await publishAndWait(
                                    'wms_exchange',
                                    'package.update',
                                    { action: message.action, data: message.data, timestamp }
                                );
                                break;

                            case 'GET_INVENTORY':
                                response = await publishAndWait(
                                    'wms_exchange',
                                    'inventory.get',
                                    { action: message.action, data: message.data || {}, timestamp }
                                );
                                break;

                            default:
                                response = {
                                    success: false,
                                    error: `Unknown action: ${message.action}`
                                };
                        }

                        // Send response back
                        sendTCPMessage(socket, response);

                    } catch (error) {
                        console.error('❌ Error processing message:', error.message);
                        sendTCPMessage(socket, {
                            success: false,
                            error: error.message
                        });
                    }

                    // Reset for next message
                    expectedLength = null;

                } else {
                    // Not enough data yet, wait for more
                    console.log(`⏳ Waiting for ${expectedLength - buffer.length} more bytes...`);
                    break;
                }
            }
        }
    });

    socket.on('end', () => {
        console.log(`🔌 Client disconnected: ${clientAddress}\n`);
    });

    socket.on('error', (err) => {
        console.error(`❌ Socket error: ${err.message}`);
    });
}

/**
 * Start TCP Server
 */
async function start() {
    try {
        await initRabbitMQ();

        const server = net.createServer(handleConnection);

        server.listen(TCP_PORT, () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║         TCP Protocol Adapter                   ║');
            console.log('╠════════════════════════════════════════════════╣');
            console.log(`║   🔌 TCP Server: localhost:${TCP_PORT}              ║`);
            console.log('║   📡 RabbitMQ: Connected                       ║');
            console.log('║   🔄 Translating: TCP/Binary → AMQP/JSON       ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log('');
            console.log('📝 Supported Actions:');
            console.log('   • CREATE_PACKAGE');
            console.log('   • GET_PACKAGE_STATUS');
            console.log('   • UPDATE_PACKAGE_STATUS');
            console.log('   • GET_INVENTORY');
            console.log('');
            console.log('🔧 Protocol:');
            console.log('   [4 bytes: length][JSON message]');
            console.log('');
            console.log('✅ Ready to accept TCP connections!\n');
        });

        server.on('error', (err) => {
            console.error('❌ TCP Server error:', err.message);
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (rabbitChannel) await rabbitChannel.close();
    if (rabbitConnection) await rabbitConnection.close();
    console.log('✅ Closed connections');
    process.exit(0);
});

start();
