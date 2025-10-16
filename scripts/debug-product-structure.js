// Script para revisar la estructura de productos
import LiniscoAPI from '../config/linisco.js';
import StoreManager from '../config/stores.js';

async function debugProductStructure() {
  console.log('🔍 Revisando estructura de productos...');
  console.log('=======================================');
  
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
    
    // Obtener productos
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`\n📊 Obteniendo productos desde ${fromDate} hasta ${toDate}...`);
    const products = await api.getSaleProducts(fromDate, toDate);
    console.log(`✅ ${products.length} productos obtenidos`);
    
    if (products.length > 0) {
      console.log(`\n📋 Estructura del primer producto:`);
      console.log(JSON.stringify(products[0], null, 2));
      
      // Buscar productos con diferentes idSession
      const uniqueSessions = [...new Set(products.map(p => p.idSession))];
      console.log(`\n📊 Sesiones únicas en productos: ${uniqueSessions.length}`);
      console.log(`📋 IDs de sesión:`, uniqueSessions.slice(0, 10));
      
      // Mostrar algunos productos de diferentes sesiones
      for (const sessionId of uniqueSessions.slice(0, 3)) {
        const sessionProducts = products.filter(p => p.idSession === sessionId);
        console.log(`\n📦 Sesión ${sessionId}: ${sessionProducts.length} productos`);
        if (sessionProducts.length > 0) {
          console.log(`📋 Primer producto de sesión ${sessionId}:`, {
            idSaleProduct: sessionProducts[0].idSaleProduct,
            idSaleOrder: sessionProducts[0].idSaleOrder,
            idSession: sessionProducts[0].idSession,
            name: sessionProducts[0].name,
            quantity: sessionProducts[0].quantity,
            salePrice: sessionProducts[0].salePrice
          });
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugProductStructure();
