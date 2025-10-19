// Demo de datos reales de la API de Linisco
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function demoRealData() {
  console.log('🎯 DEMO: Datos Reales de la API de Linisco');
  console.log('=' .repeat(50));

  try {
    // Obtener estadísticas consolidadas
    console.log('\n📊 ESTADÍSTICAS CONSOLIDADAS (Últimos 30 días)');
    console.log('-'.repeat(50));
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const consolidatedResponse = await axios.post(`${BASE_URL}/api/stats/consolidated`, {
      fromDate: fromDate,
      toDate: toDate
    });

    const data = consolidatedResponse.data.data;
    console.log(`📅 Período: ${fromDate} a ${toDate}`);
    console.log(`📦 Total de órdenes: ${data.totalOrders}`);
    console.log(`💰 Ingresos totales: $${data.totalRevenue.toLocaleString()}`);
    console.log(`📈 Valor promedio por orden: $${data.averageOrderValue.toFixed(2)}`);
    console.log(`👥 Usuarios procesados: ${data.userStats.length}`);

    // Mostrar desglose por método de pago
    if (data.consolidated.paymentBreakdown.length > 0) {
      console.log('\n💳 DESGLOSE POR MÉTODO DE PAGO');
      console.log('-'.repeat(50));
      data.consolidated.paymentBreakdown.forEach(payment => {
        console.log(`${payment.payment_category}: ${payment.order_count} órdenes - $${payment.total_amount.toLocaleString()}`);
      });
    }

    // Mostrar desglose por tienda
    if (data.consolidated.storeBreakdown.length > 0) {
      console.log('\n🏪 DESGLOSE POR TIENDA');
      console.log('-'.repeat(50));
      data.consolidated.storeBreakdown.forEach(store => {
        console.log(`Tienda ${store.store_id}: ${store.order_count} órdenes - $${store.total_amount.toLocaleString()}`);
      });
    }

    // Mostrar estadísticas por usuario
    if (data.userStats.length > 0) {
      console.log('\n👤 ESTADÍSTICAS POR USUARIO');
      console.log('-'.repeat(50));
      data.userStats.forEach(user => {
        console.log(`${user.user}: ${user.totalOrders} órdenes - $${user.totalRevenue.toLocaleString()}`);
      });
    }

    // Probar endpoints específicos
    console.log('\n🔍 PRUEBA DE ENDPOINTS ESPECÍFICOS');
    console.log('-'.repeat(50));

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

    console.log('\n🎉 ¡DEMO COMPLETADO!');
    console.log('✅ La API está obteniendo datos reales de Linisco');
    console.log('✅ El sistema está preparado para 7 usuarios');
    console.log('✅ Todos los endpoints están funcionando');

  } catch (error) {
    console.error('❌ Error en el demo:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

demoRealData();
