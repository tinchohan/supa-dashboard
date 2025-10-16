import { db } from '../config/database.js';
import LiniscoAPI from '../config/linisco.js';
import fs from 'fs';
import path from 'path';

class SyncService {
  constructor() {
    this.liniscoAPI = new LiniscoAPI();
    this.initializeDatabase();
  }

  initializeDatabase() {
    try {
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
          db.exec(statement);
        }
      });

      console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error.message);
      throw error;
    }
  }

  async authenticate() {
    try {
      const userData = await this.liniscoAPI.authenticate();
      
      // Guardar usuario en la base de datos
      const insertUser = db.prepare(`
        INSERT OR REPLACE INTO users (
          linisco_id, email, created_at, updated_at, 
          authentication_token, roles_mask, brand_id, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      insertUser.run(
        userData.id,
        userData.email,
        userData.created_at,
        userData.updated_at,
        userData.authentication_token,
        userData.roles_mask,
        userData.brand_id
      );

      console.log('✅ Usuario autenticado y guardado');
      return userData;
    } catch (error) {
      console.error('❌ Error en autenticación:', error.message);
      throw error;
    }
  }

  async syncSessions(fromDate, toDate) {
    try {
      console.log(`🔄 Sincronizando sesiones desde ${fromDate} hasta ${toDate}`);
      
      const sessions = await this.liniscoAPI.getSessions(fromDate, toDate);
      
      const insertSession = db.prepare(`
        INSERT OR REPLACE INTO sessions (
          linisco_id, shop_number, user_id, username, checkin, checkout,
          initial_cash, cash, cd_visa, cc_maestro, cc_amex, cc_cabal,
          cc_naranja, cc_diners, cc_nativa, cc_argencard, cc_mcdebit,
          in_total, cd_maestro, cd_cabal, cc_visa, total_invoiced, real_invoiced,
          synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      let syncedCount = 0;
      for (const session of sessions) {
        insertSession.run(
          session.idSession,
          session.shopNumber,
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
        syncedCount++;
      }

      console.log(`✅ ${syncedCount} sesiones sincronizadas`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Error sincronizando sesiones:', error.message);
      throw error;
    }
  }

  async syncSaleOrders(fromDate, toDate) {
    try {
      console.log(`🔄 Sincronizando órdenes de venta desde ${fromDate} hasta ${toDate}`);
      
      const orders = await this.liniscoAPI.getSaleOrders(fromDate, toDate);
      
      const insertOrder = db.prepare(`
        INSERT OR REPLACE INTO sale_orders (
          linisco_id, shop_number, id_sale_order, id_customer, number,
          order_date, id_session, payment_method, total, discount, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      let syncedCount = 0;
      for (const order of orders) {
        insertOrder.run(
          order.id,
          order.shopNumber,
          order.idSaleOrder,
          order.idCustomer,
          order.number,
          order.orderDate,
          order.idSession,
          order.paymentmethod,
          order.total,
          order.discount
        );
        syncedCount++;
      }

      console.log(`✅ ${syncedCount} órdenes de venta sincronizadas`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Error sincronizando órdenes de venta:', error.message);
      throw error;
    }
  }

  async syncSaleProducts(fromDate, toDate) {
    try {
      console.log(`🔄 Sincronizando productos vendidos desde ${fromDate} hasta ${toDate}`);
      
      const products = await this.liniscoAPI.getSaleProducts(fromDate, toDate);
      
      const insertProduct = db.prepare(`
        INSERT OR REPLACE INTO sale_products (
          linisco_id, shop_number, id_sale_product, id_sale_order,
          id_product, id_control_sheet_def, name, fixed_name,
          quantity, sale_price, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      let syncedCount = 0;
      for (const product of products) {
        insertProduct.run(
          product.idSaleProduct,
          product.shopNumber,
          product.idSaleProduct,
          product.idSaleOrder,
          product.idProduct,
          product.idControlSheetDef,
          product.name,
          product.fixed_name,
          product.quantity,
          product.salePrice
        );
        syncedCount++;
      }

      console.log(`✅ ${syncedCount} productos vendidos sincronizados`);
      return syncedCount;
    } catch (error) {
      console.error('❌ Error sincronizando productos vendidos:', error.message);
      throw error;
    }
  }

  async syncSaleCombos(orderIds) {
    try {
      console.log(`🔄 Sincronizando combos para órdenes: ${orderIds.join(', ')}`);
      
      let totalSynced = 0;
      for (const orderId of orderIds) {
        const combos = await this.liniscoAPI.getSaleCombos(orderId);
        
        const insertCombo = db.prepare(`
          INSERT OR REPLACE INTO sale_combos (
            linisco_id, shop_number, id_sale_combo, id_sale_order,
            id_combo, name, quantity, sale_price, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        for (const combo of combos) {
          insertCombo.run(
            combo.idSaleCombo,
            combo.shopNumber,
            combo.idSaleCombo,
            combo.idSaleOrder,
            combo.idCombo,
            combo.name,
            combo.quantity,
            combo.salePrice
          );
          totalSynced++;
        }
      }

      console.log(`✅ ${totalSynced} combos sincronizados`);
      return totalSynced;
    } catch (error) {
      console.error('❌ Error sincronizando combos:', error.message);
      throw error;
    }
  }

  async fullSync(fromDate, toDate) {
    try {
      console.log(`🚀 Iniciando sincronización completa desde ${fromDate} hasta ${toDate}`);
      
      // Registrar inicio de sincronización
      const insertSyncLog = db.prepare(`
        INSERT INTO sync_log (sync_type, start_date, end_date, status, started_at)
        VALUES (?, ?, ?, 'running', CURRENT_TIMESTAMP)
      `);
      
      const syncLogId = insertSyncLog.run('full_sync', fromDate, toDate).lastInsertRowid;
      
      let totalRecords = 0;
      
      try {
        // Autenticar
        await this.authenticate();
        
        // Sincronizar sesiones
        const sessionsCount = await this.syncSessions(fromDate, toDate);
        totalRecords += sessionsCount;
        
        // Sincronizar órdenes de venta
        const ordersCount = await this.syncSaleOrders(fromDate, toDate);
        totalRecords += ordersCount;
        
        // Sincronizar productos vendidos
        const productsCount = await this.syncSaleProducts(fromDate, toDate);
        totalRecords += productsCount;
        
        // Obtener IDs de órdenes para sincronizar combos
        const orderIds = db.prepare(`
          SELECT DISTINCT id_sale_order FROM sale_orders 
          WHERE DATE(order_date) BETWEEN ? AND ?
        `).all(fromDate, toDate).map(row => row.id_sale_order);
        
        if (orderIds.length > 0) {
          const combosCount = await this.syncSaleCombos(orderIds);
          totalRecords += combosCount;
        }
        
        // Actualizar log de sincronización
        const updateSyncLog = db.prepare(`
          UPDATE sync_log 
          SET status = 'completed', records_synced = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateSyncLog.run(totalRecords, syncLogId);
        
        console.log(`✅ Sincronización completa finalizada. ${totalRecords} registros sincronizados`);
        return { success: true, recordsSynced: totalRecords };
        
      } catch (error) {
        // Actualizar log con error
        const updateSyncLog = db.prepare(`
          UPDATE sync_log 
          SET status = 'error', error_message = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `);
        updateSyncLog.run(error.message, syncLogId);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Error en sincronización completa:', error.message);
      throw error;
    }
  }

  // Métodos para consultar datos
  getSessions(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE DATE(checkin) BETWEEN ? AND ?
      ORDER BY checkin DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getSaleOrders(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT * FROM sale_orders 
      WHERE DATE(order_date) BETWEEN ? AND ?
      ORDER BY order_date DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getSaleProducts(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT sp.*, so.order_date 
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ORDER BY so.order_date DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getSalesSummary(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT sp.id) as total_products,
        COUNT(DISTINCT sc.id) as total_combos,
        SUM(so.total) as total_revenue,
        AVG(so.total) as avg_order_value
      FROM sale_orders so
      LEFT JOIN sale_products sp ON so.id_sale_order = sp.id_sale_order
      LEFT JOIN sale_combos sc ON so.id_sale_order = sc.id_sale_order
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `);
    return stmt.get(fromDate, toDate);
  }

  close() {
    db.close();
  }
}

export default SyncService;
