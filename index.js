import MultiStoreSyncService from './services/multiStoreSyncService.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const syncService = new MultiStoreSyncService();
  
  try {
    console.log('🚀 Iniciando sincronización masiva de datos Linisco...');
    
    // Configurar fechas (por defecto: último día)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const fromDate = process.argv[2] || yesterday.toISOString().split('T')[0];
    const toDate = process.argv[3] || fromDate;
    
    console.log(`📅 Sincronizando todas las tiendas desde ${fromDate} hasta ${toDate}`);
    
    // Ejecutar sincronización masiva
    const result = await syncService.syncAllStores(fromDate, toDate);
    
    if (result.success) {
      console.log(`✅ Sincronización exitosa: ${result.totalRecords} registros de ${result.results.length} tiendas`);
      
      // Mostrar resumen por tienda
      const storesSummary = syncService.getStoresSummary(fromDate, toDate);
      console.log('\n📊 Resumen por tienda:');
      storesSummary.forEach(store => {
        console.log(`   • ${store.store_name} (${store.store_id}):`);
        console.log(`     - Órdenes: ${store.total_orders || 0}`);
        console.log(`     - Productos: ${store.total_products || 0}`);
        console.log(`     - Combos: ${store.total_combos || 0}`);
        console.log(`     - Ingresos: $${store.total_revenue?.toFixed(2) || 0}`);
        console.log(`     - Promedio por orden: $${store.avg_order_value?.toFixed(2) || 0}`);
        console.log('');
      });
    } else {
      console.log(`⚠️ Sincronización parcial: ${result.totalRecords} registros, ${result.errors.length} errores`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errores encontrados:');
        result.errors.forEach(error => {
          console.log(`   • ${error.store}: ${error.error}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    process.exit(1);
  } finally {
    syncService.close();
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
