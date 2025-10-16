import { db as sqliteDb, initializeDatabase } from '../config/database-postgres.js';
import { db } from '../config/database.js';
import LiniscoAPI from '../config/linisco.js';
import StoreManager from '../config/stores.js';
import fs from 'fs';
import path from 'path';

class MultiStoreSyncService {
  constructor() {
    this.storeManager = new StoreManager();
    this.stores = this.storeManager.getStores();
    
    // Determinar qué base de datos usar
    this.isProduction = process.env.NODE_ENV === 'production';
    this.dbToUse = this.isProduction ? sqliteDb : db;
    
    this.initializeDatabase();
    this.initializeStores();
  }

  async initializeDatabase() {
    try {
      if (this.isProduction) {
        // En producción, usar PostgreSQL
        console.log('🔧 Inicializando PostgreSQL para sincronización...');
        await initializeDatabase();
        console.log('✅ PostgreSQL inicializado para sincronización');
      } else {
        // En desarrollo, usar SQLite
        console.log('🔧 Inicializando SQLite para sincronización...');
        
        // Deshabilitar temporalmente las restricciones de clave foránea
        this.dbToUse.pragma('foreign_keys = OFF');
        
        // Leer y ejecutar el esquema SQL
        const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Dividir el esquema en declaraciones individuales
        const statements = schema
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);

        // Ejecutar cada declaración
        statements.forEach(statement => {
          if (statement.trim()) {
            this.dbToUse.exec(statement);
          }
        });

        // Rehabilitar las restricciones de clave foránea
        this.dbToUse.pragma('foreign_keys = ON');

        console.log('✅ SQLite inicializado para sincronización');
      }
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error.message);
      throw error;
    }
  }

  initializeStores() {
    try {
      const insertStore = this.dbToUse.prepare(`
        INSERT OR REPLACE INTO stores (store_id, store_name, email, is_active, updated_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
      `);

      this.stores.forEach(store => {
        insertStore.run(store.store_id, store.store_name, store.email);
      });

      console.log(`✅ ${this.stores.length} tiendas inicializadas en la base de datos`);
    } catch (error) {
      console.error('❌ Error inicializando tiendas:', error.message);
      throw error;
    }
  }

  async syncStore(storeConfig, fromDate, toDate) {
    const api = new LiniscoAPI(storeConfig);
    let totalRecords = 0;

    try {
      console.log(`🔄 Sincronizando ${storeConfig.store_name} (${storeConfig.store_id})...`);

      // Deshabilitar restricciones de clave foránea temporalmente
      this.dbToUse.pragma('foreign_keys = OFF');

      // Autenticar
      const userData = await api.authenticate();
      
      // Guardar usuario en la base de datos (evitar duplicados)
      const insertUser = this.dbToUse.prepare(`
        INSERT OR IGNORE INTO users (
          linisco_id, email, store_id, created_at, updated_at, 
          authentication_token, roles_mask, brand_id, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      insertUser.run(
        userData.id,
        userData.email,
        storeConfig.store_id,
        userData.created_at,
        userData.updated_at,
        userData.authentication_token,
        userData.roles_mask,
        userData.brand_id
      );

      console.log(`✅ Usuario ${userData.email} guardado con token: ${userData.authentication_token.substring(0, 10)}...`);

      // Sincronizar sesiones
      console.log(`   📊 Obteniendo sesiones para ${storeConfig.store_name}...`);
      const sessions = await api.getSessions(fromDate, toDate);
      console.log(`   📊 ${sessions.length} sesiones encontradas`);
      
      const insertSession = this.dbToUse.prepare(`
        INSERT OR IGNORE INTO sessions (
          linisco_id, shop_number, store_id, user_id, username, checkin, checkout,
          initial_cash, cash, cd_visa, cc_maestro, cc_amex, cc_cabal,
          cc_naranja, cc_diners, cc_nativa, cc_argencard, cc_mcdebit,
          in_total, cd_maestro, cd_cabal, cc_visa, total_invoiced, real_invoiced,
          synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const session of sessions) {
        try {
          insertSession.run(
            session.idSession,
            session.shopNumber,
            storeConfig.store_id,
            session.idUser,
            session.username,
            session.checkin,
            session.checkout,
            session.initialCash,
            session.cash,
            session.cd_visa,
            session.cc_maestro,
            session.cc_amex,
            session.cc_cabal,
            session.cc_naranja,
            session.cc_diners,
            session.cc_nativa,
            session.cc_argencard,
            session.cc_mcdebit,
            session.in_total,
            session.cd_maestro,
            session.cd_cabal,
            session.cc_visa,
            session.totalInvoiced,
            session.realInvoiced
          );
          totalRecords++;
        } catch (sessionError) {
          console.error(`   ❌ Error insertando sesión ${session.idSession}:`, sessionError.message);
          throw sessionError;
        }
      }

      // Sincronizar órdenes de venta
      console.log(`   📊 Obteniendo órdenes para ${storeConfig.store_name}...`);
      const orders = await api.getSaleOrders(fromDate, toDate);
      console.log(`   📊 ${orders.length} órdenes encontradas`);
      
      const insertOrder = this.dbToUse.prepare(`
        INSERT OR IGNORE INTO sale_orders (
          linisco_id, shop_number, store_id, id_sale_order, id_customer, number,
          order_date, id_session, payment_method, total, discount, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const order of orders) {
        try {
          insertOrder.run(
            order.id,
            order.shopNumber,
            storeConfig.store_id,
            order.idSaleOrder,
            order.idCustomer,
            order.number,
            order.orderDate,
            order.idSession,
            order.paymentmethod,
            order.total,
            order.discount
          );
          totalRecords++;
        } catch (orderError) {
          console.error(`   ❌ Error insertando orden ${order.id}:`, orderError.message);
          throw orderError;
        }
      }

      // Sincronizar productos vendidos
      console.log(`   📊 Obteniendo productos para ${storeConfig.store_name}...`);
      const products = await api.getSaleProducts(fromDate, toDate);
      console.log(`   📊 ${products.length} productos encontrados`);
      
      const insertProduct = this.dbToUse.prepare(`
        INSERT OR IGNORE INTO sale_products (
          linisco_id, shop_number, store_id, id_sale_product, id_sale_order,
          id_product, id_control_sheet_def, name, fixed_name,
          quantity, sale_price, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      for (const product of products) {
        try {
          insertProduct.run(
            product.idSaleProduct,
            product.shopNumber,
            storeConfig.store_id,
            product.idSaleProduct,
            product.idSaleOrder,
            product.idProduct,
            product.idControlSheetDef,
            product.name,
            product.fixed_name,
            product.quantity,
            product.salePrice
          );
          totalRecords++;
        } catch (productError) {
          console.error(`   ❌ Error insertando producto ${product.idSaleProduct}:`, productError.message);
          throw productError;
        }
      }

      // Combos vendidos eliminados - no son necesarios

      console.log(`✅ ${storeConfig.store_name}: ${totalRecords} registros sincronizados`);
      return { success: true, store: storeConfig.store_name, records: totalRecords };

    } catch (error) {
      console.error(`❌ Error sincronizando ${storeConfig.store_name}:`, error.message);
      return { success: false, store: storeConfig.store_name, error: error.message };
    } finally {
      // Rehabilitar restricciones de clave foránea
      this.dbToUse.pragma('foreign_keys = ON');
    }
  }

  async syncAllStores(fromDate, toDate) {
    try {
      console.log(`🚀 Iniciando sincronización SECUENCIAL de ${this.stores.length} tiendas desde ${fromDate} hasta ${toDate}`);
      
      const results = [];
      const errors = [];

      // Procesar tiendas UNA POR UNA para evitar conflictos
      for (let i = 0; i < this.stores.length; i++) {
        const store = this.stores[i];
        
        console.log(`📦 Procesando tienda ${i + 1}/${this.stores.length}: ${store.store_name}`);
        
        try {
          const result = await this.syncStore(store, fromDate, toDate);
          
          if (result.success) {
            results.push(result);
            console.log(`✅ ${store.store_name} completada: ${result.records} registros`);
          } else {
            errors.push(result);
            console.log(`❌ ${store.store_name} falló: ${result.error}`);
          }
        } catch (error) {
          const errorResult = {
            success: false,
            store: store.store_name,
            error: error.message
          };
          errors.push(errorResult);
          console.log(`❌ ${store.store_name} falló: ${error.message}`);
        }

        // Pausa entre tiendas para evitar sobrecarga
        if (i < this.stores.length - 1) {
          console.log(`⏳ Esperando 2 segundos antes de la siguiente tienda...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Registrar log de sincronización
      const insertSyncLog = this.dbToUse.prepare(`
        INSERT INTO sync_log (sync_type, start_date, end_date, status, records_synced, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      const totalRecords = results.reduce((sum, result) => sum + result.records, 0);
      const status = errors.length === 0 ? 'completed' : 'partial';

      insertSyncLog.run('multi_store_sync', fromDate, toDate, status, totalRecords);

      // Mostrar resumen
      console.log('\n📊 RESUMEN DE SINCRONIZACIÓN:');
      console.log(`   • Tiendas procesadas: ${this.stores.length}`);
      console.log(`   • Sincronizaciones exitosas: ${results.length}`);
      console.log(`   • Errores: ${errors.length}`);
      console.log(`   • Total de registros: ${totalRecords}`);

      if (results.length > 0) {
        console.log('\n✅ TIENDAS EXITOSAS:');
        results.forEach(result => {
          console.log(`   • ${result.store}: ${result.records} registros`);
        });
      }

      if (errors.length > 0) {
        console.log('\n❌ TIENDAS CON ERRORES:');
        errors.forEach(error => {
          console.log(`   • ${error.store}: ${error.error}`);
        });
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        totalRecords
      };

    } catch (error) {
      console.error('❌ Error en sincronización masiva:', error.message);
      throw error;
    }
  }

  async syncStoreById(storeId, fromDate, toDate) {
    const store = this.storeManager.getStoreById(storeId);
    if (!store) {
      throw new Error(`Tienda con ID ${storeId} no encontrada`);
    }

    return await this.syncStore(store, fromDate, toDate);
  }

  // Métodos para consultar datos por tienda
  getStoresSummary(fromDate, toDate) {
    const stmt = this.dbToUse.prepare(`
      SELECT 
        s.store_id,
        s.store_name,
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT sp.id) as total_products,
        COUNT(DISTINCT sc.id) as total_combos,
        SUM(so.total) as total_revenue,
        AVG(so.total) as avg_order_value
      FROM stores s
      LEFT JOIN sale_orders so ON s.store_id = so.store_id AND DATE(so.order_date) BETWEEN ? AND ?
      LEFT JOIN sale_products sp ON so.linisco_id = sp.id_sale_order
      LEFT JOIN sale_combos sc ON so.linisco_id = sc.id_sale_order
      GROUP BY s.store_id, s.store_name
      ORDER BY total_revenue DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getStoreSales(storeId, fromDate, toDate) {
    const stmt = this.dbToUse.prepare(`
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT sp.id) as total_products,
        COUNT(DISTINCT sc.id) as total_combos,
        SUM(so.total) as total_revenue,
        AVG(so.total) as avg_order_value
      FROM sale_orders so
      LEFT JOIN sale_products sp ON so.linisco_id = sp.id_sale_order
      LEFT JOIN sale_combos sc ON so.linisco_id = sc.id_sale_order
      WHERE so.store_id = ? AND DATE(so.order_date) BETWEEN ? AND ?
    `);
    return stmt.get(storeId, fromDate, toDate);
  }

  getTopProductsByStore(storeId, limit = 10, fromDate = null, toDate = null) {
    let query = `
      SELECT 
        sp.name,
        sp.fixed_name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue,
        AVG(sp.sale_price) as avg_price
      FROM sale_products sp
      WHERE sp.store_id = ?
    `;
    
    const params = [storeId];
    
    if (fromDate && toDate) {
      query += ` AND DATE(sp.synced_at) BETWEEN ? AND ?`;
      params.push(fromDate, toDate);
    }
    
    query += `
      GROUP BY sp.name, sp.fixed_name
      ORDER BY times_sold DESC
      LIMIT ?
    `;
    
    params.push(limit);
    
    const stmt = this.dbToUse.prepare(query);
    return stmt.all(...params);
  }

  close() {
    this.dbToUse.close();
  }
}

export default MultiStoreSyncService;
