// Script para probar la sincronización completa
import MultiStoreSyncService from '../services/multiStoreSyncService-clean.js';

async function testSyncComplete() {
  console.log('🚀 Probando sincronización completa...');
  console.log('====================================');
  
  try {
    // Crear instancia del servicio
    const syncService = new MultiStoreSyncService();
    
    // Probar sincronización de los últimos 3 días
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Sincronizando desde ${fromDate} hasta ${toDate}`);
    
    // Ejecutar sincronización completa
    const result = await syncService.syncAllStores(fromDate, toDate);
    
    console.log('\n📊 Resultados de sincronización:');
    console.log('- Éxito:', result.success);
    console.log('- Total de registros:', result.totalRecords);
    console.log('- Tiendas procesadas:', result.results.length);
    console.log('- Errores:', result.errors.length);
    
    if (result.results.length > 0) {
      console.log('\n✅ Tiendas sincronizadas:');
      result.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.store}: ${result.recordsProcessed} registros`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.store}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 Prueba de sincronización completada');
    
  } catch (error) {
    console.error('\n❌ Error en prueba de sincronización:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSyncComplete();
