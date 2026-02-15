/**
 * Resilience Test Suite
 * Tests if the Gateway handles failures gracefully
 */

import fetch from 'node-fetch';

const GATEWAY_URL = 'http://localhost:5000';
const API_KEY = 'test-key-001';

async function floodRequests(count = 20) {
    console.log(`🌊 Flooding ${count} requests...`);

    let success = 0;
    let fail = 0;
    let fastFail = 0; // Requests that failed < 20ms (likely circuit open)

    const startTotal = Date.now();

    const promises = Array.from({ length: count }).map(async (_, i) => {
        const start = Date.now();
        try {
            const res = await fetch(`${GATEWAY_URL}/api/routes/optimize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({ packageId: `PKG-${i}` })
            });

            const duration = Date.now() - start;
            if (res.ok) {
                success++;
                process.stdout.write('✅ ');
            } else {
                fail++;
                if (duration < 50) fastFail++;
                process.stdout.write(res.status === 502 ? '🔥 ' : '❌ ');
            }
        } catch (e) {
            fail++;
            process.stdout.write('☠️ ');
        }
    });

    await Promise.all(promises);

    console.log('\n\n📊 RESULTS:');
    console.log(`Total: ${count}`);
    console.log(`Success: ${success}`);
    console.log(`Fail: ${fail}`);
    console.log(`Fast Fail (Circuit Broken?): ${fastFail}`);
    console.log(`Total Time: ${(Date.now() - startTotal) / 1000}s`);

    if (fail > 0 && fastFail > 0) {
        console.log('\n💡 Observation: We saw failures and Fast Fails.');
        console.log('   This indicates the Circuit Breaker is likely working!');
    } else if (success === count) {
        console.log('\n💡 All requests succeeded. To test resilience, stop the REST Adapter and run this again.');
    }
}

floodRequests(20);
