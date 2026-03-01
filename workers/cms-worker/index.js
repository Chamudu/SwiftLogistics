

import amqp from 'amqplib';
import soap from 'soap';

const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';
const MOCK_CMS_URL = 'http://localhost:4000/cms/wsdl';  // Mock CMS WSDL endpoint

let connection = null;
let channel = null;
let soapClient = null;

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
 * Initialize SOAP Client
 */
async function initSOAPClient() {
    try {
        console.log('🧼 Connecting to Mock CMS SOAP service...');
        soapClient = await soap.createClientAsync(MOCK_CMS_URL);
        console.log('✅ SOAP client connected\n');
    } catch (error) {
        console.error('❌ SOAP client connection failed:', error.message);
        console.error('   Make sure Mock CMS is running on port 4000');
        process.exit(1);
    }
}

/**
 * Call SOAP Service
 */
async function callSOAPService(operation, params) {
    return new Promise((resolve, reject) => {
        soapClient[operation](params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Handle Submit Order
 */
async function handleSubmitOrder(message) {
    // Transform camelCase (from SOAP adapter) to PascalCase (for Mock CMS)
    const data = message.data;

    console.log(`  👤 Client: ${data.clientId}`);
    console.log(`  📦 Package: ${data.packageId}`);

    try {
        console.log(`  📞 Calling Mock CMS SOAP: SubmitOrder`);

        // Mock CMS expects PascalCase fields
        const result = await callSOAPService('SubmitOrder', {
            ClientId: data.clientId,          // camelCase → PascalCase
            PackageId: data.packageId,
            PickupAddress: data.pickupAddress,
            DeliveryAddress: data.deliveryAddress,
            PackageWeight: data.packageWeight,
            PackageDimensions: data.packageDimensions,
            DeliveryType: data.deliveryType,
            Items: data.items || {  // Mock CMS requires Items field
                Item: [
                    { SKU: 'ITEM-001', Quantity: 1 }
                ]
            }
        });

        console.log(`  ✅ Mock CMS responded`);
        return result;

    } catch (error) {
        console.error(`  ❌ Error calling Mock CMS:`, error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Handle Get Order Status
 */
async function handleGetOrderStatus(message) {
    const { orderId } = message.data;

    console.log(`  🔍 Order ID: ${orderId}`);

    try {
        console.log(`  📞 Calling Mock CMS SOAP: GetOrderStatus`);
        const result = await callSOAPService('GetOrderStatus', { orderId });
        console.log(`  ✅ Mock CMS responded`);
        return result;
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Handle Cancel Order
 */
async function handleCancelOrder(message) {
    const { orderId, reason } = message.data;

    console.log(`  🔍 Order ID: ${orderId}`);
    console.log(`  📝 Reason: ${reason}`);

    try {
        console.log(`  📞 Calling Mock CMS SOAP: CancelOrder`);
        const result = await callSOAPService('CancelOrder', { orderId, reason });
        console.log(`  ✅ Mock CMS responded`);
        return result;
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Handle Get Client Info
 */
async function handleGetClientInfo(message) {
    const { clientId } = message.data;

    console.log(`  👤 Client ID: ${clientId}`);

    try {
        console.log(`  📞 Calling Mock CMS SOAP: GetClientInfo`);
        const result = await callSOAPService('GetClientInfo', { clientId });
        console.log(`  ✅ Mock CMS responded`);
        return result;
    } catch (error) {
        console.error(`  ❌ Error:`, error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

/**
 * Start Consuming
 */
async function startConsuming() {
    console.log('🎧 Starting to consume messages...\n');

    // Submit Order queue
    channel.consume('order.submit', async (msg) => {
        if (msg !== null) {
            console.log('═══════════════════════════════════════════');
            console.log('📨 New Message: SUBMIT_ORDER');
            console.log('═══════════════════════════════════════════');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleSubmitOrder(message);

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

    console.log('✅ Consuming: order.submit');

    // Order Status queue
    channel.consume('order.status', async (msg) => {
        if (msg !== null) {
            console.log('📨 New Message: GET_ORDER_STATUS');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleGetOrderStatus(message);

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

    console.log('✅ Consuming: order.status');

    // Cancel Order queue
    channel.consume('order.cancel', async (msg) => {
        if (msg !== null) {
            console.log('📨 New Message: CANCEL_ORDER');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleCancelOrder(message);

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

    console.log('✅ Consuming: order.cancel');

    // Client Info queue
    channel.consume('client.info', async (msg) => {
        if (msg !== null) {
            console.log('📨 New Message: GET_CLIENT_INFO');

            try {
                const message = JSON.parse(msg.content.toString());
                const response = await handleGetClientInfo(message);

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

    console.log('✅ Consuming: client.info\n');
}

/**
 * Start Worker
 */
async function start() {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              CMS Worker                        ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   📡 Connecting to services...                 ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');

    await initRabbitMQ();
    await initSOAPClient();
    await startConsuming();

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          🎉 Worker Ready!                      ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log('║   Listening to:                                ║');
    console.log('║   • order.submit                               ║');
    console.log('║   • order.status                               ║');
    console.log('║   • order.cancel                               ║');
    console.log('║   • client.info                                ║');
    console.log('║                                                ║');
    console.log('║   Calling:                                     ║');
    console.log('║   • Mock CMS SOAP (http://localhost:4000/soap) ║');
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
