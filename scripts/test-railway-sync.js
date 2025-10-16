// Script para probar la sincronización en Railway
import MultiStoreSyncService from '../services/multiStoreSyncService-clean.js';

async function testRailwaySync() {
  console.log('🚀 Probando sincronización en Railway...');
  console.log('========================================');
  
  try {
    // Crear instancia del servicio
    const syncService = new MultiStoreSyncService();
    
    // Probar sincronización de los últimos 7 días
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log(`📅 Sincronizando desde ${fromDate} hasta ${toDate}`);
    
    // Ejecutar sincronización
    const result = await syncService.syncAllStores(fromDate, toDate);
    
    console.log('\n📊 Resultados de sincronización:');
    console.log('- Total de tiendas procesadas:', result.results.length);
    console.log('- Total de registros:', result.totalRecords);
    console.log('- Errores:', result.errors.length);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errores encontrados:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.store}: ${error.error}`);
      });
    }
    
    if (result.results.length > 0) {
      console.log('\n✅ Tiendas sincronizadas exitosamente:');
      result.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.store}: ${result.records} registros`);
      });
    }
    
    console.log('\n🎉 Prueba de sincronización completada');
    
  } catch (error) {
    console.error('\n❌ Error en prueba de sincronización:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testRailwaySync();
