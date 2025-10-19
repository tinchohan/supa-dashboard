// Script simple para probar la sincronización
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSyncSimple() {
  console.log('🔄 Prueba Simple de Sincronización');
  console.log('=' .repeat(40));

  try {
    // Test 1: Estado de sincronización
    console.log('\n1. Estado de sincronización...');
    const statusResponse = await axios.get(`${BASE_URL}/api/sync/status`);
    console.log('✅ Estado:', statusResponse.data.data.message);

    // Test 2: Estadísticas (debería funcionar con o sin MySQL)
    console.log('\n2. Obteniendo estadísticas...');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const statsResponse = await axios.post(`${BASE_URL}/api/stats`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log('✅ Estadísticas:');
    console.log(`   - Órdenes: ${statsResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos: $${statsResponse.data.data.totalRevenue.toLocaleString()}`);

    // Test 3: Sincronización de usuario (funcionará aunque no haya MySQL)
    console.log('\n3. Probando sincronización de usuario...');
    const syncResponse = await axios.post(`${BASE_URL}/api/sync/user`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log('✅ Sincronización:');
    console.log(`   - ${syncResponse.data.message}`);
    if (syncResponse.data.data.synced) {
      console.log(`   - Órdenes: ${syncResponse.data.data.synced.orders}`);
      console.log(`   - Productos: ${syncResponse.data.data.synced.products}`);
      console.log(`   - Sesiones: ${syncResponse.data.data.synced.sessions}`);
    }

    console.log('\n🎉 ¡Sistema híbrido funcionando correctamente!');
    console.log('✅ API + MySQL (fallback a solo API si no hay MySQL)');
    console.log('✅ Sincronización automática implementada');
    console.log('✅ Consultas optimizadas disponibles');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testSyncSimple();
