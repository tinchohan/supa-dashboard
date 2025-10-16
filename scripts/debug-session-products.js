// Script para diagnosticar obtención de productos de sesiones
import LiniscoAPI from '../config/linisco.js';
import StoreManager from '../config/stores.js';

async function debugSessionProducts() {
  console.log('🔍 Diagnosticando productos de sesiones...');
  console.log('==========================================');
  
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
    
    // Obtener sesiones
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`\n📊 Obteniendo sesiones desde ${fromDate} hasta ${toDate}...`);
    const sessions = await api.getSessions(fromDate, toDate);
    console.log(`✅ ${sessions.length} sesiones encontradas`);
    
    if (sessions.length > 0) {
      const firstSession = sessions[0];
      console.log(`\n📋 Primera sesión:`, {
        idSession: firstSession.idSession,
        shopNumber: firstSession.shopNumber,
        checkin: firstSession.checkin,
        totalInvoiced: firstSession.totalInvoiced
      });
      
      // Intentar obtener productos de la primera sesión
      console.log(`\n📦 Obteniendo productos de sesión ${firstSession.idSession}...`);
      try {
        const products = await api.getSessionProducts(firstSession.idSession);
        console.log(`✅ Productos obtenidos: ${products.length}`);
        
        if (products.length > 0) {
          console.log(`📋 Primer producto:`, JSON.stringify(products[0], null, 2));
        }
      } catch (productError) {
        console.error(`❌ Error obteniendo productos:`, productError.message);
        if (productError.response) {
          console.error(`📊 Status:`, productError.response.status);
          console.error(`📊 Data:`, productError.response.data);
          console.error(`📊 URL:`, productError.config?.url);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugSessionProducts();
