import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseService {
  constructor() {
    this.connection = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'linisco_dashboard',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4'
    };
  }

  // Conectar a la base de datos
  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      console.log('✅ Conectado a MySQL');
      return true;
    } catch (error) {
      console.error('❌ Error conectando a MySQL:', error.message);
      return false;
    }
  }

  // Crear tablas si no existen
  async createTables() {
    try {
      // Tabla de órdenes de venta
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS sale_orders (
          id INT PRIMARY KEY AUTO_INCREMENT,
          order_id VARCHAR(50) UNIQUE,
          store_id VARCHAR(20),
          order_number VARCHAR(50),
          order_date DATETIME,
          payment_method VARCHAR(50),
          total DECIMAL(10,2),
          discount DECIMAL(10,2) DEFAULT 0,
          customer_name VARCHAR(255),
          user_email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_store_id (store_id),
          INDEX idx_order_date (order_date),
          INDEX idx_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Tabla de productos de venta
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS sale_products (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_id VARCHAR(50),
          order_id VARCHAR(50),
          name VARCHAR(255),
          quantity INT,
          price DECIMAL(10,2),
          total DECIMAL(10,2),
          user_email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_order_id (order_id),
          INDEX idx_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Tabla de sesiones
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          session_id VARCHAR(50) UNIQUE,
          store_id VARCHAR(20),
          start_time DATETIME,
          end_time DATETIME,
          status VARCHAR(20),
          user_email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_store_id (store_id),
          INDEX idx_user_email (user_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // Tabla de usuarios
      await this.connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) UNIQUE,
          store_id VARCHAR(20),
          store_name VARCHAR(255),
          active BOOLEAN DEFAULT true,
          last_sync TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_store_id (store_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      console.log('✅ Tablas creadas/verificadas correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error creando tablas:', error.message);
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
          await this.connection.execute(`
            INSERT INTO sale_orders 
            (order_id, store_id, order_number, order_date, payment_method, total, discount, customer_name, user_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            store_id = VALUES(store_id),
            order_number = VALUES(order_number),
            order_date = VALUES(order_date),
            payment_method = VALUES(payment_method),
            total = VALUES(total),
            discount = VALUES(discount),
            customer_name = VALUES(customer_name),
            user_email = VALUES(user_email),
            updated_at = CURRENT_TIMESTAMP
          `, [
            order.id || order.order_id,
            order.store_id,
            order.order_number,
            order.order_date ? new Date(order.order_date) : null,
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
          await this.connection.execute(`
            INSERT INTO sale_products 
            (product_id, order_id, name, quantity, price, total, user_email)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            order_id = VALUES(order_id),
            name = VALUES(name),
            quantity = VALUES(quantity),
            price = VALUES(price),
            total = VALUES(total),
            user_email = VALUES(user_email),
            updated_at = CURRENT_TIMESTAMP
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
          await this.connection.execute(`
            INSERT INTO sessions 
            (session_id, store_id, start_time, end_time, status, user_email)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            store_id = VALUES(store_id),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time),
            status = VALUES(status),
            user_email = VALUES(user_email),
            updated_at = CURRENT_TIMESTAMP
          `, [
            session.id || session.session_id,
            session.store_id,
            session.start_time ? new Date(session.start_time) : null,
            session.end_time ? new Date(session.end_time) : null,
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
      await this.connection.execute(`
        INSERT INTO users (email, store_id, store_name, active, last_sync)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        store_id = VALUES(store_id),
        store_name = VALUES(store_name),
        active = VALUES(active),
        last_sync = NOW(),
        updated_at = CURRENT_TIMESTAMP
      `, [user.email, user.storeId, user.storeName, user.active]);

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
      const [orders] = await this.connection.execute(`
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
      const [paymentBreakdown] = await this.connection.execute(`
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
      const [storeBreakdown] = await this.connection.execute(`
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
      console.error('❌ Error obteniendo estadísticas de DB:', error.message);
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

      const [orders] = await this.connection.execute(`
        SELECT * FROM sale_orders 
        ${whereClause}
        ORDER BY order_date DESC
      `, params);

      return { success: true, data: orders };
    } catch (error) {
      console.error('❌ Error obteniendo órdenes de DB:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Cerrar conexión
  async close() {
    if (this.connection) {
      await this.connection.end();
      console.log('✅ Conexión a MySQL cerrada');
    }
  }
}

export default DatabaseService;
