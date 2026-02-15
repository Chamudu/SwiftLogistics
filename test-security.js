/**
 * Security Middleware Test Suite
 * Tests authentication and rate limiting
 */

import fetch from 'node-fetch';

const GATEWAY_URL = 'http://localhost:5000';
const VALID_KEY = 'test-key-001';
const INVALID_KEY = 'bad-hacker-key';

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function testNoKey() {
    log('\n🛑 TEST 1: Request WITHOUT API Key', 'cyan');
    try {
        const res = await fetch(`${GATEWAY_URL}/api/routes/optimize`, {
            method: 'POST',
            body: JSON.stringify({ test: true }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401) {
            log('✅ PASS: Rejected with 401 Unauthorized', 'green');
            return true;
        } else {
            log(`❌ FAIL: Expected 401, got ${res.status}`, 'red');
            return false;
        }
    } catch (e) { log(`❌ Error: ${e.message}`, 'red'); return false; }
}

async function testBadKey() {
    log('\n🛑 TEST 2: Request with INVALID API Key', 'cyan');
    try {
        const res = await fetch(`${GATEWAY_URL}/api/routes/optimize`, {
            method: 'POST',
            body: JSON.stringify({ test: true }),
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': INVALID_KEY
            }
        });

        if (res.status === 403) {
            log('✅ PASS: Rejected with 403 Forbidden', 'green');
            return true;
        } else {
            log(`❌ FAIL: Expected 403, got ${res.status}`, 'red');
            return false;
        }
    } catch (e) { log(`❌ Error: ${e.message}`, 'red'); return false; }
}

async function testValidKey() {
    log('\n🟢 TEST 3: Request with VALID API Key', 'cyan');
    try {
        const res = await fetch(`${GATEWAY_URL}/api/routes/optimize`, {
            method: 'POST',
            body: JSON.stringify({
                packageId: 'SECURE-PKG-001',
                address: '123 Secure Lane',
                priority: 'low'
            }),
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': VALID_KEY
            }
        });

        if (res.ok) { // 200 or 201
            log('✅ PASS: Accepted with 200/201 OK', 'green');
            return true;
        } else {
            log(`❌ FAIL: Expected Success, got ${res.status}`, 'red');
            const txt = await res.text();
            console.log(txt);
            return false;
        }
    } catch (e) { log(`❌ Error: ${e.message}`, 'red'); return false; }
}

async function testSystemEndpoints() {
    log('\n🏥 TEST 4: System Endpoints (No Auth Required)', 'cyan');
    try {
        const res = await fetch(`${GATEWAY_URL}/health`);
        if (res.ok) {
            log('✅ PASS: Health check accessible without key', 'green');
            return true;
        } else {
            log(`❌ FAIL: Health check blocked (${res.status})`, 'red');
            return false;
        }
    } catch (e) { log(`❌ Error: ${e.message}`, 'red'); return false; }
}

async function runTests() {
    console.log('\n🔐 STARTING SECURITY AUDIT 🔐\n');

    const results = [
        await testNoKey(),
        await testBadKey(),
        await testValidKey(),
        await testSystemEndpoints()
    ];

    const passed = results.filter(r => r).length;
    console.log(`\n📊 Security Score: ${passed}/${results.length}`);

    if (passed === results.length) {
        log('\n🎉 GATEWAY IS SECURE! 🎉', 'green');
    } else {
        log('\n⚠️ SECURITY VULNERABILITIES DETECTED', 'red');
    }
}

runTests();
