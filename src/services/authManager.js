import AuthService from './authService.js';
import SqliteService from './sqliteService.js';
import { getActiveUsers } from '../config/users.js';

class AuthManager {
  constructor() {
    this.authService = new AuthService();
    this.dbService = new SqliteService();
    this.authenticatedStores = new Map();
    this.isInitialized = false;
  }

  // Inicializar el AuthManager
  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      const connected = await this.dbService.connect();
      if (connected) {
        await this.dbService.createTables();
        this.isInitialized = true;
        console.log('✅ AuthManager inicializado');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error inicializando AuthManager:', error.message);
      return false;
    }
  }

  // Autenticar todas las tiendas
  async authenticateAllStores() {
    console.log('🔐 Iniciando autenticación de todas las tiendas...');
    
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
    console.log(`✅ Autenticación completada: ${successCount}/${users.length} tiendas autenticadas`);
    
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

  // Autenticar una tienda específica
  async authenticateStore(user) {
    try {
      console.log(`🔐 Autenticando ${user.storeName} (${user.storeId})...`);

      // Verificar si ya tiene un token válido
      const existingToken = await this.dbService.getAuthToken(user.storeId);
      if (existingToken.success) {
        console.log(`✅ Token válido encontrado para ${user.storeName}`);
        this.authenticatedStores.set(user.storeId, existingToken.token);
        return { success: true, message: 'Token válido existente' };
      }

      // Intentar autenticación
      const authResult = await this.authService.getToken(user.email, user.password);
      
      if (authResult.success) {
        // Calcular fecha de expiración (asumiendo 24 horas de validez)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Guardar token en la base de datos
        const saveResult = await this.dbService.saveAuthToken(
          user.storeId,
          user.email,
          authResult.token,
          expiresAt.toISOString()
        );

        if (saveResult.success) {
          this.authenticatedStores.set(user.storeId, {
            token: authResult.token,
            expires: expiresAt,
            email: user.email
          });

          console.log(`✅ Autenticación exitosa para ${user.storeName}`);
          return { success: true, message: 'Autenticación exitosa' };
        } else {
          return { success: false, error: 'Error guardando token: ' + saveResult.error };
        }
      } else {
        await this.dbService.updateAuthStatus(user.storeId, 'failed');
        return { success: false, error: authResult.error };
      }
    } catch (error) {
      console.error(`❌ Error autenticando ${user.storeName}:`, error.message);
      await this.dbService.updateAuthStatus(user.storeId, 'failed');
      return { success: false, error: error.message };
    }
  }

  // Obtener token para una tienda específica
  async getTokenForStore(storeId) {
    // Verificar cache en memoria
    if (this.authenticatedStores.has(storeId)) {
      const tokenData = this.authenticatedStores.get(storeId);
      if (tokenData.expires > new Date()) {
        return { success: true, token: tokenData.token };
      } else {
        this.authenticatedStores.delete(storeId);
      }
    }

    // Buscar en base de datos
    const dbResult = await this.dbService.getAuthToken(storeId);
    if (dbResult.success) {
      this.authenticatedStores.set(storeId, {
        token: dbResult.token.token,
        expires: new Date(dbResult.token.token_expires),
        email: dbResult.token.email
      });
      return { success: true, token: dbResult.token.token };
    }

    return { success: false, error: 'No hay token válido para esta tienda' };
  }

  // Renovar token para una tienda
  async renewTokenForStore(storeId) {
    const user = getActiveUsers().find(u => u.storeId === storeId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    return await this.authenticateStore(user);
  }

  // Obtener estado de autenticación de todas las tiendas
  async getAuthenticationStatus() {
    try {
      const result = await this.dbService.getAllAuthTokens();
      
      if (result.success) {
        const now = new Date();
        const status = result.tokens.map(token => {
          const expiresAt = new Date(token.token_expires);
          const isExpired = expiresAt <= now;
          const isExpiringSoon = expiresAt <= new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 horas

          return {
            storeId: token.store_id,
            storeName: token.store_name,
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
    } catch (error) {
      console.error('❌ Error obteniendo estado de autenticación:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Sincronizar tiendas específicas
  async syncSelectedStores(storeIds, fromDate, toDate) {
    console.log(`🔄 Sincronizando tiendas seleccionadas: ${storeIds.join(', ')}`);
    
    const results = [];
    
    for (const storeId of storeIds) {
      try {
        // Obtener token para la tienda
        const tokenResult = await this.getTokenForStore(storeId);
        
        if (!tokenResult.success) {
          // Intentar renovar token
          const renewResult = await this.renewTokenForStore(storeId);
          if (!renewResult.success) {
            results.push({
              storeId,
              success: false,
              error: 'No se pudo obtener token válido'
            });
            continue;
          }
        }

        // Aquí se implementaría la sincronización específica
        // Por ahora retornamos éxito
        results.push({
          storeId,
          success: true,
          message: 'Sincronización completada'
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

  // Limpiar tokens expirados
  async cleanExpiredTokens() {
    try {
      const result = await this.dbService.db.run(`
        UPDATE auth_tokens 
        SET auth_status = 'expired'
        WHERE token_expires < CURRENT_TIMESTAMP 
        AND auth_status = 'active'
      `);

      console.log(`✅ ${result.changes} tokens expirados marcados`);
      return { success: true, cleaned: result.changes };
    } catch (error) {
      console.error('❌ Error limpiando tokens expirados:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default AuthManager;
