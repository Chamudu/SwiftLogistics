/**
 * SOAP Protocol Adapter
 * 
 * This adapter exposes a SOAP/XML interface that translates to RabbitMQ messages.
 * It acts as a bridge between SOAP clients and the message queue system.
 * 
 */

import express from 'express';
import soap from 'soap';
import cors from 'cors';
import amqp from 'amqplib';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;
const RABBITMQ_URL = 'amqp://admin:admin123@localhost:5672';

app.use(cors());
app.use(express.json()); // Enable JSON body parsing

// RabbitMQ connection
let connection = null;
let channel = null;

/**
 * Shared Logic: Publish Order to RabbitMQ
 * Used by both SOAP (legacy) and JSON (modern) endpoints
 */
async function publishOrderToRMS(data) {
    const message = {
        action: 'SUBMIT_ORDER',
        data: {
            clientId: data.clientId,
            packageId: data.packageId,
            pickupAddress: data.pickupAddress,
            deliveryAddress: data.deliveryAddress,
            packageWeight: parseFloat(data.packageWeight),
            packageDimensions: data.packageDimensions,
            deliveryType: data.deliveryType
        },
        timestamp: new Date().toISOString()
    };

    const response = await publishAndWait(
        'cms_exchange',
        'order.submit',
        message
    );

    return {
        success: true,
        orderId: response.OrderId || response.orderId || '',
        message: response.Message || response.message || '',
        estimatedCost: response.EstimatedCost || response.estimatedCost || 0,
        estimatedDeliveryDate: response.EstimatedDeliveryDate || response.estimatedDeliveryDate || ''
    };
}

/**
 * Initialize RabbitMQ
 */
async function initRabbitMQ() {
    try {
        console.log('📡 Connecting to RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log('✅ Connected to RabbitMQ\n');

        // Create CMS exchange
        await channel.assertExchange('cms_exchange', 'direct', { durable: true });
        console.log('✅ Exchange created: cms_exchange');

        // Create CMS queues
        await channel.assertQueue('order.submit', { durable: true });
        await channel.assertQueue('order.status', { durable: true });
        await channel.assertQueue('order.cancel', { durable: true });
        await channel.assertQueue('client.info', { durable: true });

        console.log('✅ Queues created: order.submit, order.status, order.cancel, client.info');

        // Bind queues
        await channel.bindQueue('order.submit', 'cms_exchange', 'order.submit');
        await channel.bindQueue('order.status', 'cms_exchange', 'order.status');
        await channel.bindQueue('order.cancel', 'cms_exchange', 'order.cancel');
        await channel.bindQueue('client.info', 'cms_exchange', 'client.info');

        console.log('✅ Queues bound to exchange\n');

    } catch (error) {
        console.error('❌ RabbitMQ connection failed:', error.message);
        process.exit(1);
    }
}

/**
 * Publish and wait for response
 */
async function publishAndWait(exchange, routingKey, message, timeout = 5000) {
    return new Promise(async (resolve, reject) => {
        try {
            const { queue: replyQueue } = await channel.assertQueue('', { exclusive: true });
            const correlationId = generateId();

            console.log(`📤 Publishing SOAP message to queue: ${routingKey}`);

            const timeoutId = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, timeout);

            channel.consume(replyQueue, (msg) => {
                if (msg.properties.correlationId === correlationId) {
                    clearTimeout(timeoutId);
                    const response = JSON.parse(msg.content.toString());
                    console.log(`📥 Received response\n`);
                    channel.ack(msg);
                    resolve(response);
                }
            }, { noAck: false });

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

        } catch (error) {
            reject(error);
        }
    });
}

function generateId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

/**
 * 🆕 JSON Endpoint (Modern Application)
 * Allows Order Service to send JSON directly
 */
app.post('/submit-order', async (req, res) => {
    try {
        console.log('═══════════════════════════════════════════');
        console.log('🚀 REST-to-SOAP Request: /submit-order');
        console.log('═══════════════════════════════════════════');

        const result = await publishOrderToRMS(req.body);

        console.log('✅ Order Processed via JSON Adapter');
        console.log('═══════════════════════════════════════════\n');

        res.json(result);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * SOAP Service Implementation
 */
const soapService = {
    CMSService: {
        CMSPort: {
            /**
             * Submit Order
             */
            SubmitOrder: async function (args) {
                console.log('═══════════════════════════════════════════');
                console.log('🧼 SOAP Request: SubmitOrder');
                console.log('═══════════════════════════════════════════');
                console.log('Input:', args);

                try {
                    const result = await publishOrderToRMS(args);
                    console.log('═══════════════════════════════════════════\n');
                    return result;

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    return {
                        success: false,
                        orderId: '',
                        message: error.message,
                        estimatedCost: 0,
                        estimatedDeliveryDate: ''
                    };
                }
            },

            /**
             * Get Order Status
             */
            GetOrderStatus: async function (args) {
                console.log('🧼 SOAP Request: GetOrderStatus');
                console.log('Order ID:', args.orderId);

                try {
                    const message = {
                        action: 'GET_ORDER_STATUS',
                        data: { orderId: args.orderId },
                        timestamp: new Date().toISOString()
                    };

                    const response = await publishAndWait(
                        'cms_exchange',
                        'order.status',
                        message
                    );

                    return {
                        success: response.success,
                        orderId: response.orderId || args.orderId,
                        status: response.status || 'UNKNOWN',
                        currentLocation: response.currentLocation || '',
                        estimatedDelivery: response.estimatedDelivery || '',
                        lastUpdate: response.lastUpdate || new Date().toISOString()
                    };

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    return {
                        success: false,
                        orderId: args.orderId,
                        status: 'ERROR',
                        currentLocation: '',
                        estimatedDelivery: '',
                        lastUpdate: new Date().toISOString()
                    };
                }
            },

            /**
             * Cancel Order
             */
            CancelOrder: async function (args) {
                console.log('🧼 SOAP Request: CancelOrder');
                console.log('Order ID:', args.orderId);

                try {
                    const message = {
                        action: 'CANCEL_ORDER',
                        data: {
                            orderId: args.orderId,
                            reason: args.reason
                        },
                        timestamp: new Date().toISOString()
                    };

                    const response = await publishAndWait(
                        'cms_exchange',
                        'order.cancel',
                        message
                    );

                    return {
                        success: response.success,
                        orderId: response.orderId || args.orderId,
                        message: response.message || '',
                        refundAmount: response.refundAmount || 0
                    };

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    return {
                        success: false,
                        orderId: args.orderId,
                        message: error.message,
                        refundAmount: 0
                    };
                }
            },

            /**
             * Get Client Info
             */
            GetClientInfo: async function (args) {
                console.log('🧼 SOAP Request: GetClientInfo');
                console.log('Client ID:', args.clientId);

                try {
                    const message = {
                        action: 'GET_CLIENT_INFO',
                        data: { clientId: args.clientId },
                        timestamp: new Date().toISOString()
                    };

                    const response = await publishAndWait(
                        'cms_exchange',
                        'client.info',
                        message
                    );

                    return {
                        success: response.success,
                        clientId: response.clientId || args.clientId,
                        name: response.name || '',
                        email: response.email || '',
                        phone: response.phone || '',
                        address: response.address || '',
                        accountStatus: response.accountStatus || 'UNKNOWN'
                    };

                } catch (error) {
                    console.error('❌ Error:', error.message);
                    return {
                        success: false,
                        clientId: args.clientId,
                        name: '',
                        email: '',
                        phone: '',
                        address: '',
                        accountStatus: 'ERROR'
                    };
                }
            }
        }
    }
};

/**
 * WSDL Definition
 */
const wsdl = `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="CMSService"
  targetNamespace="http://swiftlogistics.com/cms"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://swiftlogistics.com/cms"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">

  <types>
    <xsd:schema targetNamespace="http://swiftlogistics.com/cms">
      <!-- Submit Order Request -->
      <xsd:element name="SubmitOrderRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="clientId" type="xsd:string"/>
            <xsd:element name="packageId" type="xsd:string"/>
            <xsd:element name="pickupAddress" type="xsd:string"/>
            <xsd:element name="deliveryAddress" type="xsd:string"/>
            <xsd:element name="packageWeight" type="xsd:float"/>
            <xsd:element name="packageDimensions" type="xsd:string"/>
            <xsd:element name="deliveryType" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      
      <xsd:element name="SubmitOrderResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="success" type="xsd:boolean"/>
            <xsd:element name="orderId" type="xsd:string"/>
            <xsd:element name="message" type="xsd:string"/>
            <xsd:element name="estimatedCost" type="xsd:float"/>
            <xsd:element name="estimatedDeliveryDate" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="SubmitOrderRequest">
    <part name="parameters" element="tns:SubmitOrderRequest"/>
  </message>
  <message name="SubmitOrderResponse">
    <part name="parameters" element="tns:SubmitOrderResponse"/>
  </message>

  <portType name="CMSPortType">
    <operation name="SubmitOrder">
      <input message="tns:SubmitOrderRequest"/>
      <output message="tns:SubmitOrderResponse"/>
    </operation>
    <operation name="GetOrderStatus">
      <input message="tns:GetOrderStatusRequest"/>
      <output message="tns:GetOrderStatusResponse"/>
    </operation>
    <operation name="CancelOrder">
      <input message="tns:CancelOrderRequest"/>
      <output message="tns:CancelOrderResponse"/>
    </operation>
    <operation name="GetClientInfo">
      <input message="tns:GetClientInfoRequest"/>
      <output message="tns:GetClientInfoResponse"/>
    </operation>
  </portType>

  <binding name="CMSBinding" type="tns:CMSPortType">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="SubmitOrder">
      <soap:operation soapAction="SubmitOrder"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <service name="CMSService">
    <port name="CMSPort" binding="tns:CMSBinding">
      <soap:address location="http://localhost:${PORT}/soap"/>
    </port>
  </service>
</definitions>`;

/**
 * Start Server
 */
async function start() {
    try {
        await initRabbitMQ();

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║         SOAP Protocol Adapter                  ║');
            console.log('╠════════════════════════════════════════════════╣');
            console.log(`║   🌐 HTTP Server: http://localhost:${PORT}      ║`);
            console.log(`║   🧼 SOAP Service: http://localhost:${PORT}/soap║`);
            console.log(`║   📄 WSDL: http://localhost:${PORT}/soap?wsdl   ║`);
            console.log('║   📡 RabbitMQ: Connected                       ║');
            console.log('║   🔄 Translating: SOAP/XML → AMQP/JSON         ║');
            console.log('╚════════════════════════════════════════════════╝');
            console.log('');
            console.log('📝 SOAP Operations:');
            console.log('   • SubmitOrder');
            console.log('   • GetOrderStatus');
            console.log('   • CancelOrder');
            console.log('   • GetClientInfo');
            console.log('');
            console.log('✅ Ready to accept SOAP requests!\n');
        });

        // Attach SOAP service
        soap.listen(server, '/soap', soapService, wsdl);
        console.log('🧼 SOAP service attached to /soap endpoint\n');

    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('✅ Closed RabbitMQ connections');
    process.exit(0);
});

start();
