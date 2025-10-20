import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/dashboard.db');
  }

  async connect() {
    try {
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

  async createTables() {
    try {
      // Tabla de tokens de autenticación
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT UNIQUE,
          email TEXT,
          token TEXT,
          token_expires DATETIME,
          last_auth DATETIME,
          auth_status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de órdenes de venta
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sale_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id TEXT UNIQUE,
          store_id TEXT,
          user_email TEXT,
          order_date DATETIME,
          total REAL,
          discount REAL,
          payment_method TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de productos de venta
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sale_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id TEXT,
          store_id TEXT,
          name TEXT,
          price REAL,
          quantity INTEGER,
          total REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de sesiones
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE,
          store_id TEXT,
          user_email TEXT,
          session_date DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear índices
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_auth_tokens_store_id ON auth_tokens(store_id);
        CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id);
        CREATE INDEX IF NOT EXISTS idx_sale_orders_date ON sale_orders(order_date);
        CREATE INDEX IF NOT EXISTS idx_sale_products_order_id ON sale_products(order_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_store_id ON sessions(store_id);
      `);

      console.log('✅ Tablas creadas correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error creando tablas:', error.message);
      return false;
    }
  }

  // Gestión de tokens
  async saveAuthToken(storeId, email, token, expiresAt) {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO auth_tokens 
        (store_id, email, token, token_expires, last_auth, auth_status, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'active', CURRENT_TIMESTAMP)
      `, [storeId, email, token, expiresAt]);

      console.log(`✅ Token guardado para tienda ${storeId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error guardando token:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getAuthToken(storeId) {
    try {
      const result = await this.db.get(`
        SELECT * FROM auth_tokens 
        WHERE store_id = ? AND auth_status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [storeId]);

      if (result && result.token_expires) {
        const expiresAt = new Date(result.token_expires);
        const now = new Date();
        
        if (expiresAt > now) {
          return { success: true, token: result };
        } else {
          await this.updateAuthStatus(storeId, 'expired');
          return { success: false, error: 'Token expirado' };
        }
      }

      return { success: false, error: 'No hay token válido' };
    } catch (error) {
      console.error(`❌ Error obteniendo token:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async updateAuthStatus(storeId, status) {
    try {
      await this.db.run(`
        UPDATE auth_tokens 
        SET auth_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE store_id = ?
      `, [status, storeId]);

      console.log(`✅ Estado actualizado para ${storeId}: ${status}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error actualizando estado:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getAllAuthTokens() {
    try {
      const tokens = await this.db.all(`
        SELECT * FROM auth_tokens
        ORDER BY updated_at DESC
      `);

      return { success: true, tokens };
    } catch (error) {
      console.error('❌ Error obteniendo tokens:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Gestión de datos de ventas
  async saveSaleOrders(orders, userEmail) {
    try {
      let saved = 0;
      for (const order of orders) {
        try {
          await this.db.run(`
            INSERT OR REPLACE INTO sale_orders 
            (order_id, store_id, user_email, order_date, total, discount, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            order.id,
            order.store_id,
            userEmail,
            order.order_date,
            order.total,
            order.discount || 0,
            order.payment_method
          ]);
          saved++;
        } catch (error) {
          console.error(`Error guardando orden ${order.id}:`, error.message);
        }
      }
      return { success: true, saved };
    } catch (error) {
      console.error('❌ Error guardando órdenes:', error.message);
      return { success: false, error: error.message };
    }
  }

  async saveSaleProducts(products, userEmail) {
    try {
      let saved = 0;
      for (const product of products) {
        try {
          await this.db.run(`
            INSERT OR REPLACE INTO sale_products 
            (order_id, store_id, name, price, quantity, total)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            product.order_id,
            product.store_id,
            product.name,
            product.price,
            product.quantity,
            product.total
          ]);
          saved++;
        } catch (error) {
          console.error(`Error guardando producto:`, error.message);
        }
      }
      return { success: true, saved };
    } catch (error) {
      console.error('❌ Error guardando productos:', error.message);
      return { success: false, error: error.message };
    }
  }

  async saveSessions(sessions, userEmail) {
    try {
      let saved = 0;
      for (const session of sessions) {
        try {
          await this.db.run(`
            INSERT OR REPLACE INTO sessions 
            (session_id, store_id, user_email, session_date)
            VALUES (?, ?, ?, ?)
          `, [
            session.id,
            session.store_id,
            userEmail,
            session.session_date
          ]);
          saved++;
        } catch (error) {
          console.error(`Error guardando sesión:`, error.message);
        }
      }
      return { success: true, saved };
    } catch (error) {
      console.error('❌ Error guardando sesiones:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Estadísticas
  async getStats(fromDate, toDate, storeIds = null) {
    try {
      let whereClause = 'WHERE order_date BETWEEN ? AND ?';
      let params = [fromDate, toDate];

      if (storeIds && storeIds.length > 0) {
        const storeIdsStr = storeIds.map(id => `'${id}'`).join(',');
        whereClause += ` AND store_id IN (${storeIdsStr})`;
      }

      // Estadísticas generales
      const generalStats = await this.db.get(`
        SELECT 
          COUNT(*) as totalOrders,
          SUM(total - COALESCE(discount, 0)) as totalRevenue,
          AVG(total - COALESCE(discount, 0)) as averageOrderValue
        FROM sale_orders 
        ${whereClause}
      `, params);

      // Desglose por tienda
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

      // Métodos de pago
      const paymentBreakdown = await this.db.all(`
        SELECT 
          payment_method,
          COUNT(*) as order_count,
          SUM(total - COALESCE(discount, 0)) as total_amount
        FROM sale_orders 
        ${whereClause}
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `, params);

      // Top productos
      const topProducts = await this.db.all(`
        SELECT 
          sp.name,
          SUM(sp.total) as total_revenue,
          COUNT(*) as times_sold
        FROM sale_products sp
        JOIN sale_orders so ON sp.order_id = so.order_id
        ${whereClause.replace('order_date', 'so.order_date')}
        GROUP BY sp.name
        ORDER BY total_revenue DESC
        LIMIT 5
      `, params);

      return {
        success: true,
        data: {
          totalOrders: generalStats.totalOrders || 0,
          totalRevenue: generalStats.totalRevenue || 0,
          averageOrderValue: generalStats.averageOrderValue || 0,
          storeBreakdown: storeBreakdown.map(s => ({
            store_id: s.store_id,
            order_count: s.order_count,
            total_amount: s.total_amount
          })),
          paymentBreakdown: paymentBreakdown.map(p => ({
            payment_category: p.payment_method,
            order_count: p.order_count,
            total_amount: p.total_amount
          })),
          topProducts: topProducts.map(p => ({
            name: p.name,
            total_revenue: p.total_revenue,
            times_sold: p.times_sold
          }))
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      return { success: false, error: error.message };
    }
  }

  async close() {
    if (this.db) {
      await this.db.close();
      console.log('✅ Conexión cerrada');
    }
  }
}

export default DatabaseService;
