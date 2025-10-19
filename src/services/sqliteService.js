import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SqliteService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/linisco_dashboard.db');
  }

  // Conectar a la base de datos SQLite
  async connect() {
    try {
      // Crear directorio de datos si no existe
      const fs = await import('fs');
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      console.log('✅ Conectado a SQLite');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a SQLite:', error.message);
      return false;
    }
  }

  // Crear tablas si no existen
  async createTables() {
    try {
      // Tabla de órdenes de venta
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sale_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id TEXT UNIQUE,
          store_id TEXT,
          order_number TEXT,
          order_date DATETIME,
          payment_method TEXT,
          total REAL,
          discount REAL DEFAULT 0,
          customer_name TEXT,
          user_email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear índices
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id);
        CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date);
        CREATE INDEX IF NOT EXISTS idx_sale_orders_user_email ON sale_orders(user_email);
      `);

      // Tabla de productos de venta
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sale_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT,
          order_id TEXT,
          name TEXT,
          quantity INTEGER,
          price REAL,
          total REAL,
          user_email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear índices
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sale_products_order_id ON sale_products(order_id);
        CREATE INDEX IF NOT EXISTS idx_sale_products_user_email ON sale_products(user_email);
      `);

      // Tabla de sesiones
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE,
          store_id TEXT,
          start_time DATETIME,
          end_time DATETIME,
          status TEXT,
          user_email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear índices
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_sessions_store_id ON sessions(store_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);
      `);

      // Tabla de usuarios
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE,
          store_id TEXT,
          store_name TEXT,
          active BOOLEAN DEFAULT 1,
          last_sync DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear índices
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
      `);

      console.log('✅ Tablas SQLite creadas/verificadas correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error creando tablas SQLite:', error.message);
      return false;
    }
  }

  // Sincronizar órdenes de venta
  async syncSaleOrders(orders, userEmail) {
    try {
      if (!orders || orders.length === 0) return { success: true, synced: 0 };

      let synced = 0;
      for (const order of orders) {
        try {
          await this.db.run(`
            INSERT OR REPLACE INTO sale_orders 
            (order_id, store_id, order_number, order_date, payment_method, total, discount, customer_name, user_email, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            order.id || order.order_id,
            order.store_id,
            order.order_number,
            order.order_date ? new Date(order.order_date).toISOString() : null,
            order.payment_method,
            order.total || 0,
            order.discount || 0,
            order.customer_name || '',
            userEmail
          ]);
          synced++;
        } catch (error) {
          console.error(`❌ Error sincronizando orden ${order.id}:`, error.message);
        }
      }

      console.log(`✅ Sincronizadas ${synced} órdenes de venta para ${userEmail}`);
      return { success: true, synced };
    } catch (error) {
      console.error('❌ Error sincronizando órdenes:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar productos de venta
  async syncSaleProducts(products, userEmail) {
    try {
      if (!products || products.length === 0) return { success: true, synced: 0 };

      let synced = 0;
      for (const product of products) {
        try {
          await this.db.run(`
            INSERT OR REPLACE INTO sale_products 
            (product_id, order_id, name, quantity, price, total, user_email, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            product.id || product.product_id,
            product.order_id,
            product.name || '',
            product.quantity || 0,
            product.price || 0,
            product.total || 0,
            userEmail
          ]);
          synced++;
        } catch (error) {
          console.error(`❌ Error sincronizando producto ${product.id}:`, error.message);
        }
      }

      console.log(`✅ Sincronizados ${synced} productos de venta para ${userEmail}`);
      return { success: true, synced };
    } catch (error) {
      console.error('❌ Error sincronizando productos:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar sesiones
  async syncSessions(sessions, userEmail) {
    try {
      if (!sessions || sessions.length === 0) return { success: true, synced: 0 };

      let synced = 0;
      for (const session of sessions) {
        try {
          await this.db.run(`
            INSERT OR REPLACE INTO sessions 
            (session_id, store_id, start_time, end_time, status, user_email, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `, [
            session.id || session.session_id,
            session.store_id,
            session.start_time ? new Date(session.start_time).toISOString() : null,
            session.end_time ? new Date(session.end_time).toISOString() : null,
            session.status || '',
            userEmail
          ]);
          synced++;
        } catch (error) {
          console.error(`❌ Error sincronizando sesión ${session.id}:`, error.message);
        }
      }

      console.log(`✅ Sincronizadas ${synced} sesiones para ${userEmail}`);
      return { success: true, synced };
    } catch (error) {
      console.error('❌ Error sincronizando sesiones:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar usuario
  async syncUser(user) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO users (email, store_id, store_name, active, last_sync, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [user.email, user.storeId, user.storeName, user.active ? 1 : 0]);

      console.log(`✅ Usuario sincronizado: ${user.email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error sincronizando usuario ${user.email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener estadísticas desde la base de datos
  async getStatsFromDB(fromDate, toDate, userEmail = null) {
    try {
      let whereClause = 'WHERE order_date BETWEEN ? AND ?';
      let params = [fromDate, toDate];

      if (userEmail) {
        whereClause += ' AND user_email = ?';
        params.push(userEmail);
      }

      // Obtener estadísticas de órdenes
      const orders = await this.db.all(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total - COALESCE(discount, 0)) as total_revenue,
          AVG(total - COALESCE(discount, 0)) as average_order_value,
          payment_method,
          store_id,
          user_email
        FROM sale_orders 
        ${whereClause}
        GROUP BY payment_method, store_id, user_email
      `, params);

      // Obtener desglose por método de pago
      const paymentBreakdown = await this.db.all(`
        SELECT 
          CASE 
            WHEN payment_method IN ('cash', 'cc_pedidosyaft') THEN 'Efectivo'
            WHEN payment_method IN ('cc_rappiol', 'cc_pedidosyaol') THEN 'Apps'
            ELSE 'Otros'
          END as payment_category,
          COUNT(*) as order_count,
          SUM(total - COALESCE(discount, 0)) as total_amount
        FROM sale_orders 
        ${whereClause}
        GROUP BY payment_category
      `, params);

      // Obtener desglose por tienda
      const storeBreakdown = await this.db.all(`
        SELECT 
          store_id,
          COUNT(*) as order_count,
          SUM(total - COALESCE(discount, 0)) as total_amount
        FROM sale_orders 
        ${whereClause}
        GROUP BY store_id
        ORDER BY total_amount DESC
      `, params);

      // Calcular totales
      const totalOrders = orders.reduce((sum, order) => sum + parseInt(order.total_orders), 0);
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_revenue || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return {
        success: true,
        data: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          paymentBreakdown: paymentBreakdown.map(p => ({
            payment_category: p.payment_category,
            order_count: parseInt(p.order_count),
            total_amount: parseFloat(p.total_amount)
          })),
          storeBreakdown: storeBreakdown.map(s => ({
            store_id: s.store_id,
            order_count: parseInt(s.order_count),
            total_amount: parseFloat(s.total_amount)
          }))
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de SQLite:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener órdenes desde la base de datos
  async getOrdersFromDB(fromDate, toDate, userEmail = null) {
    try {
      let whereClause = 'WHERE order_date BETWEEN ? AND ?';
      let params = [fromDate, toDate];

      if (userEmail) {
        whereClause += ' AND user_email = ?';
        params.push(userEmail);
      }

      const orders = await this.db.all(`
        SELECT * FROM sale_orders 
        ${whereClause}
        ORDER BY order_date DESC
      `, params);

      return { success: true, data: orders };
    } catch (error) {
      console.error('❌ Error obteniendo órdenes de SQLite:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener estado de sincronización
  async getSyncStatus() {
    try {
      const users = await this.db.all(`
        SELECT 
          email,
          store_name,
          last_sync,
          (SELECT COUNT(*) FROM sale_orders WHERE user_email = users.email) as orders_count,
          (SELECT COUNT(*) FROM sale_products WHERE user_email = users.email) as products_count,
          (SELECT COUNT(*) FROM sessions WHERE user_email = users.email) as sessions_count
        FROM users 
        WHERE active = 1
        ORDER BY last_sync DESC
      `);

      return {
        success: true,
        data: {
          initialized: true,
          users: users.map(user => ({
            email: user.email,
            store_name: user.store_name,
            last_sync: user.last_sync,
            orders_count: parseInt(user.orders_count),
            products_count: parseInt(user.products_count),
            sessions_count: parseInt(user.sessions_count)
          }))
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado de sincronización:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Limpiar datos antiguos
  async cleanOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const ordersResult = await this.db.run(
        'DELETE FROM sale_orders WHERE order_date < ?',
        [cutoffDate.toISOString()]
      );

      const productsResult = await this.db.run(
        'DELETE FROM sale_products WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      const sessionsResult = await this.db.run(
        'DELETE FROM sessions WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      console.log(`✅ Datos antiguos limpiados: ${ordersResult.changes} órdenes, ${productsResult.changes} productos, ${sessionsResult.changes} sesiones`);

      return {
        success: true,
        data: {
          orders_deleted: ordersResult.changes,
          products_deleted: productsResult.changes,
          sessions_deleted: sessionsResult.changes
        }
      };
    } catch (error) {
      console.error('❌ Error limpiando datos antiguos:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Cerrar conexión
  async close() {
    if (this.db) {
      await this.db.close();
      console.log('✅ Conexión a SQLite cerrada');
    }
  }
}

export default SqliteService;
