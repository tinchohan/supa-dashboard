// Script para probar la sincronización corregida
import MultiStoreSyncService from '../services/multiStoreSyncService-clean.js';

async function testFixedSync() {
  console.log('🚀 Probando sincronización corregida...');
  console.log('========================================');
  
  try {
    // Crear instancia del servicio
    const syncService = new MultiStoreSyncService();
    
    // Probar sincronización de los últimos 3 días (menos datos para prueba)
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Sincronizando desde ${fromDate} hasta ${toDate}`);
    
    // Ejecutar sincronización solo de la primera tienda para prueba
    const firstStore = syncService.stores[0];
    console.log(`🏪 Probando solo con: ${firstStore.store_name} (${firstStore.store_id})`);
    
    // Ejecutar sincronización
    const result = await syncService.syncStore(firstStore, fromDate, toDate);
    
    console.log('\n📊 Resultado de sincronización:');
    console.log('- Tienda:', result.store);
    console.log('- Registros procesados:', result.records);
    console.log('- Errores:', result.errors);
    
    console.log('\n🎉 Prueba de sincronización completada');
    
  } catch (error) {
    console.error('\n❌ Error en prueba de sincronización:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFixedSync();
