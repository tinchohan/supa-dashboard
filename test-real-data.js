// Script para probar datos reales de la API
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testRealData() {
  console.log('🧪 Probando datos reales de la API de Linisco...\n');

  try {
    // Test 1: Probar con fechas recientes
    console.log('1. Probando con fechas recientes (últimos 30 días)...');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    
    console.log(`   Fechas: ${fromDate} a ${toDate}`);

    const statsResponse = await axios.post(`${BASE_URL}/api/stats`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log('✅ Estadísticas obtenidas:');
    console.log(`   - Total órdenes: ${statsResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos totales: $${statsResponse.data.data.totalRevenue.toLocaleString()}`);
    console.log(`   - Valor promedio por orden: $${statsResponse.data.data.averageOrderValue.toFixed(2)}`);

    // Test 2: Probar órdenes de venta
    console.log('\n2. Probando órdenes de venta...');
    const ordersResponse = await axios.post(`${BASE_URL}/api/sale-orders`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log(`✅ Órdenes obtenidas: ${ordersResponse.data.data.length}`);
    if (ordersResponse.data.data.length > 0) {
      console.log('📋 Primera orden:', JSON.stringify(ordersResponse.data.data[0], null, 2));
    }

    // Test 3: Probar productos de venta
    console.log('\n3. Probando productos de venta...');
    const productsResponse = await axios.post(`${BASE_URL}/api/sale-products`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log(`✅ Productos obtenidos: ${productsResponse.data.data.length}`);
    if (productsResponse.data.data.length > 0) {
      console.log('📋 Primer producto:', JSON.stringify(productsResponse.data.data[0], null, 2));
    }

    // Test 4: Probar sesiones
    console.log('\n4. Probando sesiones...');
    const sessionsResponse = await axios.post(`${BASE_URL}/api/sessions`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log(`✅ Sesiones obtenidas: ${sessionsResponse.data.data.length}`);
    if (sessionsResponse.data.data.length > 0) {
      console.log('📋 Primera sesión:', JSON.stringify(sessionsResponse.data.data[0], null, 2));
    }

    // Test 5: Probar con fechas específicas del ejemplo
    console.log('\n5. Probando con fechas del ejemplo (09/11/2021)...');
    const exampleResponse = await axios.post(`${BASE_URL}/api/sale-orders`, {
      fromDate: '09/11/2021',
      toDate: '09/11/2021',
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log(`✅ Órdenes del ejemplo: ${exampleResponse.data.data.length}`);
    if (exampleResponse.data.data.length > 0) {
      console.log('📋 Datos reales encontrados!');
    } else {
      console.log('ℹ️ No hay datos para esa fecha específica (normal)');
    }

    console.log('\n🎉 ¡Pruebas completadas!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Ejecutar pruebas
testRealData();
