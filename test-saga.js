/**
 * SAGA Test Script
 * Interacts with the Order Service Orchestrator
 */

import fetch from 'node-fetch';

const ORDER_SERVICE_URL = 'http://localhost:4004';

async function createOrder() {
    console.log('📦 Creating New Order via SAGA Orchestrator...');

    try {
        const start = Date.now();
        const response = await fetch(`${ORDER_SERVICE_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [
                    { sku: 'ITEM-001', quantity: 1 }, // Valid Item (Laptop)
                    { sku: 'ITEM-002', quantity: 2 }  // Valid Item (Mouse)
                ],
                destination: '123 Order Lane, Colombo',
                paymentMethod: 'CREDIT_CARD'
            })
        });

        const data = await response.json();
        const duration = Date.now() - start;

        if (response.ok) {
            console.log('\n✅ Order Created Successfully!');
            console.log(`⏱️ Duration: ${duration}ms`);
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('\n❌ Order Creation Failed');
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Connection Error:', error.message);
        console.log('Is the Order Service running on port 4000?');
    }
}

createOrder();
