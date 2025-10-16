import MultiStoreSyncService from './services/multiStoreSyncService.js';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const SYNC_INTERVAL_MINUTES = parseInt(process.env.SYNC_INTERVAL_MINUTES) || 60;

class ScheduledSync {
  constructor() {
    this.syncService = new MultiStoreSyncService();
    this.isRunning = false;
  }

  async performSync() {
    if (this.isRunning) {
      console.log('⏳ Sincronización ya en progreso, saltando...');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('🔄 Iniciando sincronización programada de todas las tiendas...');
      
      // Sincronizar datos del día anterior
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      const result = await this.syncService.syncAllStores(dateStr, dateStr);
      
      if (result.success) {
        console.log(`✅ Sincronización programada completada: ${result.totalRecords} registros de ${result.results.length} tiendas`);
      } else {
        console.log(`⚠️ Sincronización parcial: ${result.totalRecords} registros, ${result.errors.length} errores`);
      }
      
    } catch (error) {
      console.error('❌ Error en sincronización programada:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    console.log(`⏰ Iniciando sincronización automática cada ${SYNC_INTERVAL_MINUTES} minutos`);
    
    // Ejecutar sincronización inmediata
    this.performSync();
    
    // Programar sincronización periódica
    cron.schedule(`*/${SYNC_INTERVAL_MINUTES} * * * *`, () => {
      this.performSync();
    });
  }

  stop() {
    console.log('⏹️ Deteniendo sincronización automática');
    this.syncService.close();
  }
}

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n👋 Deteniendo sincronización...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Deteniendo sincronización...');
  process.exit(0);
});

// Iniciar sincronización programada
const scheduledSync = new ScheduledSync();
scheduledSync.start();

export default ScheduledSync;
