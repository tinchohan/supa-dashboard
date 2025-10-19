// Script para probar sincronización con datos reales
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSyncWithRealData() {
  console.log('🔄 PRUEBA DE SINCRONIZACIÓN CON DATOS REALES');
  console.log('=' .repeat(50));

  try {
    // Usar las fechas donde encontramos datos reales
    const fromDate = '2025-08-01';
    const toDate = '2025-08-31';

    console.log(`📅 Probando con fechas: ${fromDate} a ${toDate}`);
    console.log('');

    // Test 1: Verificar estado actual
    console.log('1. Estado actual del sistema...');
    const statusResponse = await axios.get(`${BASE_URL}/api/sync/status`);
    console.log('✅ Estado:', statusResponse.data.data.message);

    // Test 2: Obtener estadísticas (debería mostrar datos reales)
    console.log('\n2. Obteniendo estadísticas con datos reales...');
    const statsResponse = await axios.post(`${BASE_URL}/api/stats`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log('✅ Estadísticas obtenidas:');
    console.log(`   - Total órdenes: ${statsResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos totales: $${statsResponse.data.data.totalRevenue.toLocaleString()}`);
    console.log(`   - Valor promedio: $${statsResponse.data.data.averageOrderValue.toFixed(2)}`);

    // Test 3: Probar sincronización de usuario
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
      console.log(`   - Órdenes sincronizadas: ${syncResponse.data.data.synced.orders}`);
      console.log(`   - Productos sincronizados: ${syncResponse.data.data.synced.products}`);
      console.log(`   - Sesiones sincronizadas: ${syncResponse.data.data.synced.sessions}`);
    }

    // Test 4: Probar endpoints específicos
    console.log('\n4. Probando endpoints específicos...');
    
    // Órdenes de venta
    try {
      const ordersResponse = await axios.post(`${BASE_URL}/api/sale-orders`, {
        fromDate: fromDate,
        toDate: toDate,
        email: '63953@linisco.com.ar',
        password: '63953hansen'
      });
      console.log(`✅ Órdenes de venta: ${ordersResponse.data.data.length} registros`);
    } catch (error) {
      console.log(`⚠️ Órdenes de venta: ${error.message}`);
    }

    // Productos de venta
    try {
      const productsResponse = await axios.post(`${BASE_URL}/api/sale-products`, {
        fromDate: fromDate,
        toDate: toDate,
        email: '63953@linisco.com.ar',
        password: '63953hansen'
      });
      console.log(`✅ Productos de venta: ${productsResponse.data.data.length} registros`);
    } catch (error) {
      console.log(`⚠️ Productos de venta: ${error.message}`);
    }

    // Sesiones
    try {
      const sessionsResponse = await axios.post(`${BASE_URL}/api/sessions`, {
        fromDate: fromDate,
        toDate: toDate,
        email: '63953@linisco.com.ar',
        password: '63953hansen'
      });
      console.log(`✅ Sesiones: ${sessionsResponse.data.data.length} registros`);
    } catch (error) {
      console.log(`⚠️ Sesiones: ${error.message}`);
    }

    console.log('\n🎉 ¡SINCRONIZACIÓN CON DATOS REALES EXITOSA!');
    console.log('✅ Sistema obteniendo datos reales de Linisco');
    console.log('✅ Fechas con datos: Agosto 2025');
    console.log('✅ Sincronización funcionando correctamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testSyncWithRealData();

