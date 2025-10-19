// Script para probar la autenticación con la API de Linisco
import axios from 'axios';

async function testAuth() {
  console.log('🔐 Probando autenticación con la API de Linisco...\n');

  try {
    // Test 1: Probar login directo
    console.log('1. Probando login directo...');
    const loginResponse = await axios.post('https://pos.linisco.com.ar/users/sign_in', {
      user: {
        email: '63953@linisco.com.ar',
        password: '63953hansen'
      }
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'vscode-restclient'
      },
      timeout: 10000
    });

    console.log('✅ Login exitoso!');
    console.log('📋 Respuesta completa:', JSON.stringify(loginResponse.data, null, 2));
    
    // Extraer token
    if (loginResponse.data && loginResponse.data.authentication_token) {
      const token = loginResponse.data.authentication_token;
      console.log(`🔑 Token obtenido: ${token}`);
      
      // Test 2: Probar endpoint con token
      console.log('\n2. Probando endpoint con token...');
      const ordersResponse = await axios.get('https://pos.linisco.com.ar/sale_orders', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-User-Email': '63953@linisco.com.ar',
          'X-User-Token': token,
          'User-Agent': 'vscode-restclient'
        },
        data: {
          fromDate: '09/11/2021',
          toDate: '09/11/2021'
        },
        timeout: 30000
      });

      console.log('✅ Endpoint funcionando!');
      console.log('📊 Datos obtenidos:', JSON.stringify(ordersResponse.data, null, 2));
      
    } else {
      console.log('❌ No se encontró token en la respuesta');
      console.log('📋 Estructura de respuesta:', Object.keys(loginResponse.data));
    }

  } catch (error) {
    console.error('❌ Error en la autenticación:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
      console.error('   Headers:', error.response.headers);
    }
  }
}

// Ejecutar prueba
testAuth();
