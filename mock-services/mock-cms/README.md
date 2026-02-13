# Mock CMS (Client Management System)

A mock SOAP service that simulates a legacy client management system.

## 🎯 Purpose

This service simulates the **CMS (Client Management System)** mentioned in the SwiftLogistics scenario:
- Legacy on-premise system
- Uses SOAP/XML protocol
- Manages client information and orders
- Enterprise-grade service with WSDL

## 🏗️ Architecture

```
Client/Middleware
     ↓ (SOAP Request - XML)
┌─────────────────────┐
│   Mock CMS Server   │
│   (SOAP Service)    │
│   Port: 4000        │
└─────────────────────┘
     ↓ (SOAP Response - XML)
Client/Middleware
```

## 📡 SOAP Operations

### WSDL Location
```
http://localhost:4000/cms/wsdl
```

### Available Operations

#### 1. SubmitOrder
Create a new order in the CMS system.

**Request:**
```xml
<SubmitOrder>
  <ClientId>CL-001</ClientId>
  <DeliveryAddress>123 Main St, Colombo</DeliveryAddress>
  <Items>
    <Item>
      <SKU>ITEM-001</SKU>
      <Quantity>5</Quantity>
    </Item>
  </Items>
</SubmitOrder>
```

**Response:**
```xml
<SubmitOrderResponse>
  <OrderId>ORD-1001</OrderId>
  <Status>Accepted</Status>
  <CreatedAt>2024-02-13T10:30:00Z</CreatedAt>
  <Message>Order successfully submitted</Message>
</SubmitOrderResponse>
```

#### 2. GetOrderStatus
Retrieve the current status of an order.

**Request:**
```xml
<GetOrderStatus>
  <OrderId>ORD-1001</OrderId>
</GetOrderStatus>
```

**Response:**
```xml
<GetOrderStatusResponse>
  <OrderId>ORD-1001</OrderId>
  <Status>Accepted</Status>
  <CreatedAt>2024-02-13T10:30:00Z</CreatedAt>
  <ClientId>CL-001</ClientId>
  <DeliveryAddress>123 Main St, Colombo</DeliveryAddress>
</GetOrderStatusResponse>
```

#### 3. CancelOrder
Cancel an existing order.

**Request:**
```xml
<CancelOrder>
  <OrderId>ORD-1001</OrderId>
</CancelOrder>
```

**Response:**
```xml
<CancelOrderResponse>
  <OrderId>ORD-1001</OrderId>
  <Status>Cancelled</Status>
  <Message>Order successfully cancelled</Message>
</CancelOrderResponse>
```

#### 4. GetClientInfo
Retrieve information about a client.

**Request:**
```xml
<GetClientInfo>
  <ClientId>CL-001</ClientId>
</GetClientInfo>
```

**Response:**
```xml
<GetClientInfoResponse>
  <ClientId>CL-001</ClientId>
  <Name>ABC Corporation</Name>
  <Email>contact@abc.com</Email>
  <Phone>+94112345678</Phone>
  <Address>123 Business St, Colombo 03</Address>
</GetClientInfoResponse>
```

## 🚀 Running the Service

### Install Dependencies
```bash
# From project root
npm install

# Or from this directory
npm install
```

### Start the Server
```bash
# From project root
npm run dev:mock-cms

# Or from this directory
npm run dev
```

### Test the Service
```bash
# Using the test script (requires SOAP client)
node test.js

# Or check if running
curl http://localhost:4000/health
```

## 📚 Learning Points

### What is SOAP?
**SOAP** (Simple Object Access Protocol) is an XML-based messaging protocol:
- Uses XML for all messages
- Requires WSDL (Web Service Description Language)
- Built-in error handling via SOAP Faults
- Platform and language independent
- Common in enterprise/legacy systems

### SOAP Message Structure
```xml
<soap:Envelope>
  <soap:Header>
    <!-- Authentication, metadata -->
  </soap:Header>
  <soap:Body>
    <OperationName>
      <Parameter1>value</Parameter1>
      <Parameter2>value</Parameter2>
    </OperationName>
  </soap:Body>
</soap:Envelope>
```

### What is WSDL?
**WSDL** (Web Service Description Language) is an XML document that describes:
- Available operations (methods)
- Input parameters and types
- Output responses and types
- Service endpoint location

Think of it as a contract or API documentation that's machine-readable.

### SOAP Faults (Error Handling)
SOAP has built-in error handling:
```xml
<soap:Fault>
  <faultcode>Client</faultcode>
  <faultstring>Client CL-999 not found</faultstring>
</soap:Fault>
```

Fault codes:
- **Client**: Error in the request (400-style)
- **Server**: Error on the server side (500-style)

## 🔍 How It Works

1. **Server Setup**: Express.js with SOAP library
2. **WSDL Definition**: Describes service capabilities
3. **Service Implementation**: JavaScript functions for each operation
4. **SOAP Envelope Processing**: Library handles XML parsing/generation
5. **In-Memory Storage**: Uses JavaScript `Map` for data

## 📝 Pre-loaded Clients

The service comes with two test clients:

- **CL-001**: ABC Corporation
  - Email: contact@abc.com
  - Phone: +94112345678
  - Address: 123 Business St, Colombo 03

- **CL-002**: XYZ Enterprises
  - Email: info@xyz.com
  - Phone: +94117654321
  - Address: 456 Trade Ave, Colombo 07

## 🎓 SOAP vs REST

| Feature | SOAP | REST |
|---------|------|------|
| **Format** | XML | JSON |
| **Protocol** | SOAP (over HTTP) | HTTP |
| **Contract** | WSDL (required) | OpenAPI (optional) |
| **Complexity** | High | Low |
| **Size** | Larger (verbose XML) | Smaller |
| **Browser-Friendly** | No | Yes |
| **Use Case** | Enterprise/Legacy | Modern APIs |
| **Error Handling** | SOAP Faults | HTTP Status Codes |

## 🔧 Implementation Details

### Technology Stack
- **Node.js** with ES modules
- **Express.js** for HTTP server
- **soap** library for SOAP support
- **body-parser** for XML parsing
- **cors** for cross-origin requests

### Port
- **4000** (HTTP + SOAP)

### Protocol
- SOAP 1.1 with RPC binding
- Literal encoding

## 🎯 Next Steps

After understanding this mock service, we'll:
1. Build a SOAP adapter to integrate with our middleware
2. Handle XML-to-JSON conversion
3. Implement error handling and retries
4. Add SOAP client to our workers

## 📖 Additional Resources

- [SOAP Specification](https://www.w3.org/TR/soap/)
- [WSDL Specification](https://www.w3.org/TR/wsdl/)
- [node-soap Documentation](https://github.com/vpulim/node-soap)

## 💡 Notes

- This is a **mock** service for testing and learning
- Real CMS would have database and complex business logic
- WSDL is auto-generated and served at `/cms/wsdl`
- In production, you'd use authentication, logging, and monitoring
