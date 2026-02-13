/**
 * Mock CMS (Client Management System)
 * 
 * This is a mock SOAP service that simulates a legacy client management system.
 * 
 * LEARNING POINTS:
 * - SOAP: XML-based protocol for web services (older but still widely used)
 * - WSDL: Web Service Description Language (describes the service)
 * - XML: eXtensible Markup Language (data format)
 * - Legacy Systems: Older systems that use SOAP instead of REST
 */

import express from 'express';
import soap from 'soap';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4000;

/**
 * LEARNING: What is CORS?
 * 
 * CORS = Cross-Origin Resource Sharing
 * 
 * Browser Security Rule:
 * - By default, browsers block requests from one origin to another
 * - Origin = protocol + domain + port
 * 
 * Examples:
 * ✅ Same origin (allowed):
 *    http://localhost:4000/page1 → http://localhost:4000/api
 * 
 * ❌ Different origin (blocked without CORS):
 *    file:///C:/test.html → http://localhost:4000/api (different protocol)
 *    http://localhost:3000 → http://localhost:4000/api (different port)
 *    http://example.com → http://api.example.com (different subdomain)
 * 
 * Solution:
 * - Server must explicitly allow cross-origin requests
 * - Use cors() middleware to allow ALL origins
 * - Or configure specific origins for production
 * 
 * Why this matters:
 * - Our HTML file (file://) needs to call localhost APIs
 * - Our frontend (port 5173) will need to call backend (port 4000)
 * - Without CORS, browser blocks these requests for security
 */

// Middleware
app.use(cors());  // ← CRITICAL: Enable CORS for browser access!
app.use(bodyParser.raw({ type: 'text/xml', limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage for orders and clients
const orders = new Map();
const clients = new Map();
let orderIdCounter = 1000;
let clientIdCounter = 100;

// Initialize some mock clients
clients.set('CL-001', {
    clientId: 'CL-001',
    name: 'ABC Corporation',
    email: 'contact@abc.com',
    phone: '+94112345678',
    address: '123 Business St, Colombo 03'
});

clients.set('CL-002', {
    clientId: 'CL-002',
    name: 'XYZ Enterprises',
    email: 'info@xyz.com',
    phone: '+94117654321',
    address: '456 Trade Ave, Colombo 07'
});

/**
 * LEARNING: What is SOAP?
 * 
 * SOAP = Simple Object Access Protocol
 * - XML-based messaging protocol
 * - Strictly defined structure (envelope, header, body)
 * - Platform and language independent
 * - Used in enterprise and legacy systems
 * 
 * SOAP Message Structure:
 * <soap:Envelope>
 *   <soap:Header>
 *     <!-- Optional authentication, etc. -->
 *   </soap:Header>
 *   <soap:Body>
 *     <MethodName>
 *       <parameter1>value1</parameter1>
 *       <parameter2>value2</parameter2>
 *     </MethodName>
 *   </soap:Body>
 * </soap:Envelope>
 */

/**
 * LEARNING: What is WSDL?
 * 
 * WSDL = Web Service Description Language
 * - XML file that describes the SOAP service
 * - Tells clients what methods are available
 * - Defines input/output data types
 * - Like an API documentation file
 * 
 * Think of it as a "menu" for the web service:
 * - What functions can I call?
 * - What parameters do they need?
 * - What will they return?
 */

// SOAP Service Implementation
const serviceImplementation = {
    CMSService: {
        CMSServicePort: {
            /**
             * SubmitOrder - Create a new order in the CMS
             * 
             * Input (XML):
             * <SubmitOrder>
             *   <ClientId>CL-001</ClientId>
             *   <DeliveryAddress>123 Main St</DeliveryAddress>
             *   <Items>
             *     <Item>
             *       <SKU>ITEM-001</SKU>
             *       <Quantity>5</Quantity>
             *     </Item>
             *   </Items>
             * </SubmitOrder>
             * 
             * Output (XML):
             * <SubmitOrderResponse>
             *   <OrderId>ORD-1001</OrderId>
             *   <Status>Accepted</Status>
             *   <CreatedAt>2024-02-13T10:30:00Z</CreatedAt>
             * </SubmitOrderResponse>
             */
            SubmitOrder: function (args, callback) {
                try {
                    console.log('📨 SOAP Request: SubmitOrder');
                    console.log('   Request Data:', JSON.stringify(args, null, 2));

                    const { ClientId, DeliveryAddress, Items } = args;

                    // Validation
                    if (!ClientId || !DeliveryAddress) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'Missing required fields: ClientId and DeliveryAddress'
                            }
                        });
                    }

                    // Check if client exists
                    if (!clients.has(ClientId)) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: `Client ${ClientId} not found`
                            }
                        });
                    }

                    // Create order
                    const orderId = `ORD-${orderIdCounter++}`;
                    const createdAt = new Date().toISOString();

                    const order = {
                        OrderId: orderId,
                        ClientId,
                        DeliveryAddress,
                        Items: Array.isArray(Items?.Item) ? Items.Item : [Items?.Item],
                        Status: 'Accepted',
                        CreatedAt: createdAt
                    };

                    orders.set(orderId, order);

                    console.log(`✅ Order created: ${orderId}`);
                    console.log(`   Client: ${ClientId}`);
                    console.log(`   Address: ${DeliveryAddress}`);
                    console.log(`   Items: ${order.Items.length}`);

                    // SOAP response
                    callback(null, {
                        OrderId: orderId,
                        Status: 'Accepted',
                        CreatedAt: createdAt,
                        Message: 'Order successfully submitted'
                    });

                } catch (error) {
                    console.error('❌ Error in SubmitOrder:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: error.message
                        }
                    });
                }
            },

            /**
             * GetOrderStatus - Get the current status of an order
             */
            GetOrderStatus: function (args, callback) {
                try {
                    console.log('📨 SOAP Request: GetOrderStatus');
                    console.log('   OrderId:', args.OrderId);

                    const { OrderId } = args;

                    if (!OrderId) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'OrderId is required'
                            }
                        });
                    }

                    const order = orders.get(OrderId);

                    if (!order) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: `Order ${OrderId} not found`
                            }
                        });
                    }

                    console.log(`✅ Order found: ${OrderId}`);
                    console.log(`   Status: ${order.Status}`);

                    callback(null, {
                        OrderId: order.OrderId,
                        Status: order.Status,
                        CreatedAt: order.CreatedAt,
                        ClientId: order.ClientId,
                        DeliveryAddress: order.DeliveryAddress
                    });

                } catch (error) {
                    console.error('❌ Error in GetOrderStatus:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: error.message
                        }
                    });
                }
            },

            /**
             * CancelOrder - Cancel an existing order
             */
            CancelOrder: function (args, callback) {
                try {
                    console.log('📨 SOAP Request: CancelOrder');
                    console.log('   OrderId:', args.OrderId);

                    const { OrderId } = args;

                    if (!OrderId) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'OrderId is required'
                            }
                        });
                    }

                    const order = orders.get(OrderId);

                    if (!order) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: `Order ${OrderId} not found`
                            }
                        });
                    }

                    // Update status
                    order.Status = 'Cancelled';
                    order.CancelledAt = new Date().toISOString();

                    console.log(`✅ Order cancelled: ${OrderId}`);

                    callback(null, {
                        OrderId: order.OrderId,
                        Status: 'Cancelled',
                        Message: 'Order successfully cancelled'
                    });

                } catch (error) {
                    console.error('❌ Error in CancelOrder:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: error.message
                        }
                    });
                }
            },

            /**
             * GetClientInfo - Get information about a client
             */
            GetClientInfo: function (args, callback) {
                try {
                    console.log('📨 SOAP Request: GetClientInfo');
                    console.log('   ClientId:', args.ClientId);

                    const { ClientId } = args;

                    if (!ClientId) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: 'ClientId is required'
                            }
                        });
                    }

                    const client = clients.get(ClientId);

                    if (!client) {
                        return callback({
                            Fault: {
                                faultcode: 'Client',
                                faultstring: `Client ${ClientId} not found`
                            }
                        });
                    }

                    console.log(`✅ Client found: ${ClientId}`);
                    console.log(`   Name: ${client.name}`);

                    callback(null, {
                        ClientId: client.clientId,
                        Name: client.name,
                        Email: client.email,
                        Phone: client.phone,
                        Address: client.address
                    });

                } catch (error) {
                    console.error('❌ Error in GetClientInfo:', error);
                    callback({
                        Fault: {
                            faultcode: 'Server',
                            faultstring: error.message
                        }
                    });
                }
            }
        }
    }
};

// WSDL Definition
const wsdlXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="CMSService"
  targetNamespace="http://swiftlogistics.com/cms"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://swiftlogistics.com/cms"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">

  <!-- Type Definitions -->
  <types>
    <xsd:schema targetNamespace="http://swiftlogistics.com/cms">
      
      <!-- Item Type -->
      <xsd:complexType name="Item">
        <xsd:sequence>
          <xsd:element name="SKU" type="xsd:string"/>
          <xsd:element name="Quantity" type="xsd:int"/>
        </xsd:sequence>
      </xsd:complexType>
      
      <!-- Items List -->
      <xsd:complexType name="ItemList">
        <xsd:sequence>
          <xsd:element name="Item" type="tns:Item" minOccurs="1" maxOccurs="unbounded"/>
        </xsd:sequence>
      </xsd:complexType>
      
    </xsd:schema>
  </types>

  <!-- Message Definitions -->
  
  <!-- SubmitOrder Messages -->
  <message name="SubmitOrderRequest">
    <part name="ClientId" type="xsd:string"/>
    <part name="DeliveryAddress" type="xsd:string"/>
    <part name="Items" type="tns:ItemList"/>
  </message>
  
  <message name="SubmitOrderResponse">
    <part name="OrderId" type="xsd:string"/>
    <part name="Status" type="xsd:string"/>
    <part name="CreatedAt" type="xsd:string"/>
    <part name="Message" type="xsd:string"/>
  </message>
  
  <!-- GetOrderStatus Messages -->
  <message name="GetOrderStatusRequest">
    <part name="OrderId" type="xsd:string"/>
  </message>
  
  <message name="GetOrderStatusResponse">
    <part name="OrderId" type="xsd:string"/>
    <part name="Status" type="xsd:string"/>
    <part name="CreatedAt" type="xsd:string"/>
    <part name="ClientId" type="xsd:string"/>
    <part name="DeliveryAddress" type="xsd:string"/>
  </message>
  
  <!-- CancelOrder Messages -->
  <message name="CancelOrderRequest">
    <part name="OrderId" type="xsd:string"/>
  </message>
  
  <message name="CancelOrderResponse">
    <part name="OrderId" type="xsd:string"/>
    <part name="Status" type="xsd:string"/>
    <part name="Message" type="xsd:string"/>
  </message>
  
  <!-- GetClientInfo Messages -->
  <message name="GetClientInfoRequest">
    <part name="ClientId" type="xsd:string"/>
  </message>
  
  <message name="GetClientInfoResponse">
    <part name="ClientId" type="xsd:string"/>
    <part name="Name" type="xsd:string"/>
    <part name="Email" type="xsd:string"/>
    <part name="Phone" type="xsd:string"/>
    <part name="Address" type="xsd:string"/>
  </message>

  <!-- Port Type (Operations) -->
  <portType name="CMSServicePortType">
    
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

  <!-- Binding (SOAP Details) -->
  <binding name="CMSServiceBinding" type="tns:CMSServicePortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
    
    <operation name="SubmitOrder">
      <soap:operation soapAction="SubmitOrder"/>
      <input><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></input>
      <output><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></output>
    </operation>
    
    <operation name="GetOrderStatus">
      <soap:operation soapAction="GetOrderStatus"/>
      <input><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></input>
      <output><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></output>
    </operation>
    
    <operation name="CancelOrder">
      <soap:operation soapAction="CancelOrder"/>
      <input><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></input>
      <output><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></output>
    </operation>
    
    <operation name="GetClientInfo">
      <soap:operation soapAction="GetClientInfo"/>
      <input><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></input>
      <output><soap:body use="literal" namespace="http://swiftlogistics.com/cms"/></output>
    </operation>
    
  </binding>

  <!-- Service -->
  <service name="CMSService">
    <documentation>Client Management System SOAP Service</documentation>
    <port name="CMSServicePort" binding="tns:CMSServiceBinding">
      <soap:address location="http://localhost:4000/cms"/>
    </port>
  </service>

</definitions>`;

// Serve WSDL
app.get('/cms/wsdl', (req, res) => {
    res.set('Content-Type', 'text/xml');
    res.send(wsdlXml);
});

// Health check endpoint (REST for convenience)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Mock CMS (Client Management System)',
        protocol: 'SOAP/XML',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   🏢 Mock CMS (Client Management System)      ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║   🌐 Server running on: http://localhost:${PORT}  ║`);
    console.log('║   📡 Protocol: SOAP/XML                        ║');
    console.log('║   ✅ Status: Ready to accept requests          ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
    console.log('📝 SOAP Endpoint:');
    console.log(`   http://localhost:${PORT}/cms`);
    console.log('');
    console.log('📄 WSDL Location:');
    console.log(`   http://localhost:${PORT}/cms/wsdl`);
    console.log('');
    console.log('🔧 Available Operations:');
    console.log('   • SubmitOrder      - Create new order');
    console.log('   • GetOrderStatus   - Get order status');
    console.log('   • CancelOrder      - Cancel order');
    console.log('   • GetClientInfo    - Get client details');
    console.log('');

    // Create SOAP server
    soap.listen(app, '/cms', serviceImplementation, wsdlXml);
    console.log('✅ SOAP service initialized!');
    console.log('');
});

/**
 * LEARNING SUMMARY: SOAP vs REST
 * 
 * REST (Mock ROS):
 * ✅ Simple and lightweight
 * ✅ Uses JSON (easy to read)
 * ✅ Standard HTTP methods
 * ✅ Modern systems
 * 
 * SOAP (Mock CMS):
 * ✅ Formal and standardized
 * ✅ Uses XML (more verbose)
 * ✅ Built-in error handling (Faults)
 * ✅ Self-describing (WSDL)
 * ✅ Enterprise/Legacy systems
 * 
 * Both have their place:
 * - REST for new, simple APIs
 * - SOAP for enterprise, when you need formal contracts
 */
