/**
 * 🧪 Auth Service Test Suite
 * 
 * Tests the complete authentication flow:
 * 1. Health check
 * 2. Login with demo user
 * 3. Access protected route with token
 * 4. Try accessing without token (should fail)
 * 5. Try with wrong password (should fail)
 * 6. Register a new user
 * 7. Refresh token
 * 8. Logout and verify token is invalidated
 * 9. Role-based access (admin-only route)
 * 
 * Run: node test-auth.js
 * Requires: Auth service running on port 4005
 */

const AUTH_URL = 'http://localhost:4005';

// Store tokens between tests
let accessToken = null;
let refreshToken = null;
let newUserAccessToken = null;

// Test results
const results = [];

// ── HELPER FUNCTIONS ──

async function makeRequest(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${AUTH_URL}${path}`, options);
    const data = await response.json();

    return { status: response.status, data };
}

function logResult(testName, passed, details = '') {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${testName}${details ? ' — ' + details : ''}`);
    results.push({ test: testName, passed });
}

// ── TEST FUNCTIONS ──

async function testHealthCheck() {
    const { status, data } = await makeRequest('GET', '/health');
    logResult('Health Check', status === 200 && data.status === 'healthy',
        `Status: ${data.status}`);
}

async function testLoginSuccess() {
    const { status, data } = await makeRequest('POST', '/auth/login', {
        email: 'sarah@swiftlogistics.com',
        password: 'password123'
    });

    const passed = status === 200 && data.success && data.tokens?.accessToken;
    if (passed) {
        accessToken = data.tokens.accessToken;
        refreshToken = data.tokens.refreshToken;
    }

    logResult('Login (Admin)', passed,
        passed ? `Token received, User: ${data.user?.name} (${data.user?.role})` : `Failed: ${data.message}`);
}

async function testLoginWrongPassword() {
    const { status, data } = await makeRequest('POST', '/auth/login', {
        email: 'sarah@swiftlogistics.com',
        password: 'wrongpassword'
    });

    logResult('Login Wrong Password (should fail)', status === 401,
        `Got ${status}: ${data.message}`);
}

async function testLoginWrongEmail() {
    const { status, data } = await makeRequest('POST', '/auth/login', {
        email: 'nonexistent@test.com',
        password: 'password123'
    });

    logResult('Login Wrong Email (should fail)', status === 401,
        `Got ${status}: ${data.message}`);
}

async function testProtectedRoute() {
    const { status, data } = await makeRequest('GET', '/auth/me', null, accessToken);
    logResult('Access /auth/me (with token)', status === 200 && data.success,
        `User: ${data.user?.name} (${data.user?.role})`);
}

async function testProtectedWithoutToken() {
    const { status, data } = await makeRequest('GET', '/auth/me');
    logResult('Access /auth/me (NO token — should fail)', status === 401,
        `Got ${status}: ${data.error}`);
}

async function testProtectedWithBadToken() {
    const { status, data } = await makeRequest('GET', '/auth/me', null, 'fake-token-12345');
    logResult('Access /auth/me (FAKE token — should fail)', status === 401,
        `Got ${status}: ${data.error}`);
}

async function testVerifyToken() {
    const { status, data } = await makeRequest('GET', '/auth/verify', null, accessToken);
    logResult('Verify Token', status === 200 && data.valid === true,
        `Valid: ${data.valid}, Role: ${data.user?.role}`);
}

async function testRegisterNewUser() {
    const { status, data } = await makeRequest('POST', '/auth/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpass123',
        role: 'customer'
    });

    const passed = status === 201 && data.success;
    if (passed) {
        newUserAccessToken = data.tokens.accessToken;
    }

    logResult('Register New User', passed,
        passed ? `Created: ${data.user?.name} (${data.user?.role})` : `Failed: ${data.message}`);
}

async function testRegisterDuplicateEmail() {
    const { status, data } = await makeRequest('POST', '/auth/register', {
        name: 'Duplicate User',
        email: 'sarah@swiftlogistics.com',
        password: 'somepassword',
        role: 'customer'
    });

    logResult('Register Duplicate Email (should fail)', status === 409,
        `Got ${status}: ${data.message}`);
}

async function testRefreshToken() {
    const { status, data } = await makeRequest('POST', '/auth/refresh', {
        refreshToken: refreshToken
    });

    const passed = status === 200 && data.success && data.tokens?.accessToken;
    if (passed) {
        accessToken = data.tokens.accessToken;  // Use the new token going forward
    }

    logResult('Refresh Token', passed,
        passed ? 'New access token received' : `Failed: ${data.message}`);
}

async function testAdminOnlyRoute() {
    // Admin token should work
    const { status: adminStatus, data: adminData } =
        await makeRequest('GET', '/auth/users', null, accessToken);

    logResult('Admin Route (admin token)', adminStatus === 200 && adminData.success,
        `Users count: ${adminData.count}`);

    // Customer token should be denied
    if (newUserAccessToken) {
        const { status: custStatus, data: custData } =
            await makeRequest('GET', '/auth/users', null, newUserAccessToken);

        logResult('Admin Route (customer token — should fail)', custStatus === 403,
            `Got ${custStatus}: ${custData.error}`);
    }
}

async function testLogout() {
    const { status, data } = await makeRequest('POST', '/auth/logout', null, accessToken);
    logResult('Logout', status === 200 && data.success, data.message);

    // Try using the old token after logout
    const { status: afterStatus, data: afterData } =
        await makeRequest('GET', '/auth/me', null, accessToken);

    logResult('Access After Logout (should fail)', afterStatus === 401,
        `Got ${afterStatus}: ${afterData.error}`);
}

// ── RUN ALL TESTS ──

async function runTests() {
    console.log(`
╔════════════════════════════════════════════════════════╗
║     🧪 AUTH SERVICE TEST SUITE                         ║
╚════════════════════════════════════════════════════════╝
`);

    try {
        await testHealthCheck();
        console.log('');

        console.log('── LOGIN TESTS ──');
        await testLoginSuccess();
        await testLoginWrongPassword();
        await testLoginWrongEmail();
        console.log('');

        console.log('── PROTECTED ROUTE TESTS ──');
        await testProtectedRoute();
        await testProtectedWithoutToken();
        await testProtectedWithBadToken();
        await testVerifyToken();
        console.log('');

        console.log('── REGISTRATION TESTS ──');
        await testRegisterNewUser();
        await testRegisterDuplicateEmail();
        console.log('');

        console.log('── TOKEN MANAGEMENT TESTS ──');
        await testRefreshToken();
        await testAdminOnlyRoute();
        await testLogout();

    } catch (error) {
        console.error(`\n❌ Test runner error: ${error.message}`);
        console.error('   Make sure the Auth Service is running on port 4005');
    }

    // ── SUMMARY ──
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    console.log(`
╔════════════════════════════════════════════════════════╗
║     📊 TEST RESULTS                                    ║
╠════════════════════════════════════════════════════════╣
║     Total:   ${total.toString().padEnd(4)}                                   ║
║     Passed:  ${passed.toString().padEnd(4)} ✅                                ║
║     Failed:  ${(total - passed).toString().padEnd(4)} ${total - passed === 0 ? '🎉' : '❌'}                                ║
╚════════════════════════════════════════════════════════╝
    `);

    if (passed === total) {
        console.log('🎉🎉🎉 ALL AUTH TESTS PASSED! 🎉🎉🎉\n');
    } else {
        console.log(`⚠️  ${total - passed} test(s) failed. Check output above.\n`);
    }
}

runTests();
