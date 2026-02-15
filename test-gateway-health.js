import fetch from 'node-fetch';

async function checkHealth() {
    try {
        console.log('Testing Gateway Health at http://localhost:5000/health ...');
        const response = await fetch('http://localhost:5000/health');
        if (response.ok) {
            console.log('✅ Gateway is UP and responding!');
            const data = await response.json();
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`❌ Gateway responded with status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Failed to connect to Gateway:', error.message);
    }
}

checkHealth();
