// Script de prueba para la API de Linisco
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Iniciando pruebas de la API de Linisco...\n');

  try {
    // Test 1: Health check
    console.log('1. Probando health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check:', healthResponse.data.message);

    // Test 2: Obtener usuarios
    console.log('\n2. Obteniendo usuarios configurados...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`);
    console.log('✅ Usuarios encontrados:', usersResponse.data.data.length);

    // Test 3: Obtener tiendas
    console.log('\n3. Obteniendo tiendas...');
    const storesResponse = await axios.get(`${BASE_URL}/api/stores`);
    console.log('✅ Tiendas encontradas:', storesResponse.data.data.length);

    // Test 4: Test de conectividad con API externa
    console.log('\n4. Probando conectividad con API de Linisco...');
    const apiTestResponse = await axios.get(`${BASE_URL}/api/test-api`);
    console.log('✅ Test API:', apiTestResponse.data.message);

    // Test 5: Obtener estadísticas (usando datos de muestra)
    console.log('\n5. Obteniendo estadísticas...');
    const statsResponse = await axios.post(`${BASE_URL}/api/stats`, {
      fromDate: '09/11/2021',
      toDate: '09/11/2021'
    });
    console.log('✅ Estadísticas obtenidas:');
    console.log(`   - Total órdenes: ${statsResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos totales: $${statsResponse.data.data.totalRevenue.toLocaleString()}`);
    console.log(`   - Valor promedio por orden: $${statsResponse.data.data.averageOrderValue.toFixed(2)}`);

    // Test 6: Obtener órdenes de venta
    console.log('\n6. Obteniendo órdenes de venta...');
    const ordersResponse = await axios.post(`${BASE_URL}/api/sale-orders`, {
      fromDate: '09/11/2021',
      toDate: '09/11/2021'
    });
    console.log('✅ Órdenes obtenidas:', ordersResponse.data.data.length);

    // Test 7: Obtener productos de venta
    console.log('\n7. Obteniendo productos de venta...');
    const productsResponse = await axios.post(`${BASE_URL}/api/sale-products`, {
      fromDate: '09/11/2021',
      toDate: '09/11/2021'
    });
    console.log('✅ Productos obtenidos:', productsResponse.data.data.length);

    // Test 8: Obtener sesiones
    console.log('\n8. Obteniendo sesiones...');
    const sessionsResponse = await axios.post(`${BASE_URL}/api/sessions`, {
      fromDate: '09/11/2021',
      toDate: '09/11/2021'
    });
    console.log('✅ Sesiones obtenidas:', sessionsResponse.data.data.length);

    // Test 9: Estadísticas consolidadas
    console.log('\n9. Obteniendo estadísticas consolidadas...');
    const consolidatedResponse = await axios.post(`${BASE_URL}/api/stats/consolidated`, {
      fromDate: '09/11/2021',
      toDate: '09/11/2021'
    });
    console.log('✅ Estadísticas consolidadas:');
    console.log(`   - Total órdenes: ${consolidatedResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos totales: $${consolidatedResponse.data.data.totalRevenue.toLocaleString()}`);
    console.log(`   - Usuarios procesados: ${consolidatedResponse.data.data.userStats.length}`);

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Ejecutar pruebas
testAPI();
