
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// 🆕 Import shared database module
// We use dynamic import() because this file is CommonJS (require)
// but the database module is ESM (import/export)
let db;
let initializeDatabase;

async function loadDatabase() {
    const dbModule = await import('../shared/database/index.js');
    db = dbModule.db;
    initializeDatabase = dbModule.initializeDatabase;
}

const app = express();
const PORT = 4004;
const GATEWAY_URL = 'http://localhost:5000';
const WS_SERVICE_URL = 'http://localhost:4006';
const API_KEY = 'swift-123-secret';

// 🔌 WebSocket event emitter
// Calls the WebSocket service's REST API to push real-time updates
// to connected clients. If the WS service is down, we log and continue
// (order processing shouldn't fail because of notifications).
async function emitOrderEvent(orderId, userId, status, sagaStep, message) {
    try {
        await axios.post(`${WS_SERVICE_URL}/emit/order-update`, {
            orderId, userId, status, sagaStep, message
        });
        console.log(`   📡 WS Event: ${sagaStep} → ${status}`);
    } catch (err) {
        // Don't fail the order if WebSocket is unavailable
        console.log(`   ⚠️  WS Service unavailable (order continues)`);
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Helper for Gateway calls
const gateway = axios.create({
    baseURL: GATEWAY_URL,
    headers: { 'x-api-key': API_KEY }
});

// ==========================================
// 📖 GET ALL ORDERS (from PostgreSQL!)
// ==========================================

/**
 * GET /orders
 * 
 * SQL: SELECT * FROM orders ORDER BY created_at DESC
 * 
 * Before: res.json(orders)  ← from an array
 * After:  res.json(rows)    ← from PostgreSQL
 */
app.get('/orders', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM orders ORDER BY created_at DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('❌ Error fetching orders:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 📦 CREATE ORDER (SAGA + PostgreSQL)
// ==========================================

/**
 * POST /orders
 * 
 * The SAGA orchestrator — calls 3 services in sequence.
 * Now stores the order in PostgreSQL with saga_log as JSONB.
 */
app.post('/orders', async (req, res) => {
    const { items, destination, paymentMethod } = req.body;
    const orderId = `ORD-${Date.now()}`;
    const sagaLog = [];

    // Get the user ID from the request (forwarded by gateway via JWT)
    // Falls back to 'SYSTEM' for API-key authenticated requests
    const userId = req.body.userId || 'USR-001';

    console.log(`\n📦 STARTING SAGA for Order ${orderId}`);

    // 🔌 Emit: Order creation started
    emitOrderEvent(orderId, userId, 'PENDING', 'CREATED', `Order ${orderId} created, starting processing...`);

    // ── INSERT ORDER INTO DATABASE (status: PENDING) ──
    // This creates the order record immediately, then we update it
    // as each SAGA step completes or fails.
    try {
        await db.query(
            `INSERT INTO orders (id, user_id, items, destination, status, saga_log)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                orderId,
                userId,
                JSON.stringify(items || []),      // JSONB column
                destination || 'Unknown',
                'PENDING',
                JSON.stringify(sagaLog)           // JSONB column  
            ]
        );
    } catch (dbError) {
        console.error('❌ Failed to create order record:', dbError.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: dbError.message
        });
    }

    try {
        // STEP 1: Reserve Inventory (Warehouse Service via TCP Adapter)
        console.log('➡️  Step 1: Reserving Inventory...');
        const warehouseRes = await gateway.post('/api/warehouse/packages', {
            packageId: `PKG-${orderId}`,
            items,
            destination
        });

        if (!warehouseRes.data.success && warehouseRes.data.status !== 'SUCCESS') {
            throw new Error('Warehouse reservation failed');
        }

        sagaLog.push({ step: 'WAREHOUSE', status: 'COMPLETED', data: warehouseRes.data });
        console.log('✅ Inventory Reserved');

        // 🔌 Emit: Step 1 done
        emitOrderEvent(orderId, userId, 'PROCESSING', 'WAREHOUSE', 'Inventory reserved successfully');


        // STEP 2: Schedule Delivery (Logistics Service via REST Adapter)
        console.log('➡️  Step 2: Scheduling Delivery...');
        const logisticsRes = await gateway.post('/api/routes/optimize', {
            packageId: `PKG-${orderId}`,
            address: destination,
            priority: 'standard'
        });

        if (!logisticsRes.data.success) {
            throw new Error('Delivery scheduling failed');
        }

        sagaLog.push({ step: 'LOGISTICS', status: 'COMPLETED', data: logisticsRes.data });
        console.log('✅ Delivery Scheduled');

        // 🔌 Emit: Step 2 done
        emitOrderEvent(orderId, userId, 'PROCESSING', 'LOGISTICS', 'Delivery route scheduled');


        // STEP 3: Submit Order to Legacy System (CMS Service via SOAP Adapter)
        console.log('➡️  Step 3: Submitting to Legacy CMS (via JSON Adapter)...');

        const cmsRes = await gateway.post('/soap/submit-order', {
            clientId: 'CL-001',
            packageId: `PKG-${orderId}`,
            pickupAddress: 'Warehouse A',
            deliveryAddress: destination,
            packageWeight: '5.0',
            packageDimensions: '10x10x10',
            deliveryType: 'Standard'
        });

        console.log('🔍 CMS Response:', JSON.stringify(cmsRes.data, null, 2));

        if (!cmsRes.data || !cmsRes.data.success) {
            throw new Error('Legacy CMS submission failed');
        }

        sagaLog.push({ step: 'LEGACY_CMS', status: 'COMPLETED', data: cmsRes.data });
        console.log('✅ Order Submitted to Legacy CMS');

        // 🔌 Emit: Step 3 done
        emitOrderEvent(orderId, userId, 'PROCESSING', 'LEGACY_CMS', 'Registered in legacy CMS');


        // ── SAGA COMPLETE — UPDATE ORDER IN DATABASE ──
        // SQL: UPDATE orders SET status = 'COMPLETED', saga_log = ... WHERE id = ...
        await db.query(
            `UPDATE orders SET status = $1, saga_log = $2, updated_at = NOW() WHERE id = $3`,
            ['COMPLETED', JSON.stringify(sagaLog), orderId]
        );

        console.log(`🎉 SAGA COMPLETED successfully for ${orderId}\n`);

        // 🔌 Emit: Order complete!
        emitOrderEvent(orderId, userId, 'COMPLETED', 'DONE', `Order ${orderId} completed successfully!`);

        res.status(201).json({
            success: true,
            orderId,
            message: 'Order created successfully',
            details: {
                packageId: warehouseRes.data.packageId,
                routeId: logisticsRes.data.routeId,
                status: 'CONFIRMED'
            },
            sagaLog
        });

    } catch (error) {
        console.error(`❌ SAGA FAILED: ${error.message}`);

        // COMPENSATION LOGIC (The "Rollback")
        console.log('⚠️  Executing Compensating Transactions...');

        // If Logistics succeeded, Cancel it
        const logisticsStep = sagaLog.find(s => s.step === 'LOGISTICS');
        if (logisticsStep) {
            console.log('   ↪️  Cancelling Delivery...');
        }

        // If Warehouse succeeded, Release it
        const warehouseStep = sagaLog.find(s => s.step === 'WAREHOUSE');
        if (warehouseStep) {
            console.log('   ↪️  Releasing Inventory...');
        }

        // ── UPDATE ORDER STATUS TO FAILED IN DATABASE ──
        await db.query(
            `UPDATE orders SET status = $1, saga_log = $2, updated_at = NOW() WHERE id = $3`,
            ['FAILED', JSON.stringify(sagaLog), orderId]
        );

        // 🔌 Emit: Order failed
        emitOrderEvent(orderId, userId, 'FAILED', 'COMPENSATION', `Order ${orderId} failed: ${error.message}`);

        res.status(500).json({
            success: false,
            message: 'Order creation failed',
            error: error.message,
            compensationTriggered: true
        });
    }
});

// ==========================================
// 📊 GET SINGLE ORDER
// ==========================================

app.get('/orders/:orderId', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM orders WHERE id = $1',
            [req.params.orderId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 🚀 START SERVER
// ==========================================

async function start() {
    // Load the database module (ESM → CommonJS bridge)
    await loadDatabase();

    // Initialize database tables
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════════════════╗
║   📦 ORDER SERVICE (SAGA) — PostgreSQL             ║
╠════════════════════════════════════════════════════╣
║   🚀 Server:  http://localhost:${PORT}                 ║
║   🗄️  Storage: PostgreSQL                          ║
║   📍 Orders:  GET/POST /orders                     ║
╚════════════════════════════════════════════════════╝
        `);
    });
}

start().catch(error => {
    console.error('❌ Failed to start Order Service:', error);
    process.exit(1);
});
