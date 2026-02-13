/**
 * Test Script for Mock CMS (SOAP Service)
 * 
 * This script tests the SOAP endpoints of our Mock CMS service.
 * Note: Testing SOAP is more complex than REST!
 */

import soap from 'soap';

const WSDL_URL = 'http://localhost:4000/cms/wsdl';

console.log('🧪 Testing Mock CMS (SOAP Service)...\n');

// Helper function to call SOAP methods
async function testSOAPMethod(client, methodName, args) {
    return new Promise((resolve, reject) => {
        console.log(`═══════════════════════════════════════════════════`);
        console.log(`Testing SOAP Method: ${methodName}`);
        console.log(`═══════════════════════════════════════════════════`);
        console.log('Request:', JSON.stringify(args, null, 2));
        console.log('');

        client[methodName](args, (err, result) => {
            if (err) {
                console.log('❌ SOAP Fault:');
                console.log(err);
                console.log('');
                reject(err);
            } else {
                console.log('✅ Response:');
                console.log(JSON.stringify(result, null, 2));
                console.log('');
                resolve(result);
            }
        });
    });
}

// Run tests
async function runTests() {
    try {
        console.log('📡 Creating SOAP client from WSDL...\n');

        // Create SOAP client
        const client = await soap.createClientAsync(WSDL_URL);

        console.log('✅ SOAP client created successfully!\n');
        console.log('📋 Available SOAP methods:');
        console.log(Object.keys(client).filter(k => !k.startsWith('_')));
        console.log('\n');

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 1: Get Client Info
        await testSOAPMethod(client, 'GetClientInfo', {
            ClientId: 'CL-001'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 2: Submit Order
        const orderResult = await testSOAPMethod(client, 'SubmitOrder', {
            ClientId: 'CL-001',
            DeliveryAddress: '789 Delivery Lane, Kandy',
            Items: {
                Item: [
                    { SKU: 'ITEM-001', Quantity: 5 },
                    { SKU: 'ITEM-002', Quantity: 10 }
                ]
            }
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 3: Get Order Status
        if (orderResult && orderResult.OrderId) {
            await testSOAPMethod(client, 'GetOrderStatus', {
                OrderId: orderResult.OrderId
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            // Test 4: Cancel Order
            await testSOAPMethod(client, 'CancelOrder', {
                OrderId: orderResult.OrderId
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            // Test 5: Get Order Status Again (should show Cancelled)
            await testSOAPMethod(client, 'GetOrderStatus', {
                OrderId: orderResult.OrderId
            });
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Test 6: Error case - Invalid Client
        try {
            await testSOAPMethod(client, 'GetClientInfo', {
                ClientId: 'INVALID-CLIENT'
            });
        } catch (err) {
            console.log('✅ Error handling works correctly!\n');
        }

        console.log('\n🎉 All SOAP tests completed!\n');

        console.log('╔════════════════════════════════════════════════╗');
        console.log('║          SOAP vs REST Comparison              ║');
        console.log('╠════════════════════════════════════════════════╣');
        console.log('║  SOAP:                                         ║');
        console.log('║  ✓ XML-based                                   ║');
        console.log('║  ✓ Self-documenting (WSDL)                     ║');
        console.log('║  ✓ Built-in error handling (Faults)           ║');
        console.log('║  ✓ More verbose                                ║');
        console.log('║                                                ║');
        console.log('║  REST:                                         ║');
        console.log('║  ✓ JSON-based                                  ║');
        console.log('║  ✓ Simpler, more lightweight                   ║');
        console.log('║  ✓ Standard HTTP methods                       ║');
        console.log('║  ✓ Less overhead                               ║');
        console.log('╚════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    }
}

// Run the tests
runTests();
