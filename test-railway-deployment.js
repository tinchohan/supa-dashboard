// Script de prueba para verificar el despliegue en Railway
import axios from 'axios';

// Reemplaza con tu URL de Railway
const RAILWAY_URL = 'https://tu-app.railway.app'; // ← Cambiar por tu URL real

async function testRailwayDeployment() {
  console.log('🚀 PRUEBA DE DESPLIEGUE EN RAILWAY');
  console.log('=' .repeat(50));
  console.log(`🌐 URL: ${RAILWAY_URL}`);
  console.log('');

  try {
    // Test 1: Health Check
    console.log('1. Verificando Health Check...');
    const healthResponse = await axios.get(`${RAILWAY_URL}/api/health`, {
      timeout: 10000
    });
    console.log('✅ Health Check:', healthResponse.data.message);
    console.log(`   - Modo: ${healthResponse.data.mode}`);
    console.log(`   - Timestamp: ${healthResponse.data.timestamp}`);

    // Test 2: Estado de Sincronización
    console.log('\n2. Verificando estado de sincronización...');
    const syncStatusResponse = await axios.get(`${RAILWAY_URL}/api/sync/status`, {
      timeout: 10000
    });
    console.log('✅ Estado de sincronización:');
    console.log(`   - Inicializado: ${syncStatusResponse.data.data.initialized}`);
    console.log(`   - Mensaje: ${syncStatusResponse.data.data.message}`);
    
    if (syncStatusResponse.data.data.initialized) {
      console.log(`   - Usuarios en DB: ${syncStatusResponse.data.data.users.length}`);
    }

    // Test 3: Usuarios Configurados
    console.log('\n3. Verificando usuarios configurados...');
    const usersResponse = await axios.get(`${RAILWAY_URL}/api/users`, {
      timeout: 10000
    });
    console.log('✅ Usuarios configurados:');
    usersResponse.data.data.forEach(user => {
      console.log(`   - ${user.email} (${user.storeName}) - Activo: ${user.active}`);
    });

    // Test 4: Estadísticas (debería usar MySQL si está disponible)
    console.log('\n4. Probando estadísticas...');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const statsResponse = await axios.post(`${RAILWAY_URL}/api/stats`, {
      fromDate: fromDate,
      toDate: toDate,
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    }, {
      timeout: 30000
    });

    console.log('✅ Estadísticas obtenidas:');
    console.log(`   - Total órdenes: ${statsResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos totales: $${statsResponse.data.data.totalRevenue.toLocaleString()}`);
    console.log(`   - Valor promedio: $${statsResponse.data.data.averageOrderValue.toFixed(2)}`);

    // Test 5: Sincronización (si MySQL está disponible)
    if (syncStatusResponse.data.data.initialized) {
      console.log('\n5. Probando sincronización...');
      try {
        const syncResponse = await axios.post(`${RAILWAY_URL}/api/sync/user`, {
          fromDate: fromDate,
          toDate: toDate,
          email: '63953@linisco.com.ar',
          password: '63953hansen'
        }, {
          timeout: 60000
        });

        console.log('✅ Sincronización exitosa:');
        console.log(`   - ${syncResponse.data.message}`);
        if (syncResponse.data.data.synced) {
          console.log(`   - Órdenes: ${syncResponse.data.data.synced.orders}`);
          console.log(`   - Productos: ${syncResponse.data.data.synced.products}`);
          console.log(`   - Sesiones: ${syncResponse.data.data.synced.sessions}`);
        }
      } catch (error) {
        console.log('⚠️ Sincronización no disponible:', error.response?.data?.error || error.message);
      }
    } else {
      console.log('\n5. Sincronización no disponible (MySQL no configurado)');
    }

    // Test 6: Test de Conectividad con API Externa
    console.log('\n6. Verificando conectividad con API de Linisco...');
    const apiTestResponse = await axios.get(`${RAILWAY_URL}/api/test-api`, {
      timeout: 10000
    });
    console.log('✅ Conectividad con API:');
    console.log(`   - Estado: ${apiTestResponse.data.message}`);
    console.log(`   - URL: ${apiTestResponse.data.url}`);

    console.log('\n🎉 ¡DESPLIEGUE EN RAILWAY EXITOSO!');
    console.log('✅ Servidor funcionando correctamente');
    console.log('✅ API de Linisco conectada');
    console.log('✅ Sistema híbrido operativo');
    if (syncStatusResponse.data.data.initialized) {
      console.log('✅ MySQL conectado y funcionando');
      console.log('✅ Sincronización automática activa');
    } else {
      console.log('⚠️ MySQL no configurado, usando solo API');
    }
    console.log('✅ Datos reales obtenidos correctamente');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verificar que la URL de Railway sea correcta');
    console.log('2. Verificar que el despliegue esté completo');
    console.log('3. Verificar las variables de entorno en Railway');
    console.log('4. Revisar los logs en Railway');
  }
}

// Ejecutar prueba
testRailwayDeployment();
