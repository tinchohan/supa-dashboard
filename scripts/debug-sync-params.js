// Script para diagnosticar parámetros de sincronización
import MultiStoreSyncService from '../services/multiStoreSyncService-clean.js';

async function debugSyncParams() {
  console.log('🔍 Diagnosticando parámetros de sincronización...');
  console.log('================================================');
  
  try {
    // Crear instancia del servicio
    const syncService = new MultiStoreSyncService();
    
    // Probar con fechas específicas
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Fechas a usar:`);
    console.log(`- Desde: ${fromDate}`);
    console.log(`- Hasta: ${toDate}`);
    
    // Probar solo la primera tienda
    const firstStore = syncService.stores[0];
    console.log(`\n🏪 Probando con tienda: ${firstStore.store_name} (${firstStore.store_id})`);
    console.log(`📧 Email: ${firstStore.email}`);
    console.log(`🔑 Password: ${firstStore.password ? 'Configurada' : 'No configurada'}`);
    
    // Probar autenticación
    console.log(`\n🔐 Probando autenticación...`);
    const api = new (await import('../config/linisco.js')).default(firstStore);
    
    try {
      const userData = await api.authenticate();
      console.log(`✅ Autenticación exitosa: ${userData.email}`);
      
      // Probar obtener sesiones con logging detallado
      console.log(`\n📊 Probando obtener sesiones...`);
      console.log(`🔧 Parámetros que se enviarán:`, {
        fromDate,
        toDate,
        headers: api.getAuthHeaders()
      });
      
      const sessions = await api.getSessions(fromDate, toDate);
      console.log(`✅ Sesiones obtenidas: ${sessions.length}`);
      
      if (sessions.length > 0) {
        console.log(`📋 Primera sesión:`, JSON.stringify(sessions[0], null, 2));
      }
      
    } catch (authError) {
      console.error(`❌ Error en autenticación:`, authError.message);
      if (authError.response) {
        console.error(`📊 Response data:`, authError.response.data);
        console.error(`📊 Response status:`, authError.response.status);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debugSyncParams();
