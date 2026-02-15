/**
 * API Gateway Test Suite
 * Tests all routes through the unified gateway
 */

import fetch from 'node-fetch';

const GATEWAY_URL = 'http://localhost:5000';

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealth() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST 1: Health Check                                 ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    try {
        const response = await fetch(`${GATEWAY_URL}/health`);
        const data = await response.json();

        log('\n✅ Health Check Response:', 'green');
        log(JSON.stringify(data, null, 2), 'blue');

        return data.status === 'healthy' || data.status === 'degraded';
    } catch (error) {
        log(`\n❌ Health check failed: ${error.message}`, 'red');
        return false;
    }
}

async function testMetrics() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST 2: Metrics Endpoint                             ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    try {
        const response = await fetch(`${GATEWAY_URL}/metrics`);
        const data = await response.json();

        log('\n✅ Metrics Response:', 'green');
        log(JSON.stringify(data, null, 2), 'blue');

        return true;
    } catch (error) {
        log(`\n❌ Metrics check failed: ${error.message}`, 'red');
        return false;
    }
}

async function testRESTviaGateway() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST 3: REST API via Gateway                         ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    try {
        log('\n📤 Sending route optimization request...', 'blue');

        const response = await fetch(`${GATEWAY_URL}/api/routes/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packageId: 'PKG-GATEWAY-001',
                address: '789 Gateway Boulevard, Colombo',
                priority: 'high'
            })
        });

        const data = await response.json();

        if (data.success) {
            log('\n✅ REST via Gateway SUCCESSFUL!', 'green');
            log(JSON.stringify(data, null, 2), 'blue');
            return true;
        } else {
            log('\n❌ REST via Gateway failed', 'red');
            log(JSON.stringify(data, null, 2), 'red');
            return false;
        }
    } catch (error) {
        log(`\n❌ REST test error: ${error.message}`, 'red');
        return false;
    }
}

async function testWarehouseAPI() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST 4: Warehouse API via Gateway (TCP wrapped)     ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    try {
        log('\n📤 Creating warehouse package...', 'blue');

        const response = await fetch(`${GATEWAY_URL}/api/warehouse/packages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                packageId: 'PKG-GATEWAY-WH-001',
                items: [
                    { sku: 'ITEM-001', quantity: 5 },
                    { sku: 'ITEM-002', quantity: 3 }
                ],
                destination: 'Gateway Warehouse A'
            })
        });

        const data = await response.json();

        if (data.status === 'SUCCESS' || data.success) {
            log('\n✅ Warehouse API via Gateway SUCCESSFUL!', 'green');
            log(JSON.stringify(data, null, 2), 'blue');
            return true;
        } else {
            log('\n❌ Warehouse API failed', 'red');
            log(JSON.stringify(data, null, 2), 'red');
            return false;
        }
    } catch (error) {
        log(`\n❌ Warehouse API test error: ${error.message}`, 'red');
        return false;
    }
}

async function test404Handling() {
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║  TEST 5: 404 Error Handling                          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    try {
        log('\n📤 Requesting non-existent endpoint...', 'blue');

        const response = await fetch(`${GATEWAY_URL}/api/nonexistent`);
        const data = await response.json();

        if (response.status === 404 && data.availableEndpoints) {
            log('\n✅ 404 Handling works correctly!', 'green');
            log('Available endpoints returned:', 'blue');
            log(JSON.stringify(data.availableEndpoints, null, 2), 'blue');
            return true;
        } else {
            log('\n⚠️  404 handling needs improvement', 'yellow');
            return false;
        }
    } catch (error) {
        log(`\n❌ 404 test error: ${error.message}`, 'red');
        return false;
    }
}

async function runAllTests() {
    console.clear();

    log('╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║                                                        ║', 'cyan');
    log('║        🧪 API GATEWAY TEST SUITE 🧪                   ║', 'cyan');
    log('║                                                        ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    log('\n📋 Testing API Gateway functionality:', 'yellow');
    log('  1. Health Check', 'yellow');
    log('  2. Metrics Endpoint', 'yellow');
    log('  3. REST API Routing', 'yellow');
    log('  4. Warehouse API (TCP wrapped in REST)', 'yellow');
    log('  5. Error Handling (404)', 'yellow');

    await sleep(2000);

    const results = {
        health: false,
        metrics: false,
        rest: false,
        warehouse: false,
        errorHandling: false
    };

    results.health = await testHealth();
    await sleep(1000);

    results.metrics = await testMetrics();
    await sleep(1000);

    results.rest = await testRESTviaGateway();
    await sleep(1000);

    results.warehouse = await testWarehouseAPI();
    await sleep(1000);

    results.errorHandling = await test404Handling();
    await sleep(1000);

    // Summary
    log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
    log('║                   📊 TEST SUMMARY                      ║', 'cyan');
    log('╚════════════════════════════════════════════════════════╝', 'cyan');

    log(`\n${results.health ? '✅' : '❌'} Health Check:     ${results.health ? 'PASSED' : 'FAILED'}`, results.health ? 'green' : 'red');
    log(`${results.metrics ? '✅' : '❌'} Metrics:          ${results.metrics ? 'PASSED' : 'FAILED'}`, results.metrics ? 'green' : 'red');
    log(`${results.rest ? '✅' : '❌'} REST Routing:     ${results.rest ? 'PASSED' : 'FAILED'}`, results.rest ? 'green' : 'red');
    log(`${results.warehouse ? '✅' : '❌'} Warehouse API:    ${results.warehouse ? 'PASSED' : 'FAILED'}`, results.warehouse ? 'green' : 'red');
    log(`${results.errorHandling ? '✅' : '❌'} Error Handling:   ${results.errorHandling ? 'PASSED' : 'FAILED'}`, results.errorHandling ? 'green' : 'red');

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    const percentage = Math.round((passed / total) * 100);

    log(`\n📊 Overall: ${passed}/${total} tests passing (${percentage}%)`, 'cyan');

    if (passed === total) {
        log('\n🎉🎉🎉 API GATEWAY FULLY OPERATIONAL! 🎉🎉🎉', 'green');
        log('\n✨ Phase 3 - Part 1: API Gateway ✅ COMPLETE', 'green');
        log('\n🌟 You now have:', 'cyan');
        log('   • Unified entry point for all protocols ✅', 'green');
        log('   • Intelligent request routing ✅', 'green');
        log('   • Health monitoring ✅', 'green');
        log('   • Metrics tracking ✅', 'green');
        log('   • Graceful error handling ✅', 'green');

        log('\n💡 Try accessing:', 'yellow');
        log('   • http://localhost:5000/health', 'cyan');
        log('   • http://localhost:5000/metrics', 'cyan');
        log('   • All your APIs now go through port 5000!', 'cyan');

        log('\n🚀 Next Steps (Phase 3):', 'yellow');
        log('   • Part 2: Monitoring & Observability', 'cyan');
        log('   • Part 3: Security (Auth, Rate Limiting)', 'cyan');
        log('   • Part 4: Resilience (Circuit Breaker, Retry)', 'cyan');
    } else {
        log('\n⚠️  Some tests failed', 'yellow');
        log('\n💡 Troubleshooting:', 'yellow');
        log('   • Make sure API Gateway is running on port 5000', 'cyan');
        log('   • Ensure all 3 adapters are running', 'cyan');
        log('   • Verify all workers are running', 'cyan');
        log('   • Check RabbitMQ is up', 'cyan');
    }

    log('\n');
}

runAllTests().catch(console.error);
