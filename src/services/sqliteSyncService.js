import ApiService from './apiService.js';
import SqliteService from './sqliteService.js';
import { getActiveUsers } from '../config/users.js';

class SqliteSyncService {
  constructor() {
    this.apiService = new ApiService();
    this.dbService = new SqliteService();
    this.isInitialized = false;
  }

  // Inicializar el servicio
  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Conectar a la base de datos SQLite
      const connected = await this.dbService.connect();
      if (!connected) {
        console.log('⚠️ No se pudo conectar a SQLite, usando solo API');
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
      console.log('✅ SqliteSyncService inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando SqliteSyncService:', error.message);
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
        console.log('📊 Obteniendo estadísticas desde base de datos SQLite...');
        const dbResult = await this.dbService.getStatsFromDB(fromDate, toDate, userEmail);
        if (dbResult.success) {
          console.log('✅ Estadísticas obtenidas desde base de datos SQLite');
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
        console.log('📦 Obteniendo órdenes desde base de datos SQLite...');
        const dbResult = await this.dbService.getOrdersFromDB(fromDate, toDate, userEmail);
        if (dbResult.success) {
          console.log('✅ Órdenes obtenidas desde base de datos SQLite');
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
            message: 'Base de datos SQLite no disponible, usando solo API'
          }
        };
      }

      // Obtener estadísticas de la base de datos
      const result = await this.dbService.getSyncStatus();
      return result;
    } catch (error) {
      console.error('❌ Error obteniendo estado de sincronización:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Limpiar datos antiguos (opcional)
  async cleanOldData(daysToKeep = 90) {
    try {
      if (!this.isInitialized) {
        return { success: false, error: 'Base de datos SQLite no inicializada' };
      }

      const result = await this.dbService.cleanOldData(daysToKeep);
      return result;
    } catch (error) {
      console.error('❌ Error limpiando datos antiguos:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default SqliteSyncService;
