import ApiService from './apiService.js';
import DatabaseService from './databaseService.js';
import { getActiveUsers } from '../config/users.js';

class SyncService {
  constructor() {
    this.apiService = new ApiService();
    this.dbService = new DatabaseService();
    this.isInitialized = false;
  }

  // Inicializar el servicio
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Conectar a la base de datos
      const connected = await this.dbService.connect();
      if (!connected) {
        console.log('⚠️ No se pudo conectar a MySQL, usando solo API');
        return false;
      }

      // Crear tablas
      await this.dbService.createTables();

      // Sincronizar usuarios
      const users = getActiveUsers();
      for (const user of users) {
        await this.dbService.syncUser(user);
      }

      this.isInitialized = true;
      console.log('✅ SyncService inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando SyncService:', error.message);
      return false;
    }
  }

  // Sincronizar datos de un usuario específico
  async syncUserData(userEmail, userPassword, fromDate, toDate) {
    try {
      console.log(`🔄 Sincronizando datos para ${userEmail} desde ${fromDate} hasta ${toDate}`);

      // Obtener datos de la API
      const [ordersResult, productsResult, sessionsResult] = await Promise.all([
        this.apiService.getSaleOrders(userEmail, userPassword, fromDate, toDate),
        this.apiService.getSaleProducts(userEmail, userPassword, fromDate, toDate),
        this.apiService.getSessions(userEmail, userPassword, fromDate, toDate)
      ]);

      let syncedData = {
        orders: 0,
        products: 0,
        sessions: 0
      };

      // Sincronizar con la base de datos si está disponible
      if (this.isInitialized) {
        if (ordersResult.success && ordersResult.data) {
          const ordersSync = await this.dbService.syncSaleOrders(ordersResult.data, userEmail);
          if (ordersSync.success) syncedData.orders = ordersSync.synced;
        }

        if (productsResult.success && productsResult.data) {
          const productsSync = await this.dbService.syncSaleProducts(productsResult.data, userEmail);
          if (productsSync.success) syncedData.products = productsSync.synced;
        }

        if (sessionsResult.success && sessionsResult.data) {
          const sessionsSync = await this.dbService.syncSessions(sessionsResult.data, userEmail);
          if (sessionsSync.success) syncedData.sessions = sessionsSync.synced;
        }
      }

      return {
        success: true,
        data: {
          orders: ordersResult.success ? ordersResult.data : [],
          products: productsResult.success ? productsResult.data : [],
          sessions: sessionsResult.success ? sessionsResult.data : [],
          synced: syncedData
        }
      };
    } catch (error) {
      console.error(`❌ Error sincronizando datos para ${userEmail}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar datos de todos los usuarios
  async syncAllUsers(fromDate, toDate) {
    try {
      console.log(`🔄 Sincronizando datos de todos los usuarios desde ${fromDate} hasta ${toDate}`);

      const users = getActiveUsers();
      const results = [];

      for (const user of users) {
        try {
          const result = await this.syncUserData(user.email, user.password, fromDate, toDate);
          results.push({
            user: user.email,
            success: result.success,
            synced: result.data?.synced || { orders: 0, products: 0, sessions: 0 }
          });
        } catch (error) {
          console.error(`❌ Error sincronizando ${user.email}:`, error.message);
          results.push({
            user: user.email,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        data: {
          users: results,
          totalSynced: results.reduce((sum, r) => 
            sum + (r.synced?.orders || 0) + (r.synced?.products || 0) + (r.synced?.sessions || 0), 0
          )
        }
      };
    } catch (error) {
      console.error('❌ Error sincronizando todos los usuarios:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener estadísticas (prioriza base de datos si está disponible)
  async getStats(fromDate, toDate, userEmail = null, userPassword = null) {
    try {
      // Si tenemos base de datos, intentar obtener datos de ahí primero
      if (this.isInitialized) {
        console.log('📊 Obteniendo estadísticas desde base de datos...');
        const dbResult = await this.dbService.getStatsFromDB(fromDate, toDate, userEmail);
        if (dbResult.success) {
          console.log('✅ Estadísticas obtenidas desde base de datos');
          return dbResult;
        }
      }

      // Si no hay base de datos o falló, usar API
      console.log('📊 Obteniendo estadísticas desde API...');
      return await this.apiService.getStats(fromDate, toDate, userEmail, userPassword);
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener órdenes (prioriza base de datos si está disponible)
  async getOrders(fromDate, toDate, userEmail = null, userPassword = null) {
    try {
      // Si tenemos base de datos, intentar obtener datos de ahí primero
      if (this.isInitialized) {
        console.log('📦 Obteniendo órdenes desde base de datos...');
        const dbResult = await this.dbService.getOrdersFromDB(fromDate, toDate, userEmail);
        if (dbResult.success) {
          console.log('✅ Órdenes obtenidas desde base de datos');
          return dbResult;
        }
      }

      // Si no hay base de datos o falló, usar API
      console.log('📦 Obteniendo órdenes desde API...');
      return await this.apiService.getSaleOrders(userEmail, userPassword, fromDate, toDate);
    } catch (error) {
      console.error('❌ Error obteniendo órdenes:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener estado de sincronización
  async getSyncStatus() {
    try {
      if (!this.isInitialized) {
        return {
          success: true,
          data: {
            initialized: false,
            message: 'Base de datos no disponible, usando solo API'
          }
        };
      }

      // Obtener estadísticas de la base de datos
      const [users] = await this.dbService.connection.execute(`
        SELECT 
          email,
          store_name,
          last_sync,
          (SELECT COUNT(*) FROM sale_orders WHERE user_email = users.email) as orders_count,
          (SELECT COUNT(*) FROM sale_products WHERE user_email = users.email) as products_count,
          (SELECT COUNT(*) FROM sessions WHERE user_email = users.email) as sessions_count
        FROM users 
        WHERE active = true
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

  // Limpiar datos antiguos (opcional)
  async cleanOldData(daysToKeep = 90) {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Base de datos no inicializada' };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const [ordersResult] = await this.dbService.connection.execute(
        'DELETE FROM sale_orders WHERE order_date < ?',
        [cutoffDate]
      );

      const [productsResult] = await this.dbService.connection.execute(
        'DELETE FROM sale_products WHERE created_at < ?',
        [cutoffDate]
      );

      const [sessionsResult] = await this.dbService.connection.execute(
        'DELETE FROM sessions WHERE created_at < ?',
        [cutoffDate]
      );

      console.log(`✅ Datos antiguos limpiados: ${ordersResult.affectedRows} órdenes, ${productsResult.affectedRows} productos, ${sessionsResult.affectedRows} sesiones`);

      return {
        success: true,
        data: {
          orders_deleted: ordersResult.affectedRows,
          products_deleted: productsResult.affectedRows,
          sessions_deleted: sessionsResult.affectedRows
        }
      };
    } catch (error) {
      console.error('❌ Error limpiando datos antiguos:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default SyncService;
