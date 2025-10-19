// Script simple para probar la API
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSimple() {
  console.log('🧪 Prueba simple de la API...\n');

  try {
    // Test 1: Health check
    console.log('1. Health check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Servidor funcionando');

    // Test 2: Obtener usuarios
    console.log('\n2. Obteniendo usuarios...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`);
    console.log('✅ Usuarios:', usersResponse.data.data.length);

    // Test 3: Estadísticas con credenciales específicas
    console.log('\n3. Probando estadísticas con credenciales...');
    const statsResponse = await axios.post(`${BASE_URL}/api/stats`, {
      fromDate: '2025-10-01',
      toDate: '2025-10-19',
      email: '63953@linisco.com.ar',
      password: '63953hansen'
    });

    console.log('✅ Estadísticas:');
    console.log(`   - Órdenes: ${statsResponse.data.data.totalOrders}`);
    console.log(`   - Ingresos: $${statsResponse.data.data.totalRevenue.toLocaleString()}`);

    // Test 4: Test de conectividad con API externa
    console.log('\n4. Test de conectividad...');
    const apiTestResponse = await axios.get(`${BASE_URL}/api/test-api`);
    console.log('✅ Conectividad:', apiTestResponse.data.message);

    console.log('\n🎉 ¡Pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testSimple();
