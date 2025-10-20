import ApiService from './apiService.js';
import SqliteService from './sqliteService.js';
import AuthManager from './authManager.js';
import { getActiveUsers } from '../config/users.js';

class SqliteSyncService {
  constructor() {
    this.apiService = new ApiService();
    this.dbService = new SqliteService();
    this.authManager = new AuthManager();
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

      // Inicializar AuthManager
      await this.authManager.initialize();

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

  // Sincronizar tiendas seleccionadas
  async syncSelectedStores(storeIds, fromDate, toDate) {
    try {
      console.log(`🔄 Sincronizando tiendas seleccionadas: ${storeIds.join(', ')}`);

      const results = [];
      
      for (const storeId of storeIds) {
        try {
          // Obtener token para la tienda
          const tokenResult = await this.authManager.getTokenForStore(storeId);
          
          if (!tokenResult.success) {
            // Intentar renovar token
            const renewResult = await this.authManager.renewTokenForStore(storeId);
            if (!renewResult.success) {
              results.push({
                storeId,
                success: false,
                error: 'No se pudo obtener token válido'
              });
              continue;
            }
          }

          // Obtener datos de la API para esta tienda
          const user = getActiveUsers().find(u => u.storeId === storeId);
          if (!user) {
            results.push({
              storeId,
              success: false,
              error: 'Usuario no encontrado'
            });
            continue;
          }

          const [ordersResult, productsResult, sessionsResult] = await Promise.all([
            this.apiService.getSaleOrders(user.email, user.password, fromDate, toDate),
            this.apiService.getSaleProducts(user.email, user.password, fromDate, toDate),
            this.apiService.getSessions(user.email, user.password, fromDate, toDate)
          ]);

          let syncedData = {
            orders: 0,
            products: 0,
            sessions: 0
          };

          // Sincronizar con la base de datos
          if (this.isInitialized) {
            if (ordersResult.success && ordersResult.data) {
              const ordersSync = await this.dbService.syncSaleOrders(ordersResult.data, user.email);
              if (ordersSync.success) syncedData.orders = ordersSync.synced;
            }

            if (productsResult.success && productsResult.data) {
              const productsSync = await this.dbService.syncSaleProducts(productsResult.data, user.email);
              if (productsSync.success) syncedData.products = productsSync.synced;
            }

            if (sessionsResult.success && sessionsResult.data) {
              const sessionsSync = await this.dbService.syncSessions(sessionsResult.data, user.email);
              if (sessionsSync.success) syncedData.sessions = sessionsSync.synced;
            }
          }

          results.push({
            storeId,
            storeName: user.storeName,
            success: true,
            synced: syncedData
          });

        } catch (error) {
          console.error(`❌ Error sincronizando tienda ${storeId}:`, error.message);
          results.push({
            storeId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        results,
        summary: {
          total: storeIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      };
    } catch (error) {
      console.error('❌ Error sincronizando tiendas seleccionadas:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Autenticar todas las tiendas
  async authenticateAllStores() {
    try {
      return await this.authManager.authenticateAllStores();
    } catch (error) {
      console.error('❌ Error autenticando tiendas:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener estado de autenticación
  async getAuthenticationStatus() {
    try {
      return await this.authManager.getAuthenticationStatus();
    } catch (error) {
      console.error('❌ Error obteniendo estado de autenticación:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener estadísticas mejoradas con más insights
  async getEnhancedStats(fromDate, toDate, storeIds = null) {
    try {
      let whereClause = 'WHERE order_date BETWEEN ? AND ?';
      let params = [fromDate, toDate];

      if (storeIds && storeIds.length > 0) {
        const storeIdsStr = storeIds.map(id => `'${id}'`).join(',');
        whereClause += ` AND store_id IN (${storeIdsStr})`;
      }

      // Estadísticas básicas
      const basicStats = await this.dbService.getStatsFromDB(fromDate, toDate);

      if (!basicStats.success) {
        return basicStats;
      }

      // Estadísticas adicionales
      const additionalStats = await this.getAdditionalInsights(fromDate, toDate, storeIds);

      return {
        success: true,
        data: {
          ...basicStats.data,
          ...additionalStats
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas mejoradas:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Obtener insights adicionales
  async getAdditionalInsights(fromDate, toDate, storeIds = null) {
    try {
      let whereClause = 'WHERE order_date BETWEEN ? AND ?';
      let params = [fromDate, toDate];

      if (storeIds && storeIds.length > 0) {
        const storeIdsStr = storeIds.map(id => `'${id}'`).join(',');
        whereClause += ` AND store_id IN (${storeIdsStr})`;
      }

      // Horarios de mayor venta
      const hourlyStats = await this.dbService.db.all(`
        SELECT 
          strftime('%H', order_date) as hour,
          COUNT(*) as order_count,
          SUM(total - COALESCE(discount, 0)) as total_amount
        FROM sale_orders 
        ${whereClause}
        GROUP BY strftime('%H', order_date)
        ORDER BY order_count DESC
        LIMIT 5
      `, params);

      // Días de la semana más rentables
      const dailyStats = await this.dbService.db.all(`
        SELECT 
          CASE strftime('%w', order_date)
            WHEN '0' THEN 'Domingo'
            WHEN '1' THEN 'Lunes'
            WHEN '2' THEN 'Martes'
            WHEN '3' THEN 'Miércoles'
            WHEN '4' THEN 'Jueves'
            WHEN '5' THEN 'Viernes'
            WHEN '6' THEN 'Sábado'
          END as day_name,
          COUNT(*) as order_count,
          SUM(total - COALESCE(discount, 0)) as total_amount,
          AVG(total - COALESCE(discount, 0)) as avg_amount
        FROM sale_orders 
        ${whereClause}
        GROUP BY strftime('%w', order_date)
        ORDER BY total_amount DESC
      `, params);

      // Productos más rentables por tienda
      const topProductsByStore = await this.dbService.db.all(`
        SELECT 
          sp.store_id,
          sp.name,
          COUNT(*) as times_sold,
          SUM(sp.total) as total_revenue,
          AVG(sp.price) as avg_price
        FROM sale_products sp
        JOIN sale_orders so ON sp.order_id = so.order_id
        ${whereClause.replace('order_date', 'so.order_date')}
        GROUP BY sp.store_id, sp.name
        ORDER BY sp.store_id, total_revenue DESC
      `, params);

      // Métricas de rendimiento por tienda
      const storePerformance = await this.dbService.db.all(`
        SELECT 
          store_id,
          COUNT(*) as total_orders,
          SUM(total - COALESCE(discount, 0)) as total_revenue,
          AVG(total - COALESCE(discount, 0)) as avg_order_value,
          MIN(order_date) as first_order,
          MAX(order_date) as last_order,
          COUNT(DISTINCT DATE(order_date)) as active_days
        FROM sale_orders 
        ${whereClause}
        GROUP BY store_id
        ORDER BY total_revenue DESC
      `, params);

      return {
        hourlyStats: hourlyStats.map(h => ({
          hour: h.hour,
          orderCount: parseInt(h.order_count),
          totalAmount: parseFloat(h.total_amount)
        })),
        dailyStats: dailyStats.map(d => ({
          dayName: d.day_name,
          orderCount: parseInt(d.order_count),
          totalAmount: parseFloat(d.total_amount),
          avgAmount: parseFloat(d.avg_amount)
        })),
        topProductsByStore: topProductsByStore.map(p => ({
          storeId: p.store_id,
          productName: p.name,
          timesSold: parseInt(p.times_sold),
          totalRevenue: parseFloat(p.total_revenue),
          avgPrice: parseFloat(p.avg_price)
        })),
        storePerformance: storePerformance.map(s => ({
          storeId: s.store_id,
          totalOrders: parseInt(s.total_orders),
          totalRevenue: parseFloat(s.total_revenue),
          avgOrderValue: parseFloat(s.avg_order_value),
          firstOrder: s.first_order,
          lastOrder: s.last_order,
          activeDays: parseInt(s.active_days)
        }))
      };
    } catch (error) {
      console.error('❌ Error obteniendo insights adicionales:', error.message);
      return {};
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
