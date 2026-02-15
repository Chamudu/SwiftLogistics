/**
 * SwiftLogistics API Gateway
 * 
 * PHASE 3 - Part 2: Monitoring & Observability
 * - Structured Logging (Winston)
 * - Performance Metrics (Latency)
 * - Request Tracing
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
    ORDER_SERVICE: 'http://localhost:4004' // Configured for Order Service
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
        tcp: { count: 0, totalLatency: 0 }
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
// 🛡️ SECURITY MIDDLEWARE (Phase 3.3)
// ==========================================

import rateLimit from 'express-rate-limit';

// 1. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        logger.warn('Rate Limit Exceeded', { ip: req.ip });
        res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: 'You have exceeded the 100 requests in 15 mins limit!'
        });
    }
});

// Apply rate limiting to all requests
app.use(limiter);

// 2. API Key Authentication
const VALID_API_KEYS = new Set([
    'swift-123-secret',  // Client A
    'logistic-999-key',  // Client B
    'test-key-001'       // Test Suite
]);

const authenticate = (req, res, next) => {
    // Skip auth for System endpoints (Health/Metrics) so dashboard still works
    if (req.path === '/health' || req.path === '/metrics') {
        return next();
    }

    const apiKey = req.get('x-api-key');

    if (!apiKey) {
        logger.warn('Missing API Key', { ip: req.ip, path: req.path });
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'Missing x-api-key header'
        });
    }

    if (!VALID_API_KEYS.has(apiKey)) {
        logger.warn('Invalid API Key', { ip: req.ip, apiKey, path: req.path });
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Invalid API Key'
        });
    }

    next();
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
            orderService: 'unknown'
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
        // Simple ping if Order Service doesn't have explicit health check yet
        // A connection refused would throw, a 404 is fine (means server is up)
        await fetch(`${SERVICES.ORDER_SERVICE}/orders`, {
            method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' }, timeout: 1000
        });
        health.services.orderService = 'healthy';
    } catch (e) {
        // 404/400 is fine, connection refused is not
        if (e.code === 'ECONNREFUSED') health.services.orderService = 'down';
        else health.services.orderService = 'healthy';
    }

    health.services.tcpAdapter = 'assumed-healthy'; // TCP check requires net socket

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
            order: metrics.protocols.order ? metrics.protocols.order.count : 0
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

        socket.on('data', (data) => {
            // Simple parsing: assuming response fits in one chunk for this demo
            const body = data.subarray(4).toString();
            try {
                resolve(JSON.parse(body));
                socket.end();
            } catch (e) { reject(e); }
        });

        socket.on('error', reject);
        socket.setTimeout(2000, () => reject(new Error('Timeout')));
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
            orders: ['POST /orders'], // Added /orders to available endpoints
            rest: ['POST /api/routes/optimize', 'GET /api/routes/:routeId'],
            soap: ['POST /soap', 'GET /soap/wsdl'],
            warehouse: ['POST /api/warehouse/packages', 'GET /api/warehouse/inventory'], // Fixed Typo POSt -> POST
            system: ['GET /health', 'GET /metrics']
        }
    });
});

// --- BOOTSTRAP ---

app.listen(PORT, () => {
    logger.info('API Gateway started', { port: PORT, env: 'development' });
    console.log(`
╔════════════════════════════════════════════════╗
║   🚀 API GATEWAY MONITORING ACTIVATED          ║
╠════════════════════════════════════════════════╣
║   📊 Metrics: http://localhost:${PORT}/metrics      ║
║   🩺 Health:  http://localhost:${PORT}/health       ║
║   📝 Logs:    gateway.log                      ║
╚════════════════════════════════════════════════╝
    `);
});
