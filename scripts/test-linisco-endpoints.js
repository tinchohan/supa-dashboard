// Script para probar diferentes endpoints de Linisco
import LiniscoAPI from '../config/linisco.js';
import StoreManager from '../config/stores.js';

async function testLiniscoEndpoints() {
  console.log('🔍 Probando endpoints de Linisco...');
  console.log('====================================');
  
  try {
    // Obtener primera tienda
    const storeManager = new StoreManager();
    const stores = storeManager.getStores();
    const firstStore = stores[0];
    
    console.log(`🏪 Probando con tienda: ${firstStore.store_name} (${firstStore.store_id})`);
    
    // Crear API
    const api = new LiniscoAPI(firstStore);
    
    // Autenticar
    console.log(`\n🔐 Autenticando...`);
    const userData = await api.authenticate();
    console.log(`✅ Autenticado: ${userData.email}`);
    
    // Probar diferentes endpoints
    const endpoints = [
      '/sale_orders',
      '/sale_products', 
      '/products',
      '/items',
      '/sessions',
      '/psessions'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Probando endpoint: ${endpoint}`);
        const response = await api.axios.get(`${api.baseURL}${endpoint}`, {
          headers: api.getAuthHeaders()
        });
        console.log(`✅ ${endpoint}: Status ${response.status}, ${response.data?.length || 'N/A'} registros`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'Error'} - ${error.message}`);
      }
    }
    
    // Probar con parámetros de fecha
    console.log(`\n📅 Probando endpoints con fechas...`);
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    try {
      console.log(`🔍 Probando /sale_orders con fechas...`);
      const orders = await api.getSaleOrders(fromDate, toDate);
      console.log(`✅ Órdenes obtenidas: ${orders.length}`);
      
      if (orders.length > 0) {
        console.log(`📋 Primera orden:`, JSON.stringify(orders[0], null, 2));
      }
    } catch (error) {
      console.log(`❌ Error obteniendo órdenes:`, error.message);
    }
    
    try {
      console.log(`🔍 Probando /sale_products con fechas...`);
      const products = await api.getSaleProducts(fromDate, toDate);
      console.log(`✅ Productos obtenidos: ${products.length}`);
      
      if (products.length > 0) {
        console.log(`📋 Primer producto:`, JSON.stringify(products[0], null, 2));
      }
    } catch (error) {
      console.log(`❌ Error obteniendo productos:`, error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Error en prueba:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testLiniscoEndpoints();
