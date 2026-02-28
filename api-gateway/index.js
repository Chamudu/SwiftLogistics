/**
 * SwiftLogistics API Gateway
 * 
 * PHASE 3 - Monitoring, Security & Auth
 * - Structured Logging (Winston)
 * - Performance Metrics (Latency)
 * - Request Tracing
 * - 🆕 JWT Authentication (replaces API-key-only auth)
 * - 🆕 Auth Service proxy (/auth/* → :4005)
 */

import express from 'express';
import cors from 'cors';
import { resilientFetch, resilientExecute } from './resilience.js'; // Phase 3.4
import logger from './logger.js'; // Phase 3.2

const app = express();
const PORT = 5000;

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization']
}));
app.use(express.json());
app.use(express.text({ type: 'text/xml' }));
app.use(express.raw({ type: 'application/xml' }));

// Backend service URLs
const SERVICES = {
    REST_ADAPTER: 'http://localhost:3001',
    SOAP_ADAPTER: 'http://localhost:3002',
    TCP_ADAPTER: 'http://localhost:3003',
    ORDER_SERVICE: 'http://localhost:4004',
    AUTH_SERVICE: 'http://localhost:4005'   // 🆕 JWT Auth Service
};

// ==========================================
// 📊 METRICS STORE
// ==========================================

let metrics = {
    startTime: Date.now(),
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    protocols: {
        rest: { count: 0, totalLatency: 0 },
        order: { count: 0, totalLatency: 0 },
        soap: { count: 0, totalLatency: 0 },
        tcp: { count: 0, totalLatency: 0 },
        auth: { count: 0, totalLatency: 0 }  // 🆕
    },
    recentLogs: [] // Store last 50 logs for dashboard
};

// Helper to add log for dashboard
function pushLog(entry) {
    metrics.recentLogs.unshift(entry);
    if (metrics.recentLogs.length > 50) metrics.recentLogs.pop();
}

// Helper to track metrics
function trackRequest(protocol, duration, success, path) {
    metrics.totalRequests++;
    if (success) metrics.successCount++;
    else metrics.errorCount++;

    if (metrics.protocols[protocol]) {
        metrics.protocols[protocol].count++;
        metrics.protocols[protocol].totalLatency += duration;
    } else {
        // Fallback for new protocols
        metrics.protocols[protocol] = { count: 1, totalLatency: duration };
    }
}

/**
 * Request Logger Middleware
 */
app.use((req, res, next) => {
    const start = Date.now();

    // Log response on finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        };

        // Don't log metrics endpoint to avoid noise
        if (req.path !== '/metrics' && req.path !== '/health') {
            logger.info('Request processed', logEntry);
            pushLog(logEntry);
        }
    });

    next();
});

// ==========================================
// 🛡️ SECURITY MIDDLEWARE (Phase 3.3 + JWT Upgrade)
// ==========================================

import rateLimit from 'express-rate-limit';

// 1. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate Limit Exceeded', { ip: req.ip });
        res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: 'You have exceeded the 100 requests in 15 mins limit!'
        });
    }
});

app.use(limiter);

// 2. 🆕 DUAL AUTHENTICATION: JWT Tokens + API Keys
//
// WHY DUAL AUTH?
// ==============
// - Frontend (React app) → uses JWT Bearer tokens (from Auth Service)
// - Internal services (order-service, workers) → still use API keys
// - This keeps backward compatibility while enabling real user auth
//
// FLOW:
// 1. Check if route is public (skip auth)       → next()
// 2. Check for "Authorization: Bearer <jwt>"    → verify with Auth Service
// 3. Check for "x-api-key" header               → check against allowed keys
// 4. Neither found                              → 401 Unauthorized

// API Keys still needed for internal service-to-service communication
const VALID_API_KEYS = new Set([
    'swift-123-secret',  // Order Service
    'logistic-999-key',  // Internal Service B
    'test-key-001'       // Test Suite
]);

// Routes that DON'T require authentication
const PUBLIC_PATHS = [
    '/health',
    '/metrics',
    '/auth/login',
    '/auth/register',
    '/auth/refresh'
];

const authenticate = async (req, res, next) => {
    // ── STEP 1: Skip auth for public routes ──
    if (PUBLIC_PATHS.some(p => req.path === p || req.path.startsWith(p + '/'))) {
        return next();
    }

    // Also skip auth for the root info endpoint
    if (req.path === '/') return next();

    // ── STEP 2: Try JWT Bearer token ──
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            // Ask the Auth Service to verify the token
            const verifyResponse = await fetch(`${SERVICES.AUTH_SERVICE}/auth/verify`, {
                headers: { 'Authorization': authHeader }
            });

            if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                // Attach user info to request (available in route handlers)
                req.user = verifyData.user;
                req.authMethod = 'jwt';
                return next();
            }

            // Token invalid or expired
            const errorData = await verifyResponse.json().catch(() => ({}));
            logger.warn('JWT verification failed', { ip: req.ip, path: req.path, error: errorData.error });
            return res.status(401).json({
                success: false,
                error: errorData.error || 'Invalid token',
                message: errorData.message || 'Your authentication token is invalid or expired',
                code: errorData.code || 'TOKEN_INVALID'
            });
        } catch (error) {
            // Auth service might be down — log but don't crash
            logger.error('Auth Service unreachable during JWT verify', { error: error.message });
            // Fall through to API key check as backup
        }
    }

    // ── STEP 3: Try API Key (backward compatibility for internal services) ──
    const apiKey = req.get('x-api-key');
    if (apiKey && VALID_API_KEYS.has(apiKey)) {
        req.authMethod = 'api-key';
        return next();
    }

    // ── STEP 4: No valid auth found ──
    if (apiKey) {
        logger.warn('Invalid API Key', { ip: req.ip, path: req.path });
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Invalid API Key'
        });
    }

    logger.warn('No authentication provided', { ip: req.ip, path: req.path });
    return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Please provide a Bearer token or x-api-key header'
    });
};

app.use(authenticate);

// ==========================================
// 🩺 SYSTEM ENDPOINTS
// ==========================================

/**
 * Health Check
 */
app.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
        services: {
            restAdapter: 'unknown',
            soapAdapter: 'unknown',
            tcpAdapter: 'unknown',
            orderService: 'unknown',
            authService: 'unknown'  // 🆕
        }
    };

    // Check REST Adapter
    try {
        const restResponse = await fetch(`${SERVICES.REST_ADAPTER}/health`, { timeout: 1000 });
        health.services.restAdapter = restResponse.ok ? 'healthy' : 'degraded';
    } catch (e) { health.services.restAdapter = 'down'; }

    // Check SOAP Adapter
    try {
        const soapResponse = await fetch(`${SERVICES.SOAP_ADAPTER}/soap?wsdl`, { timeout: 1000 });
        health.services.soapAdapter = soapResponse.ok ? 'healthy' : 'degraded';
    } catch (e) { health.services.soapAdapter = 'down'; }

    // Check Order Service
    try {
        // Simple ping using GET so we don't accidentally create an order
        await fetch(`${SERVICES.ORDER_SERVICE}/orders`, {
            method: 'GET', headers: { 'Content-Type': 'application/json' }, timeout: 1000
        });
        health.services.orderService = 'healthy';
    } catch (e) {
        // 404/400/500 is fine, connection refused is not
        if (e.code === 'ECONNREFUSED' || e.cause?.code === 'ECONNREFUSED') health.services.orderService = 'down';
        else health.services.orderService = 'healthy';
    }

    health.services.tcpAdapter = 'assumed-healthy'; // TCP check requires net socket

    // 🆕 Check Auth Service
    try {
        const authResponse = await fetch(`${SERVICES.AUTH_SERVICE}/health`, { timeout: 1000 });
        health.services.authService = authResponse.ok ? 'healthy' : 'degraded';
    } catch (e) { health.services.authService = 'down'; }

    // Determine overall status
    if (Object.values(health.services).includes('down')) health.status = 'unhealthy';
    else if (Object.values(health.services).includes('degraded')) health.status = 'degraded';

    res.json(health);
});

/**
 * Metrics Dashboard Endpoint
 */
app.get('/metrics', (req, res) => {
    const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);

    const calculateAvg = (p) =>
        p && p.count > 0 ? Math.round(p.totalLatency / p.count) : 0;

    const snapshot = {
        uptime,
        summary: {
            total: metrics.totalRequests,
            success: metrics.successCount,
            errors: metrics.errorCount,
            rate: metrics.totalRequests ? Math.round((metrics.successCount / metrics.totalRequests) * 100) : 100
        },
        latency: {
            rest: calculateAvg(metrics.protocols.rest),
            soap: calculateAvg(metrics.protocols.soap),
            tcp: calculateAvg(metrics.protocols.tcp),
            order: calculateAvg(metrics.protocols.order)
        },
        counts: {
            rest: metrics.protocols.rest.count,
            soap: metrics.protocols.soap.count,
            tcp: metrics.protocols.tcp.count,
            order: metrics.protocols.order ? metrics.protocols.order.count : 0,
            auth: metrics.protocols.auth ? metrics.protocols.auth.count : 0   // 🆕
        },
        logs: metrics.recentLogs
    };

    res.json(snapshot);
});

// ==========================================
// 🔁 ROUTING LOGIC
// ==========================================

// Helper for error handling
const handleError = (res, protocol, error) => {
    logger.error(`${protocol} Adapter Error`, { error: error.message });
    res.status(502).json({
        success: false,
        error: `${protocol} Gateway Error`,
        message: error.message
    });
};

// --- 🆕 AUTH SERVICE ROUTES ---
// Proxy all /auth/* requests to the Auth Service
// This lets the frontend talk to one URL (gateway:5000)
// instead of knowing about the auth service directly.

app.all('/auth/*', async (req, res) => {
    const start = Date.now();
    try {
        const url = `${SERVICES.AUTH_SERVICE}${req.originalUrl}`;

        const fetchOptions = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Forward the Authorization header if present
        if (req.get('Authorization')) {
            fetchOptions.headers['Authorization'] = req.get('Authorization');
        }

        // Forward request body for POST/PUT
        if (['POST', 'PUT'].includes(req.method) && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        trackRequest('auth', Date.now() - start, response.ok, req.path);
        res.status(response.status).json(data);

    } catch (error) {
        trackRequest('auth', Date.now() - start, false, req.path);
        handleError(res, 'AUTH', error);
    }
});

// --- REST ROUTES ---

app.all('/api/routes*', async (req, res) => {
    const start = Date.now();
    try {
        const url = `${SERVICES.REST_ADAPTER}${req.originalUrl}`;
        // Use Resilient Fetch (Circuit Breaker + Retry)
        const response = await resilientFetch('rest', url, {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
            body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();

        trackRequest('rest', Date.now() - start, response.ok, req.path);
        res.status(response.status).json(data);

    } catch (error) {
        trackRequest('rest', Date.now() - start, false, req.path);
        handleError(res, 'REST', error);
    }
});

// --- SOAP ROUTES ---

// 🆕 Modern JSON-to-SOAP Adapter Route
app.post('/soap/submit-order', async (req, res) => {
    const start = Date.now();
    try {
        const url = `${SERVICES.SOAP_ADAPTER}/submit-order`;

        // Resilience Wrapper
        const response = await resilientFetch('soap', url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        trackRequest('soap', Date.now() - start, response.ok, req.path);
        res.status(response.status).json(data);

    } catch (error) {
        trackRequest('soap', Date.now() - start, false, req.path);
        handleError(res, 'SOAP', error);
    }
});

app.post('/soap', async (req, res) => {
    const start = Date.now();
    try {
        // Phase 3.4: Resilience Wrapper
        const response = await resilientFetch('soap', `${SERVICES.SOAP_ADAPTER}/soap`, {
            method: 'POST',
            headers: {
                'Content-Type': req.get('content-type') || 'text/xml',
                'SOAPAction': req.get('SOAPAction') || ''
            },
            body: req.body
        });

        const data = await response.text();

        trackRequest('soap', Date.now() - start, response.ok, req.path);
        res.set('Content-Type', 'text/xml');
        res.status(response.status).send(data);

    } catch (error) {
        trackRequest('soap', Date.now() - start, false, req.path);
        logger.error('SOAP Adapter Error', { error: error.message });
        res.status(502).send(`<soap:Fault><faultstring>${error.message}</faultstring></soap:Fault>`);
    }
});

app.get('/soap/wsdl', async (req, res) => {
    try {
        const response = await fetch(`${SERVICES.SOAP_ADAPTER}/soap?wsdl`);
        const wsdl = await response.text();
        const modifiedWsdl = wsdl.replace('http://localhost:3002', `http://localhost:${PORT}`);
        res.set('Content-Type', 'text/xml');
        res.send(modifiedWsdl);
    } catch (error) {
        res.status(502).send('WSDL Unavailable');
    }
});

// --- TCP WRAPPER ROUTES (WMS) ---

// We need a small helper to talk to TCP socket
import net from 'net';

function callTCP(message) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.connect(3003, 'localhost'); // Connect to TCP Adapter

        const payload = JSON.stringify(message);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(Buffer.byteLength(payload));

        socket.write(len);
        socket.write(Buffer.from(payload));

        let buffer = Buffer.alloc(0);
        let expectedLength = null;

        socket.on('data', (chunk) => {
            // Properly buffer the incoming chunks (TCP is a stream!)
            buffer = Buffer.concat([buffer, chunk]);

            if (expectedLength === null && buffer.length >= 4) {
                expectedLength = buffer.readUInt32BE(0);
                buffer = buffer.subarray(4);
            }

            if (expectedLength !== null && buffer.length >= expectedLength) {
                const body = buffer.subarray(0, expectedLength).toString('utf8');
                try {
                    resolve(JSON.parse(body));
                    socket.end();
                } catch (e) {
                    reject(e);
                    socket.end();
                }
            }
        });

        socket.on('error', (err) => {
            reject(err);
        });

        socket.setTimeout(2000, () => {
            reject(new Error('Timeout'));
            socket.end();
        });
    });
}

app.all('/api/warehouse*', async (req, res) => {
    const start = Date.now();
    let action = 'UNKNOWN';
    let payload = {};

    // Map REST URL to TCP Action
    if (req.path.includes('/packages') && req.method === 'POST') {
        action = 'CREATE_PACKAGE';
        payload = req.body;
    } else if (req.path.includes('/packages') && req.method === 'GET') {
        action = 'GET_PACKAGE_STATUS';
        // Extract ID from URL path
        const parts = req.path.split('/');
        payload = { packageId: parts[parts.length - 1] };
    } else if (req.path.includes('/inventory')) {
        action = 'GET_INVENTORY';
    }

    try {
        // Phase 3.4: Resilience Wrapper
        const result = await resilientExecute('tcp', () => callTCP({ action, data: payload }));
        const success = result && (result.success || result.status === 'SUCCESS');

        trackRequest('tcp', Date.now() - start, success, req.path);
        res.json(result);

    } catch (error) {
        trackRequest('tcp', Date.now() - start, false, req.path);
        handleError(res, 'TCP', error);
    }
});

// --- ORDER SERVICE ROUTES ---

app.get('/orders', async (req, res) => {
    const start = Date.now();
    try {
        const url = `${SERVICES.ORDER_SERVICE}/orders`;
        const response = await resilientFetch('order', url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        trackRequest('order', Date.now() - start, response.ok, req.path);
        res.status(response.status).json(data);

    } catch (error) {
        trackRequest('order', Date.now() - start, false, req.path);
        handleError(res, 'ORDER', error);
    }
});

app.post('/orders', async (req, res) => {
    const start = Date.now();
    try {
        const url = `${SERVICES.ORDER_SERVICE}/orders`;

        // Resilience Wrapper
        const response = await resilientFetch('order', url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Forward API Key to Order Service (it expects one too!)
                'x-api-key': req.get('x-api-key')
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        trackRequest('order', Date.now() - start, response.ok, req.path);
        res.status(response.status).json(data);

    } catch (error) {
        trackRequest('order', Date.now() - start, false, req.path);
        handleError(res, 'ORDER', error);
    }
});

// --- 404 HANDLER ---
app.use('*', (req, res) => {
    logger.warn('404 Not Found', { path: req.originalUrl, method: req.method });
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`,
        availableEndpoints: {
            auth: ['POST /auth/login', 'POST /auth/register', 'POST /auth/refresh', 'GET /auth/me', 'POST /auth/logout'],
            orders: ['GET /orders', 'POST /orders'],
            rest: ['POST /api/routes/optimize', 'GET /api/routes/:routeId'],
            soap: ['POST /soap', 'GET /soap/wsdl'],
            warehouse: ['POST /api/warehouse/packages', 'GET /api/warehouse/inventory'],
            system: ['GET /health', 'GET /metrics']
        }
    });
});

// --- BOOTSTRAP ---

app.listen(PORT, () => {
    logger.info('API Gateway started', { port: PORT, env: 'development' });
    console.log(`
╔════════════════════════════════════════════════╗
║   🚀 API GATEWAY - JWT AUTH ENABLED            ║
╠════════════════════════════════════════════════╣
║   🔐 Auth:    /auth/login, /auth/register      ║
║   📊 Metrics: http://localhost:${PORT}/metrics      ║
║   🩺 Health:  http://localhost:${PORT}/health       ║
║   📝 Logs:    gateway.log                      ║
╚════════════════════════════════════════════════╝
    `);
});
