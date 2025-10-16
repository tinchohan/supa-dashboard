import fetch from 'node-fetch';

async function testSimple() {
    try {
        console.log('🧪 Probando endpoint simple...');
        
        const response = await fetch('http://localhost:3000/api/ai/charts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromDate: '2025-10-14',
                toDate: '2025-10-14',
                storeId: null
            })
        });
        
        console.log('📊 Status:', response.status);
        const text = await response.text();
        console.log('📝 Respuesta raw:', text);
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

testSimple();
