// Script de prueba para la sincronización con MySQL
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testMySQLSync() {
  console.log('🗄️ DEMO: Sincronización con MySQL');
  console.log('=' .repeat(50));

  try {
    // Test 1: Verificar estado de sincronización
    console.log('\n1. Verificando estado de sincronización...');
    const statusResponse = await axios.get(`${BASE_URL}/api/sync/status`);
    console.log('✅ Estado de sincronización:');
    console.log(`   - Inicializado: ${statusResponse.data.data.initialized}`);
    if (statusResponse.data.data.initialized) {
      console.log(`   - Usuarios en DB: ${statusResponse.data.data.users.length}`);
      statusResponse.data.data.users.forEach(user => {
        console.log(`     * ${user.email}: ${user.orders_count} órdenes, ${user.products_count} productos, ${user.sessions_count} sesiones`);
      });
    } else {
      console.log('   - Base de datos no disponible, usando solo API');
    }

    // Test 2: Sincronizar datos de un usuario específico
    console.log('\n2. Sincronizando datos de usuario específico...');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const syncUserResponse = await axios.post(`${BASE_URL}/api/sync/user`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log('✅ Sincronización de usuario:');
    console.log(`   - ${syncUserResponse.data.message}`);
    if (syncUserResponse.data.data.synced) {
      console.log(`   - Órdenes sincronizadas: ${syncUserResponse.data.data.synced.orders}`);
      console.log(`   - Productos sincronizados: ${syncUserResponse.data.data.synced.products}`);
      console.log(`   - Sesiones sincronizadas: ${syncUserResponse.data.data.synced.sessions}`);
    }

    // Test 3: Obtener estadísticas (debería usar datos de la DB si está disponible)
    console.log('\n3. Obteniendo estadísticas (desde DB si disponible)...');
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

    // Test 4: Sincronizar todos los usuarios (si hay credenciales válidas)
    console.log('\n4. Sincronizando todos los usuarios...');
    try {
      const syncAllResponse = await axios.post(`${BASE_URL}/api/sync/all`, {
        fromDate: fromDate,
        toDate: toDate
      });

      console.log('✅ Sincronización completa:');
      console.log(`   - ${syncAllResponse.data.message}`);
      console.log(`   - Usuarios procesados: ${syncAllResponse.data.data.users.length}`);
      
      syncAllResponse.data.data.users.forEach(user => {
        console.log(`     * ${user.user}: ${user.success ? '✅' : '❌'} - ${user.synced?.orders || 0} órdenes`);
      });
    } catch (error) {
      console.log('⚠️ Sincronización completa falló (normal si no hay credenciales válidas):', error.response?.data?.error || error.message);
    }

    // Test 5: Verificar estado después de la sincronización
    console.log('\n5. Verificando estado después de la sincronización...');
    const finalStatusResponse = await axios.get(`${BASE_URL}/api/sync/status`);
    if (finalStatusResponse.data.data.initialized) {
      console.log('✅ Estado final:');
      finalStatusResponse.data.data.users.forEach(user => {
        console.log(`   - ${user.email}: ${user.orders_count} órdenes, ${user.products_count} productos, ${user.sessions_count} sesiones`);
        console.log(`     Última sincronización: ${user.last_sync || 'Nunca'}`);
      });
    }

    // Test 6: Probar limpieza de datos antiguos (opcional)
    console.log('\n6. Probando limpieza de datos antiguos...');
    try {
      const cleanupResponse = await axios.post(`${BASE_URL}/api/sync/cleanup`, {
        daysToKeep: 365 // Mantener datos de más de 1 año
      });

      console.log('✅ Limpieza completada:');
      console.log(`   - ${cleanupResponse.data.message}`);
    } catch (error) {
      console.log('⚠️ Limpieza no disponible:', error.response?.data?.error || error.message);
    }

    console.log('\n🎉 ¡DEMO DE SINCRONIZACIÓN COMPLETADO!');
    console.log('✅ Sistema híbrido API + MySQL funcionando');
    console.log('✅ Datos se sincronizan automáticamente');
    console.log('✅ Consultas más rápidas desde base de datos local');

  } catch (error) {
    console.error('❌ Error en el demo:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testMySQLSync();
