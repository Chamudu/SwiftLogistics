/**
 * Test Script for Mock ROS
 * 
 * This script tests all the endpoints of our Mock ROS service.
 * Run this in a SEPARATE terminal while the server is running.
 */

console.log('🧪 Testing Mock ROS Service...\n');

const BASE_URL = 'http://localhost:4002';

// Helper function to make HTTP requests
async function testEndpoint(method, url, body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);
        const data = await response.json();

        console.log(`✅ ${method} ${url}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        console.log('');

        return data;
    } catch (error) {
        console.log(`❌ ${method} ${url}`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        return null;
    }
}

// Run all tests
async function runTests() {
    console.log('═══════════════════════════════════════════════════');
    console.log('Test 1: Health Check');
    console.log('═══════════════════════════════════════════════════\n');

    await testEndpoint('GET', `${BASE_URL}/health`);

    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay

    console.log('═══════════════════════════════════════════════════');
    console.log('Test 2: Optimize Route (Create Order)');
    console.log('═══════════════════════════════════════════════════\n');

    const route1 = await testEndpoint('POST', `${BASE_URL}/api/routes/optimize`, {
        packageId: 'PKG-001',
        address: '123 Galle Road, Colombo 03',
        priority: 'normal',
        deliveryWindow: new Date(Date.now() + 3600000).toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('═══════════════════════════════════════════════════');
    console.log('Test 3: Optimize Another Route (High Priority)');
    console.log('═══════════════════════════════════════════════════\n');

    const route2 = await testEndpoint('POST', `${BASE_URL}/api/routes/optimize`, {
        packageId: 'PKG-002',
        address: '456 Kandy Road, Peradeniya',
        priority: 'high',
        deliveryWindow: new Date(Date.now() + 7200000).toISOString()
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    if (route1 && route1.routeId) {
        console.log('═══════════════════════════════════════════════════');
        console.log('Test 4: Get Specific Route Details');
        console.log('═══════════════════════════════════════════════════\n');

        await testEndpoint('GET', `${BASE_URL}/api/routes/${route1.routeId}`);

        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('═══════════════════════════════════════════════════');
        console.log('Test 5: Update Route (Change Priority)');
        console.log('═══════════════════════════════════════════════════\n');

        await testEndpoint('PUT', `${BASE_URL}/api/routes/${route1.routeId}`, {
            priority: 'urgent',
            notes: 'Customer requested expedited delivery'
        });

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('Test 6: Get All Routes');
    console.log('═══════════════════════════════════════════════════\n');

    await testEndpoint('GET', `${BASE_URL}/api/routes`);

    await new Promise(resolve => setTimeout(resolve, 500));

    if (route1 && route1.driverId) {
        console.log('═══════════════════════════════════════════════════');
        console.log(`Test 7: Get Driver's Routes (${route1.driverId})`);
        console.log('═══════════════════════════════════════════════════\n');

        await testEndpoint('GET', `${BASE_URL}/api/drivers/${route1.driverId}/routes`);
    }

    console.log('\n🎉 All tests completed!\n');
}

// Run the tests
runTests().catch(error => {
    console.error('Test suite failed:', error);
});
