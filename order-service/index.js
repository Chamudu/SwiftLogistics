const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 4004;
const GATEWAY_URL = 'http://localhost:5000';
const API_KEY = 'swift-123-secret';

// Middleware
app.use(cors());
app.use(express.json());

// Helper for Gateway calls
const gateway = axios.create({
    baseURL: GATEWAY_URL,
    headers: { 'x-api-key': API_KEY }
});

// In-memory Order Store
const orders = [];

// GET All Orders
app.get('/orders', (req, res) => {
    res.json(orders);
});

// SAGA: Create Order
app.post('/orders', async (req, res) => {
    const { items, destination, paymentMethod } = req.body;
    const orderId = `ORD-${Date.now()}`;
    const sagaLog = [];

    // Store order in memory
    const newOrder = {
        orderId,
        items,
        destination,
        status: 'PENDING',
        createdAt: new Date(),
        logs: sagaLog
    };
    orders.unshift(newOrder); // Add to beginning of list

    console.log(`\n📦 STARTING SAGA for Order ${orderId}`);

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


        // STEP 3: Submit Order to Legacy System (CMS Service via SOAP Adapter)
        console.log('➡️  Step 3: Submitting to Legacy CMS (via JSON Adapter)...');

        // 🆕 IMPROVED: Sending JSON instead of Raw XML!
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


        // SAGA COMPLETE
        console.log(`🎉 SAGA COMPLETED successfully for ${orderId}\n`);

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

        // Update local status
        const order = orders.find(o => o.orderId === orderId);
        if (order) order.status = 'COMPLETED';

    } catch (error) {
        console.error(`❌ SAGA FAILED: ${error.message}`);

        // COMPENSATION LOGIC (The "Rollback")
        console.log('⚠️  Executing Compensating Transactions...');

        // If Logicstics succeeded, Cancel it
        const logisticsStep = sagaLog.find(s => s.step === 'LOGISTICS');
        if (logisticsStep) {
            console.log('   ↪️  Cancelling Delivery...');
            // await gateway.post('/api/routes/cancel', ...); // Not implemented yet
        }

        // If Warehouse succeeded, Release it
        const warehouseStep = sagaLog.find(s => s.step === 'WAREHOUSE');
        if (warehouseStep) {
            console.log('   ↪️  Releasing Inventory...');
            // await gateway.post('/api/warehouse/release', ...); // Not implemented yet
        }

        res.status(500).json({
            success: false,
            message: 'Order creation failed',
            error: error.message,
            compensationTriggered: true
        });

        // Update local status
        const order = orders.find(o => o.orderId === orderId);
        if (order) order.status = 'FAILED';
    }
});

app.listen(PORT, () => {
    console.log(`Order Service (SAGA Orchestrator) running on port ${PORT}`);
});
