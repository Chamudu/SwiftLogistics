/**
 * Complete Middleware Test Suite
 * Tests all three protocol adapters: REST, SOAP, TCP
 */

import fetch from 'node-fetch';
import soap from 'soap';
import net from 'net';

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test REST Adapter → ROS Worker → Mock ROS
 */
async function testREST() {
    log('\n╔════════════════════════════════════════════════════════╗', 'bright');
    log('║  TEST 1: REST Protocol (Route Optimization)           ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'bright');

    try {
        log('\n📤 Sending request to REST Adapter (port 3001)...', 'blue');

        const response = await fetch('http://localhost:3001/api/routes/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packageId: 'PKG-REST-001',
                address: '123 REST Avenue, Colombo',
                priority: 'high'
            })
        });

        const data = await response.json();

        if (data.success) {
            log('\n✅ REST Flow SUCCESSFUL!', 'green');
            log(`   Route ID: ${data.routeId}`, 'green');
            log(`   Driver: ${data.driverId}`, 'green');
            log(`   Distance: ${data.distance} km`, 'green');

            log('\n📊 Flow:', 'yellow');
            log('   Client → REST Adapter (3001)', 'yellow');
            log('   ↓', 'yellow');
            log('   RabbitMQ (ros_exchange → route.optimize)', 'yellow');
            log('   ↓', 'yellow');
            log('   ROS Worker', 'yellow');
            log('   ↓', 'yellow');
            log('   Mock ROS (4002)', 'yellow');
            log('   ↓', 'yellow');
            log('   Response back through RabbitMQ', 'yellow');

            return true;
        } else {
            log('\n❌ REST Flow FAILED:', 'red');
            log(`   Error: ${data.error}`, 'red');
            return false;
        }

    } catch (error) {
        log('\n❌ REST Test Error:', 'red');
        log(`   ${error.message}`, 'red');
        log('   Make sure REST Adapter (3001) and ROS Worker are running!', 'yellow');
        return false;
    }
}

/**
 * Test SOAP Adapter → CMS Worker → Mock CMS
 */
async function testSOAP() {
    log('\n╔════════════════════════════════════════════════════════╗', 'bright');
    log('║  TEST 2: SOAP Protocol (Client Management)            ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'bright');

    try {
        log('\n📤 Connecting to SOAP Adapter (port 3002)...', 'blue');

        const client = await soap.createClientAsync('http://localhost:3002/soap?wsdl');

        log('✅ SOAP Client connected', 'green');
        log('\n📤 Sending SubmitOrder request...', 'blue');

        const result = await new Promise((resolve, reject) => {
            client.SubmitOrder({
                clientId: 'CL-001',
                packageId: 'PKG-SOAP-001',
                pickupAddress: '100 SOAP Street, Kandy',
                deliveryAddress: '200 XML Avenue, Galle',
                packageWeight: 5.5,
                packageDimensions: '30x20x15',
                deliveryType: 'express'
            }, (err, result) => {
                if (err) {
                    log(`\n❌ SOAP Error Details:`, 'red');
                    log(`   ${JSON.stringify(err, null, 2)}`, 'red');
                    reject(err);
                }
                else resolve(result);
            });
        });

        log('\n📋 SOAP Response:', 'blue');
        log(JSON.stringify(result, null, 2), 'blue');

        if (result && (result.success || result.OrderId)) {
            log('\n✅ SOAP Flow SUCCESSFUL!', 'green');
            log(`   Order ID: ${result.orderId}`, 'green');
            log(`   Message: ${result.message}`, 'green');
            log(`   Estimated Cost: $${result.estimatedCost}`, 'green');

            log('\n📊 Flow:', 'yellow');
            log('   SOAP Client → SOAP Adapter (3002)', 'yellow');
            log('   ↓', 'yellow');
            log('   RabbitMQ (cms_exchange → order.submit)', 'yellow');
            log('   ↓', 'yellow');
            log('   CMS Worker', 'yellow');
            log('   ↓', 'yellow');
            log('   Mock CMS SOAP (4000)', 'yellow');
            log('   ↓', 'yellow');
            log('   Response back through RabbitMQ', 'yellow');

            return true;
        } else {
            log('\n❌ SOAP Flow FAILED:', 'red');
            log(`   Message: ${result.message}`, 'red');
            return false;
        }

    } catch (error) {
        log('\n❌ SOAP Test Error:', 'red');
        log(`   ${error.message}`, 'red');
        log('   Make sure SOAP Adapter (3002) and CMS Worker are running!', 'yellow');
        return false;
    }
}

/**
 * Test TCP Adapter → WMS Worker → Mock WMS
 */
async function testTCP() {
    log('\n╔════════════════════════════════════════════════════════╗', 'bright');
    log('║  TEST 3: TCP Protocol (Warehouse Management)          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'bright');

    return new Promise((resolve) => {
        try {
            log('\n📤 Connecting to TCP Adapter (port 3003)...', 'blue');

            const socket = new net.Socket();
            let buffer = Buffer.alloc(0);
            let expectedLength = null;

            socket.connect(3003, 'localhost', () => {
                log('✅ TCP Connection established', 'green');
                log('\n📤 Sending CREATE_PACKAGE request...', 'blue');

                // Prepare message
                const message = {
                    action: 'CREATE_PACKAGE',
                    data: {
                        packageId: 'PKG-TCP-001',
                        items: [
                            { sku: 'ITEM-001', quantity: 2 },
                            { sku: 'ITEM-002', quantity: 3 }
                        ],
                        destination: 'Warehouse B, Zone A1',
                        address: '123 TCP Street'
                    }
                };

                const jsonString = JSON.stringify(message);
                const messageBuffer = Buffer.from(jsonString, 'utf8');
                const lengthBuffer = Buffer.alloc(4);
                lengthBuffer.writeUInt32BE(messageBuffer.length, 0);

                // Send length-prefixed message
                socket.write(lengthBuffer);
                socket.write(messageBuffer);

                log(`   Sent ${messageBuffer.length} bytes`, 'blue');
            });

            socket.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);

                while (buffer.length > 0) {
                    if (expectedLength === null) {
                        if (buffer.length >= 4) {
                            expectedLength = buffer.readUInt32BE(0);
                            buffer = buffer.subarray(4);
                        } else {
                            break;
                        }
                    }

                    if (expectedLength !== null) {
                        if (buffer.length >= expectedLength) {
                            const responseBuffer = buffer.subarray(0, expectedLength);
                            buffer = buffer.subarray(expectedLength);

                            const responseString = responseBuffer.toString('utf8');

                            log(`  📥 Raw Response: ${responseString}`, 'blue');

                            try {
                                const response = JSON.parse(responseString);

                                log(`  📋 Parsed Response:`, 'blue');
                                log(`     ${JSON.stringify(response, null, 2)}`, 'blue');

                                socket.end();

                                // Check for both 'status': 'SUCCESS' and 'success': true
                                if (response.status === 'SUCCESS' || response.success) {
                                    log('\n✅ TCP Flow SUCCESSFUL!', 'green');
                                    log(`   Status: ${response.status}`, 'green');
                                    log(`   Package ID: ${response.packageId}`, 'green');
                                    log(`   Zone: ${response.zone}`, 'green');
                                    log(`   Pick Time: ${response.estimatedPickTime}`, 'green');

                                    log('\n📊 Flow:', 'yellow');
                                    log('   TCP Client → TCP Adapter (3003)', 'yellow');
                                    log('   ↓', 'yellow');
                                    log('   RabbitMQ (wms_exchange → package.create)', 'yellow');
                                    log('   ↓', 'yellow');
                                    log('   WMS Worker', 'yellow');
                                    log('   ↓', 'yellow');
                                    log('   Mock WMS TCP (4001)', 'yellow');
                                    log('   ↓', 'yellow');
                                    log('   Response back through RabbitMQ', 'yellow');

                                    resolve(true);
                                } else {
                                    log('\n❌ TCP Flow FAILED:', 'red');
                                    log(`   Error: ${response.error}`, 'red');
                                    resolve(false);
                                }

                                return;
                            } catch (parseError) {
                                log('\\n❌ TCP Response Parse Error:', 'red');
                                log(`   ${parseError.message}`, 'red');
                                socket.end();
                                resolve(false);
                                return;
                            }
                        } else {
                            break;
                        }
                    }
                }
            });

            socket.on('error', (err) => {
                log('\n❌ TCP Test Error:', 'red');
                log(`   ${err.message}`, 'red');
                log('   Make sure TCP Adapter (3003) and WMS Worker are running!', 'yellow');
                socket.end();
                resolve(false);
            });

            socket.setTimeout(10000);
            socket.on('timeout', () => {
                log('\n❌ TCP Connection Timeout', 'red');
                socket.end();
                resolve(false);
            });

        } catch (error) {
            log('\n❌ TCP Test Error:', 'red');
            log(`   ${error.message}`, 'red');
            resolve(false);
        }
    });
}

/**
 * Main Test Suite
 */
async function runAllTests() {
    console.clear();

    log('╔════════════════════════════════════════════════════════╗', 'bright');
    log('║                                                        ║', 'bright');
    log('║     🧪 COMPLETE MIDDLEWARE TEST SUITE 🧪              ║', 'bright');
    log('║                                                        ║', 'bright');
    log('╚════════════════════════════════════════════════════════╝', 'bright');

    log('\n📋 Testing all 3 protocol integrations:', 'cyan');
    log('  1. REST  → RabbitMQ → ROS Worker → Mock ROS', 'cyan');
    log('  2. SOAP  → RabbitMQ → CMS Worker → Mock CMS', 'cyan');
    log('  3. TCP   → RabbitMQ → WMS Worker → Mock WMS', 'cyan');

    await sleep(2000);

    const results = {
        rest: false,
        soap: false,
        tcp: false
    };

    // Test REST
    results.rest = await testREST();
    await sleep(1000);

    // Test SOAP
    results.soap = await testSOAP();
    await sleep(1000);

    // Test TCP
    results.tcp = await testTCP();
    await sleep(1000);

    // Summary
    log('\n╔════════════════════════════════════════════════════════╗', 'bright');
    log('║                   📊 TEST SUMMARY                      ║', 'bright');
    log('╚════════════════════════════════════════════════════════╝', 'bright');

    const restIcon = results.rest ? '✅' : '❌';
    const soapIcon = results.soap ? '✅' : '❌';
    const tcpIcon = results.tcp ? '✅' : '❌';

    log(`\n${restIcon} REST Protocol:  ${results.rest ? 'PASSED' : 'FAILED'}`, results.rest ? 'green' : 'red');
    log(`${soapIcon} SOAP Protocol:  ${results.soap ? 'PASSED' : 'FAILED'}`, results.soap ? 'green' : 'red');
    log(`${tcpIcon} TCP Protocol:   ${results.tcp ? 'PASSED' : 'FAILED'}`, results.tcp ? 'green' : 'red');

    const total = Object.values(results).filter(r => r).length;
    const percentage = Math.round((total / 3) * 100);

    log(`\n📊 Overall: ${total}/3 protocols working (${percentage}%)`, 'cyan');

    if (total === 3) {
        log('\n🎉🎉🎉 ALL PROTOCOLS WORKING! 🎉🎉🎉', 'green');
        log('\n🏆 Your complete middleware architecture is operational!', 'green');
        log('   • 3 Protocol Adapters ✅', 'green');
        log('   • 3 Workers ✅', 'green');
        log('   • 3 Mock Services ✅', 'green');
        log('   • RabbitMQ Message Broker ✅', 'green');
        log('\n💡 Next Steps:', 'cyan');
        log('   • Check RabbitMQ dashboard for message stats', 'cyan');
        log('   • Try load testing with multiple requests', 'cyan');
        log('   • Start multiple workers to see load balancing', 'cyan');
        log('   • Commit your Phase 2 completion! 🚀', 'cyan');
    } else {
        log('\n⚠️  Some protocols need attention', 'yellow');
        log('\n💡 Troubleshooting:', 'cyan');
        if (!results.rest) {
            log('   REST: Check REST Adapter (3001) and ROS Worker', 'yellow');
        }
        if (!results.soap) {
            log('   SOAP: Check SOAP Adapter (3002), CMS Worker, and Mock CMS (4000)', 'yellow');
        }
        if (!results.tcp) {
            log('   TCP: Check TCP Adapter (3003), WMS Worker, and Mock WMS (4001)', 'yellow');
        }
    }

    log('\n');
}

// Run tests
runAllTests().catch(console.error);
