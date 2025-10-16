import fetch from 'node-fetch';

async function testCharts() {
    try {
        console.log('🧪 Probando endpoint /api/ai/charts...');
        
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
        
        const data = await response.json();
        
        console.log('📊 Respuesta del servidor:');
        console.log('Status:', response.status);
        console.log('Success:', data.success);
        
        if (data.success) {
            console.log('✅ Gráficos generados correctamente');
            console.log('📝 Respuesta completa:');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('❌ Error:', data.error);
        }
        
    } catch (error) {
        console.error('💥 Error en la prueba:', error.message);
    }
}

testCharts();
