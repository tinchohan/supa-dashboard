import { db as postgresDb, initializeDatabase } from '../config/database-postgres-clean.js';
import { db as sqliteDb } from '../config/database.js';
import LiniscoAPI from '../config/linisco.js';
import StoreManager from '../config/stores.js';

class MultiStoreSyncService {
  constructor() {
    this.storeManager = new StoreManager();
    this.stores = this.storeManager.getStores();
    
    // Determinar qué base de datos usar (detección robusta como en el servidor)
    this.isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.RAILWAY_ENVIRONMENT || 
                       process.env.RAILWAY_PROJECT_ID ||
                       process.env.DATABASE_URL?.includes('postgres') ||
                       process.env.DATABASE_URL?.includes('railway');
    this.dbToUse = this.isProduction ? postgresDb : sqliteDb;
    
    console.log('🔍 Configuración de sincronización:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');
    console.log('- Es producción:', this.isProduction);
    console.log('- Base de datos:', this.isProduction ? 'PostgreSQL' : 'SQLite');
  }

  async syncAllStores(fromDate, toDate) {
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
    console.log(`📊 Tiendas a sincronizar: ${this.stores.length}`);
    
    const results = [];
    const errors = [];
    let totalRecords = 0;

    // Inicializar tiendas primero
    console.log('🔧 Inicializando tiendas...');
    await this.initializeStores();
    console.log('✅ Tiendas inicializadas');

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
      // Inicializar PostgreSQL si estamos en producción
      if (this.isProduction) {
        console.log('🔧 Inicializando PostgreSQL para sincronización...');
        await initializeDatabase();
        console.log('✅ PostgreSQL inicializado para sincronización');
        
        // Verificar que las tablas existen
        const tables = await this.dbToUse.prepare(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('stores', 'sale_orders', 'sale_products')
        `).all();
        console.log('📊 Tablas disponibles:', tables.map(t => t.table_name));
      }

      console.log('🔧 Insertando/actualizando tiendas...');
      
      // Usar esquema diferente según la base de datos
      let insertStore;
      if (this.isProduction) {
        // PostgreSQL - incluye password
        insertStore = this.dbToUse.prepare(`
          INSERT INTO stores (store_id, store_name, email, password) 
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (store_id) DO UPDATE SET
            store_name = EXCLUDED.store_name,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            updated_at = CURRENT_TIMESTAMP
        `);
      } else {
        // SQLite - sin password
        insertStore = this.dbToUse.prepare(`
          INSERT INTO stores (store_id, store_name, email) 
          VALUES (?, ?, ?)
          ON CONFLICT (store_id) DO UPDATE SET
            store_name = EXCLUDED.store_name,
            email = EXCLUDED.email,
            updated_at = CURRENT_TIMESTAMP
        `);
      }

      for (const store of this.stores) {
        console.log(`  📝 Procesando tienda: ${store.store_name} (${store.store_id})`);
        if (this.isProduction) {
          // PostgreSQL - incluye password
          await insertStore.run(
            store.store_id, 
            store.store_name, 
            store.email, 
            store.password
          );
        } else {
          // SQLite - sin password
          await insertStore.run(
            store.store_id, 
            store.store_name, 
            store.email
          );
        }
      }

      console.log(`✅ ${this.stores.length} tiendas inicializadas`);
    } catch (error) {
      console.error('❌ Error inicializando tiendas:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  async syncStore(storeConfig, fromDate, toDate) {
    const api = new LiniscoAPI(storeConfig);
    let recordsProcessed = 0;

    try {
      console.log(`🔄 Sincronizando ${storeConfig.store_name} (${storeConfig.store_id})...`);

      // Autenticar
      console.log(`🔐 Autenticando con ${storeConfig.email}...`);
      const userData = await api.authenticate();
      console.log(`✅ Autenticado: ${userData.email}`);

          // Obtener sesiones
          const sessions = await api.getSessions(fromDate, toDate);
          console.log(`📊 ${sessions.length} sesiones encontradas`);
          console.log(`📋 Datos de sesiones:`, JSON.stringify(sessions, null, 2));

      // Procesar cada sesión
      for (const session of sessions) {
        try {
          // Insertar orden
          const orderId = `${storeConfig.store_id}_${session.idSession}`;
          console.log(`  📝 Insertando orden: ${orderId}`);
          console.log(`  📊 Datos de orden:`, {
            orderId,
            storeId: storeConfig.store_id,
            checkin: session.checkin,
            total: session.total_invoiced || 0,
            discount: session.discount || 0
          });
          
          let orderResult;
          if (this.isProduction) {
            // PostgreSQL - esquema simplificado
            orderResult = await this.dbToUse.prepare(`
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
          } else {
            // SQLite - esquema completo
            orderResult = await this.dbToUse.prepare(`
              INSERT INTO sale_orders (linisco_id, shop_number, store_id, id_sale_order, order_date, id_session, payment_method, total, discount)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT (linisco_id) DO UPDATE SET
                total = EXCLUDED.total,
                discount = EXCLUDED.discount,
                payment_method = EXCLUDED.payment_method
            `).run(
              session.idSession,
              session.shopNumber,
              storeConfig.store_id,
              session.idSession,
              session.checkin,
              session.idSession,
              'cash',
              session.total_invoiced || 0,
              session.discount || 0
            );
          }
          console.log(`  ✅ Orden insertada:`, orderResult);

          // Obtener órdenes de la sesión y luego sus productos
          console.log(`  📦 Obteniendo órdenes para sesión ${session.idSession}...`);
          
          // Obtener todas las órdenes del período
          const allOrders = await api.getSaleOrders(fromDate, toDate);
          console.log(`  📊 Total de órdenes en período: ${allOrders.length}`);
          
          // Filtrar órdenes por sesión
          const sessionOrders = allOrders.filter(order => order.idSession === session.idSession);
          console.log(`  📦 ${sessionOrders.length} órdenes encontradas para sesión ${session.idSession}`);
          
          // Obtener productos de todas las órdenes de la sesión
          const allProducts = await api.getSaleProducts(fromDate, toDate);
          const sessionOrderIds = sessionOrders.map(order => order.idSaleOrder);
          const products = allProducts.filter(product => sessionOrderIds.includes(product.idSaleOrder));
          console.log(`  📦 ${products.length} productos encontrados para sesión ${session.idSession}`);
          
          // Insertar productos
          for (const product of products) {
            try {
              console.log(`    📦 Insertando producto: ${product.name}`);
              console.log(`    📊 Datos de producto:`, {
                orderId,
                storeId: storeConfig.store_id,
                name: product.name || 'Producto sin nombre',
                quantity: product.quantity || 1,
                price: product.salePrice || 0
              });
              
              let productResult;
              if (this.isProduction) {
                // PostgreSQL - esquema simplificado
                productResult = await this.dbToUse.prepare(`
                  INSERT INTO sale_products (id_sale_order, store_id, name, fixed_name, quantity, sale_price)
                  VALUES ($1, $2, $3, $4, $5, $6)
                  ON CONFLICT (id_sale_order, store_id, name) DO UPDATE SET
                    quantity = EXCLUDED.quantity,
                    sale_price = EXCLUDED.sale_price
                `                ).run(
                  orderId,
                  storeConfig.store_id,
                  product.name || 'Producto sin nombre',
                  product.name?.toLowerCase().replace(/\s+/g, '-') || 'producto-sin-nombre',
                  product.quantity || 1,
                  product.salePrice || 0
                );
              } else {
                // SQLite - esquema completo
                productResult = await this.dbToUse.prepare(`
                  INSERT INTO sale_products (linisco_id, shop_number, store_id, id_sale_product, id_sale_order, name, fixed_name, quantity, sale_price)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT (linisco_id) DO UPDATE SET
                    quantity = EXCLUDED.quantity,
                    sale_price = EXCLUDED.sale_price
                `                ).run(
                  product.idSaleProduct || Date.now() + Math.random(), // ID único si no existe
                  session.shopNumber,
                  storeConfig.store_id,
                  product.idSaleProduct || Date.now() + Math.random(),
                  session.idSession,
                  product.name || 'Producto sin nombre',
                  product.name?.toLowerCase().replace(/\s+/g, '-') || 'producto-sin-nombre',
                  product.quantity || 1,
                  product.salePrice || 0
                );
              }
              console.log(`    ✅ Producto insertado:`, productResult);
            } catch (productError) {
              console.warn(`    ⚠️ Error insertando producto ${product.name}:`, productError.message);
              console.warn(`    📊 Stack trace:`, productError.stack);
            }
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
