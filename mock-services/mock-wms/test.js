/**
 * Test Script for Mock WMS (TCP/IP Service)
 * 
 * This script tests the TCP/IP endpoints of our Mock WMS service.
 * Note: TCP requires a client to connect to the socket!
 */

import net from 'net';

const HOST = 'localhost';
const PORT = 4001;

console.log('🧪 Testing Mock WMS (TCP/IP Service)...\n');

/**
 * Create a TCP client and send a message
 */
function sendMessage(messageData) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        let buffer = Buffer.alloc(0);

        // Connect to server
        client.connect(PORT, HOST, () => {
            console.log(`✅ Connected to WMS at ${HOST}:${PORT}`);
            console.log(`📤 Sending:`, messageData);

            // Create length-prefixed message
            const json = JSON.stringify(messageData);
            const length = Buffer.byteLength(json, 'utf8');
            const lengthBuffer = Buffer.allocUnsafe(4);
            lengthBuffer.writeUInt32BE(length, 0);
            const message = Buffer.concat([lengthBuffer, Buffer.from(json, 'utf8')]);

            // Send message
            client.write(message);
        });

        // Receive response
        client.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            // Parse response
            if (buffer.length >= 4) {
                const length = buffer.readUInt32BE(0);

                if (buffer.length >= 4 + length) {
                    const jsonData = buffer.slice(4, 4 + length).toString('utf8');
                    const response = JSON.parse(jsonData);

                    console.log(`📥 Received:`, response);
                    console.log('');

                    client.destroy();
                    resolve(response);
                }
            }
        });

        // Handle errors
        client.on('error', (err) => {
            console.log(`❌ Error:`, err.message);
            reject(err);
        });

        client.on('close', () => {
            console.log(`👋 Connection closed\n`);
        });
    });
}

// Run tests
async function runTests() {
    try {
        console.log('═══════════════════════════════════════════════════');
        console.log('Test 1: Get Inventory');
        console.log('═══════════════════════════════════════════════════\n');

        await sendMessage({
            type: 'GET_INVENTORY'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('═══════════════════════════════════════════════════');
        console.log('Test 2: Create Package');
        console.log('═══════════════════════════════════════════════════\n');

        const createResult = await sendMessage({
            type: 'CREATE_PACKAGE',
            orderId: 'ORD-1001',
            items: [
                { sku: 'ITEM-001', quantity: 2 },
                { sku: 'ITEM-002', quantity: 5 }
            ],
            destination: '123 Galle Road, Colombo'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        if (createResult.status === 'SUCCESS') {
            const packageId = createResult.packageId;

            console.log('═══════════════════════════════════════════════════');
            console.log('Test 3: Get Package Status');
            console.log('═══════════════════════════════════════════════════\n');

            await sendMessage({
                type: 'GET_PACKAGE_STATUS',
                packageId
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('═══════════════════════════════════════════════════');
            console.log('Test 4: Update Package Status');
            console.log('═══════════════════════════════════════════════════\n');

            await sendMessage({
                type: 'UPDATE_PACKAGE_STATUS',
                packageId,
                newStatus: 'PICKED'
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('═══════════════════════════════════════════════════');
            console.log('Test 5: Get Package Status Again (should show PICKED)');
            console.log('═══════════════════════════════════════════════════\n');

            await sendMessage({
                type: 'GET_PACKAGE_STATUS',
                packageId
            });

            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('═══════════════════════════════════════════════════');
            console.log('Test 6: Remove Package');
            console.log('═══════════════════════════════════════════════════\n');

            await sendMessage({
                type: 'REMOVE_PACKAGE',
                packageId
            });

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('═══════════════════════════════════════════════════');
        console.log('Test 7: Error Case - Invalid Message Type');
        console.log('═══════════════════════════════════════════════════\n');

        await sendMessage({
            type: 'INVALID_TYPE',
            data: 'test'
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('═══════════════════════════════════════════════════');
        console.log('Test 8: Get Inventory Again (should show updated)');
        console.log('═══════════════════════════════════════════════════\n');

        await sendMessage({
            type: 'GET_INVENTORY'
        });

        console.log('\n🎉 All TCP tests completed!\n');

        console.log('╔════════════════════════════════════════════════╗');
        console.log('║        Protocol Comparison Summary            ║');
        console.log('╠════════════════════════════════════════════════╣');
        console.log('║                                                ║');
        console.log('║  REST (Mock ROS):                              ║');
        console.log('║  ✓ HTTP + JSON                                 ║');
        console.log('║  ✓ Stateless                                   ║');
        console.log('║  ✓ Request/Response                            ║');
        console.log('║  ✓ Browser-friendly                            ║');
        console.log('║                                                ║');
        console.log('║  SOAP (Mock CMS):                              ║');
        console.log('║  ✓ HTTP + XML                                  ║');
        console.log('║  ✓ WSDL contract                               ║');
        console.log('║  ✓ Enterprise standard                         ║');
        console.log('║  ✓ Built-in error handling                     ║');
        console.log('║                                                ║');
        console.log('║  TCP/IP (Mock WMS):                            ║');
        console.log('║  ✓ Raw sockets                                 ║');
        console.log('║  ✓ Custom protocol                             ║');
        console.log('║  ✓ Persistent connections                      ║');
        console.log('║  ✓ Stateful                                    ║');
        console.log('║  ✓ Lower overhead                              ║');
        console.log('║                                                ║');
        console.log('╚════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    }
}

// Run the tests
runTests();
