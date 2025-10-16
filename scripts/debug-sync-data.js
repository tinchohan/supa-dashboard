// Script para diagnosticar por qué la sincronización no encuentra datos
import MultiStoreSyncService from '../services/multiStoreSyncService-clean.js';

async function debugSyncData() {
  console.log('🔍 Diagnosticando datos de sincronización...');
  console.log('==========================================');
  
  try {
    // Crear instancia del servicio
    const syncService = new MultiStoreSyncService();
    
    // Probar con fechas recientes
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Probando sincronización desde ${fromDate} hasta ${toDate}`);
    
    // Probar solo la primera tienda
    const firstStore = syncService.stores[0];
    console.log(`🏪 Probando con tienda: ${firstStore.store_name} (${firstStore.store_id})`);
    
    // Crear API directamente para diagnosticar
    const LiniscoAPI = (await import('../config/linisco.js')).default;
    const api = new LiniscoAPI(firstStore);
    
    console.log('\n🔐 1. Probando autenticación...');
    const userData = await api.authenticate();
    console.log(`✅ Autenticado: ${userData.email}`);
    
    console.log('\n📊 2. Probando sesiones...');
    const sessions = await api.getSessions(fromDate, toDate);
    console.log(`✅ Sesiones encontradas: ${sessions.length}`);
    
    if (sessions.length > 0) {
      console.log(`📋 Primera sesión:`, {
        idSession: sessions[0].idSession,
        shopNumber: sessions[0].shopNumber,
        checkin: sessions[0].checkin,
        totalInvoiced: sessions[0].totalInvoiced
      });
    }
    
    console.log('\n📦 3. Probando órdenes...');
    const orders = await api.getSaleOrders(fromDate, toDate);
    console.log(`✅ Órdenes encontradas: ${orders.length}`);
    
    if (orders.length > 0) {
      console.log(`📋 Primera orden:`, {
        idSaleOrder: orders[0].idSaleOrder,
        idSession: orders[0].idSession,
        orderDate: orders[0].orderDate,
        total: orders[0].total
      });
    }
    
    console.log('\n🛍️ 4. Probando productos...');
    const products = await api.getSaleProducts(fromDate, toDate);
    console.log(`✅ Productos encontrados: ${products.length}`);
    
    if (products.length > 0) {
      console.log(`📋 Primer producto:`, {
        idSaleProduct: products[0].idSaleProduct,
        idSaleOrder: products[0].idSaleOrder,
        name: products[0].name,
        quantity: products[0].quantity,
        salePrice: products[0].salePrice
      });
    }
    
    // Probar filtrado por sesión
    if (sessions.length > 0 && orders.length > 0) {
      console.log('\n🔗 5. Probando filtrado por sesión...');
      const firstSession = sessions[0];
      const sessionOrders = orders.filter(order => order.idSession === firstSession.idSession);
      console.log(`📦 Órdenes de sesión ${firstSession.idSession}: ${sessionOrders.length}`);
      
      if (sessionOrders.length > 0) {
        const sessionOrderIds = sessionOrders.map(order => order.idSaleOrder);
        const sessionProducts = products.filter(product => sessionOrderIds.includes(product.idSaleOrder));
        console.log(`🛍️ Productos de sesión ${firstSession.idSession}: ${sessionProducts.length}`);
      }
    }
    
    console.log('\n🎉 Diagnóstico completado');
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugSyncData();
