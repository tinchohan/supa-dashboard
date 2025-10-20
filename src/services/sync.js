import DatabaseService from './database.js';
import AuthService from './auth.js';
import ApiService from './api.js';
import { getActiveUsers } from '../config/users.js';

class SyncService {
  constructor() {
    this.db = new DatabaseService();
    this.auth = new AuthService();
    this.api = new ApiService();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      const connected = await this.db.connect();
      if (!connected) {
        console.log('⚠️ No se pudo conectar a SQLite');
        return false;
      }

      await this.db.createTables();
      this.isInitialized = true;
      console.log('✅ SyncService inicializado');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando SyncService:', error.message);
      return false;
    }
  }

  async authenticateAllStores() {
    console.log('🔐 Autenticando todas las tiendas...');
    
    const users = getActiveUsers();
    const results = [];

    for (const user of users) {
      try {
        const result = await this.authenticateStore(user);
        results.push({
          storeId: user.storeId,
          storeName: user.storeName,
          email: user.email,
          success: result.success,
          error: result.error
        });
      } catch (error) {
        console.error(`❌ Error autenticando ${user.storeName}:`, error.message);
        results.push({
          storeId: user.storeId,
          storeName: user.storeName,
          email: user.email,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Autenticación completada: ${successCount}/${users.length} tiendas`);
    
    return {
      success: true,
      results,
      summary: {
        total: users.length,
        successful: successCount,
        failed: users.length - successCount
      }
    };
  }

  async authenticateStore(user) {
    try {
      console.log(`🔐 Autenticando ${user.storeName} (${user.storeId})...`);

      // Verificar si ya tiene un token válido
      const existingToken = await this.db.getAuthToken(user.storeId);
      if (existingToken.success) {
        console.log(`✅ Token válido encontrado para ${user.storeName}`);
        return { success: true, message: 'Token válido existente' };
      }

      // Intentar autenticación
      const authResult = await this.auth.authenticate(user.email, user.password);
      
      if (authResult.success) {
        // Calcular fecha de expiración (24 horas)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Guardar token en la base de datos
        const saveResult = await this.db.saveAuthToken(
          user.storeId,
          user.email,
          authResult.token,
          expiresAt.toISOString()
        );

        if (saveResult.success) {
          console.log(`✅ Autenticación exitosa para ${user.storeName}`);
          return { success: true, message: 'Autenticación exitosa' };
        } else {
          return { success: false, error: 'Error guardando token: ' + saveResult.error };
        }
      } else {
        await this.db.updateAuthStatus(user.storeId, 'failed');
        return { success: false, error: authResult.error };
      }
    } catch (error) {
      console.error(`❌ Error autenticando ${user.storeName}:`, error.message);
      await this.db.updateAuthStatus(user.storeId, 'failed');
      return { success: false, error: error.message };
    }
  }

  async syncSelectedStores(storeIds, fromDate, toDate) {
    console.log(`🔄 Sincronizando tiendas seleccionadas: ${storeIds.join(', ')}`);

    const results = [];
    
    for (const storeId of storeIds) {
      try {
        // Obtener token para la tienda
        const tokenResult = await this.db.getAuthToken(storeId);
        
        if (!tokenResult.success) {
          // Intentar renovar token
          const user = getActiveUsers().find(u => u.storeId === storeId);
          if (user) {
            const renewResult = await this.authenticateStore(user);
            if (!renewResult.success) {
              results.push({
                storeId,
                success: false,
                error: 'No se pudo obtener token válido'
              });
              continue;
            }
            // Obtener el token recién creado
            const newTokenResult = await this.db.getAuthToken(storeId);
            if (newTokenResult.success) {
              tokenResult.token = newTokenResult.token;
            }
          } else {
            results.push({
              storeId,
              success: false,
              error: 'Usuario no encontrado'
            });
            continue;
          }
        }

        // Obtener datos de la API
        const [ordersResult, productsResult, sessionsResult] = await Promise.all([
          this.api.getData('/sale_orders', tokenResult.token.token, fromDate, toDate),
          this.api.getData('/sale_products', tokenResult.token.token, fromDate, toDate),
          this.api.getData('/psessions', tokenResult.token.token, fromDate, toDate)
        ]);

        let syncedData = {
          orders: 0,
          products: 0,
          sessions: 0
        };

        // Guardar datos en la base de datos
        if (ordersResult.success && ordersResult.data) {
          const ordersSave = await this.db.saveSaleOrders(ordersResult.data, tokenResult.token.email);
          if (ordersSave.success) syncedData.orders = ordersSave.saved;
        }

        if (productsResult.success && productsResult.data) {
          const productsSave = await this.db.saveSaleProducts(productsResult.data, tokenResult.token.email);
          if (productsSave.success) syncedData.products = productsSave.saved;
        }

        if (sessionsResult.success && sessionsResult.data) {
          const sessionsSave = await this.db.saveSessions(sessionsResult.data, tokenResult.token.email);
          if (sessionsSave.success) syncedData.sessions = sessionsSave.saved;
        }

        results.push({
          storeId,
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
  }

  async getStats(fromDate, toDate, storeIds = null) {
    return await this.db.getStats(fromDate, toDate, storeIds);
  }

  async getAuthenticationStatus() {
    const result = await this.db.getAllAuthTokens();
    
    if (result.success) {
      const now = new Date();
      const status = result.tokens.map(token => {
        const expiresAt = new Date(token.token_expires);
        const isExpired = expiresAt <= now;
        const isExpiringSoon = expiresAt <= new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 horas

        return {
          storeId: token.store_id,
          storeName: this.getStoreName(token.store_id),
          email: token.email,
          status: token.auth_status,
          lastAuth: token.last_auth,
          expiresAt: token.token_expires,
          isExpired,
          isExpiringSoon,
          needsRenewal: isExpired || isExpiringSoon
        };
      });

      return { success: true, status };
    } else {
      return { success: false, error: result.error };
    }
  }

  getStoreName(storeId) {
    const user = getActiveUsers().find(u => u.storeId === storeId);
    return user ? user.storeName : `Tienda ${storeId}`;
  }

  async close() {
    await this.db.close();
  }
}

export default SyncService;
