import { db } from '../config/database-postgres-clean.js';
import LiniscoAPI from '../config/linisco.js';
import StoreManager from '../config/stores.js';

class MultiStoreSyncService {
  constructor() {
    this.storeManager = new StoreManager();
    this.stores = this.storeManager.getStores();
  }

  async syncAllStores(fromDate, toDate) {
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
    
    const results = [];
    const errors = [];
    let totalRecords = 0;

    // Inicializar tiendas primero
    await this.initializeStores();

    for (const store of this.stores) {
      try {
        const result = await this.syncStore(store, fromDate, toDate);
        results.push(result);
        totalRecords += result.recordsProcessed;
        console.log(`✅ ${store.store_name}: ${result.recordsProcessed} registros`);
      } catch (error) {
        console.error(`❌ Error en ${store.store_name}:`, error.message);
        errors.push({
          store: store.store_name,
          error: error.message
        });
      }
    }

    console.log(`📊 Sincronización completada: ${totalRecords} registros totales`);
    
    return {
      success: errors.length === 0,
      totalRecords,
      results,
      errors
    };
  }

  async initializeStores() {
    try {
      const insertStore = db.prepare(`
        INSERT INTO stores (store_id, store_name, email, password) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (store_id) DO UPDATE SET
          store_name = EXCLUDED.store_name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const store of this.stores) {
        await insertStore.run(
          store.store_id, 
          store.store_name, 
          store.email, 
          store.password
        );
      }

      console.log(`✅ ${this.stores.length} tiendas inicializadas`);
    } catch (error) {
      console.error('❌ Error inicializando tiendas:', error);
      throw error;
    }
  }

  async syncStore(storeConfig, fromDate, toDate) {
    const api = new LiniscoAPI(storeConfig);
    let recordsProcessed = 0;

    try {
      console.log(`🔄 Sincronizando ${storeConfig.store_name}...`);

      // Autenticar
      const userData = await api.authenticate();
      console.log(`✅ Autenticado: ${userData.email}`);

      // Obtener sesiones
      const sessions = await api.getSessions(fromDate, toDate);
      console.log(`📊 ${sessions.length} sesiones encontradas`);

      // Procesar cada sesión
      for (const session of sessions) {
        try {
          // Insertar orden
          const orderId = `${storeConfig.store_id}_${session.idSession}`;
          await db.prepare(`
            INSERT INTO sale_orders (id, store_id, order_date, total, discount, payment_method)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
              total = EXCLUDED.total,
              discount = EXCLUDED.discount,
              payment_method = EXCLUDED.payment_method
          `).run(
            orderId,
            storeConfig.store_id,
            session.checkin,
            session.total_invoiced || 0,
            session.discount || 0,
            'cash'
          );

          // Obtener productos de la sesión
          const products = await api.getSessionProducts(session.idSession);
          
          // Insertar productos
          for (const product of products) {
            await db.prepare(`
              INSERT INTO sale_products (id_sale_order, store_id, name, fixed_name, quantity, sale_price)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (id_sale_order, store_id, name) DO UPDATE SET
                quantity = EXCLUDED.quantity,
                sale_price = EXCLUDED.sale_price
            `).run(
              orderId,
              storeConfig.store_id,
              product.name || 'Producto sin nombre',
              product.name?.toLowerCase().replace(/\s+/g, '-') || 'producto-sin-nombre',
              product.quantity || 1,
              product.price || 0
            );
          }

          recordsProcessed += products.length;
        } catch (error) {
          console.warn(`⚠️ Error procesando sesión ${session.idSession}:`, error.message);
        }
      }

      return {
        store: storeConfig.store_name,
        recordsProcessed,
        sessions: sessions.length
      };

    } catch (error) {
      console.error(`❌ Error sincronizando ${storeConfig.store_name}:`, error);
      throw error;
    }
  }
}

export default MultiStoreSyncService;
