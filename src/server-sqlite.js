import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import ApiService from './services/apiService.js';
import SqliteSyncService from './services/sqliteSyncService.js';
import AiService from './services/aiService.js';
import { getActiveUsers, getUserByEmail } from './config/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Servicios
const apiService = new ApiService();
const syncService = new SqliteSyncService();
const aiService = new AiService();

// Inicializar servicio de sincronización con SQLite
syncService.initialize().then(initialized => {
  if (initialized) {
    console.log('✅ Servicio de sincronización con SQLite inicializado');
  } else {
    console.log('⚠️ Servicio de sincronización no disponible, usando solo API');
  }
});

// Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    mode: 'API Externa con Fallback a SQLite'
  });
});

// Obtener tiendas (usar configuración de usuarios)
app.get('/api/stores', async (req, res) => {
  try {
    const activeUsers = getActiveUsers();
    const stores = activeUsers.map(user => ({
      store_id: user.storeId,
      store_name: user.storeName,
      user_email: user.email,
      active: user.active
    }));
    
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('❌ Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener usuarios configurados
app.get('/api/users', async (req, res) => {
  try {
    const activeUsers = getActiveUsers();
    const users = activeUsers.map(user => ({
      id: user.id,
      email: user.email,
      storeName: user.storeName,
      storeId: user.storeId,
      active: user.active
    }));
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener estadísticas para un usuario específico
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, email, password, storeId } = req.body;
    
    console.log(`📊 Obteniendo estadísticas desde ${fromDate} hasta ${toDate}`);
    
    let result;
    if (email && password) {
      // Usar credenciales específicas
      result = await syncService.getStats(fromDate, toDate, email, password);
    } else if (storeId) {
      // Buscar usuario por storeId
      const user = getActiveUsers().find(u => u.storeId === storeId);
      if (user) {
        result = await syncService.getStats(fromDate, toDate, user.email, user.password);
      } else {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado para la tienda especificada' });
      }
    } else {
      // Usar usuario por defecto
      result = await syncService.getStats(fromDate, toDate);
    }
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener estadísticas consolidadas para todos los usuarios
app.post('/api/stats/consolidated', async (req, res) => {
  try {
    const { fromDate, toDate, userIds } = req.body;
    
    console.log(`📊 Obteniendo estadísticas consolidadas desde ${fromDate} hasta ${toDate}`);
    
    let users = getActiveUsers();
    
    // Si se especifican userIds, filtrar usuarios
    if (userIds && userIds.length > 0) {
      users = users.filter(user => userIds.includes(user.id));
    }
    
    const result = await apiService.getStatsForMultipleUsers(fromDate, toDate, users);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas consolidadas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener top productos
app.get('/api/top-products', async (req, res) => {
  try {
    const { fromDate, toDate, storeId, limit = 5 } = req.query;
    
    const result = await apiService.getStats(fromDate, toDate, storeId);
    
    if (result.success) {
      const topProducts = result.data.topProducts.slice(0, parseInt(limit));
      res.json({ success: true, data: topProducts });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronizar datos (refrescar cache)
app.post('/api/sync', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31' } = req.body;
    
    console.log(`🔄 Refrescando datos desde ${fromDate} hasta ${toDate}`);
    
    // Limpiar cache
    apiService.clearCache();
    
    // Obtener datos frescos
    const result = await apiService.getStats(fromDate, toDate);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Datos actualizados: ${result.data.totalOrders} órdenes, $${result.data.totalRevenue.toLocaleString()} ingresos`,
        data: {
          totalOrders: result.data.totalOrders,
          totalRevenue: result.data.totalRevenue,
          stores: result.data.storeBreakdown.length
        }
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error sincronizando datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener órdenes de venta
app.post('/api/sale-orders', async (req, res) => {
  try {
    const { fromDate, toDate, email, password, storeId } = req.body;
    
    let user;
    if (email && password) {
      user = { email, password };
    } else if (storeId) {
      const foundUser = getActiveUsers().find(u => u.storeId === storeId);
      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado para la tienda especificada' });
      }
      user = { email: foundUser.email, password: foundUser.password };
    } else {
      const defaultUser = getActiveUsers()[0];
      user = { email: defaultUser.email, password: defaultUser.password };
    }
    
    const result = await apiService.getSaleOrders(user.email, user.password, fromDate, toDate);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo órdenes de venta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener productos de venta
app.post('/api/sale-products', async (req, res) => {
  try {
    const { fromDate, toDate, email, password, storeId } = req.body;
    
    let user;
    if (email && password) {
      user = { email, password };
    } else if (storeId) {
      const foundUser = getActiveUsers().find(u => u.storeId === storeId);
      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado para la tienda especificada' });
      }
      user = { email: foundUser.email, password: foundUser.password };
    } else {
      const defaultUser = getActiveUsers()[0];
      user = { email: defaultUser.email, password: defaultUser.password };
    }
    
    const result = await apiService.getSaleProducts(user.email, user.password, fromDate, toDate);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo productos de venta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener sesiones
app.post('/api/sessions', async (req, res) => {
  try {
    const { fromDate, toDate, email, password, storeId } = req.body;
    
    let user;
    if (email && password) {
      user = { email, password };
    } else if (storeId) {
      const foundUser = getActiveUsers().find(u => u.storeId === storeId);
      if (!foundUser) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado para la tienda especificada' });
      }
      user = { email: foundUser.email, password: foundUser.password };
    } else {
      const defaultUser = getActiveUsers()[0];
      user = { email: defaultUser.email, password: defaultUser.password };
    }
    
    const result = await apiService.getSessions(user.email, user.password, fromDate, toDate);
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo sesiones:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronizar datos de un usuario específico
app.post('/api/sync/user', async (req, res) => {
  try {
    const { fromDate, toDate, email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y password son requeridos' });
    }
    
    console.log(`🔄 Sincronizando datos para ${email} desde ${fromDate} hasta ${toDate}`);
    
    const result = await syncService.syncUserData(email, password, fromDate, toDate);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Datos sincronizados: ${result.data.synced.orders} órdenes, ${result.data.synced.products} productos, ${result.data.synced.sessions} sesiones`,
        data: result.data
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error sincronizando usuario:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronizar datos de todos los usuarios
app.post('/api/sync/all', async (req, res) => {
  try {
    const { fromDate, toDate } = req.body;
    
    console.log(`🔄 Sincronizando datos de todos los usuarios desde ${fromDate} hasta ${toDate}`);
    
    const result = await syncService.syncAllUsers(fromDate, toDate);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Sincronización completada: ${result.data.totalSynced} registros totales`,
        data: result.data
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error sincronizando todos los usuarios:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener estado de sincronización
app.get('/api/sync/status', async (req, res) => {
  try {
    const result = await syncService.getSyncStatus();
    
    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error obteniendo estado de sincronización:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Limpiar datos antiguos
app.post('/api/sync/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;
    
    console.log(`🧹 Limpiando datos antiguos (más de ${daysToKeep} días)`);
    
    const result = await syncService.cleanOldData(daysToKeep);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Limpieza completada: ${result.data.orders_deleted} órdenes, ${result.data.products_deleted} productos, ${result.data.sessions_deleted} sesiones eliminadas`,
        data: result.data
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('❌ Error limpiando datos antiguos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test de conectividad con API
app.get('/api/test-api', async (req, res) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar', {
      timeout: 5000,
      headers: {
        'User-Agent': 'vscode-restclient'
      }
    });
    
    res.json({
      success: true,
      message: 'API de Linisco accesible',
      status: response.status,
      url: process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'API de Linisco no accesible, usando modo demo',
      error: error.message,
      url: process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar'
    });
  }
});

// Chat con IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mensaje requerido' 
      });
    }

    console.log('🤖 Procesando consulta de chat:', message.substring(0, 50) + '...');
    
    const result = await aiService.generateResponse(message, context);
    
    if (result.success) {
      res.json({ 
        success: true, 
        response: result.response 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('❌ Error en chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Análisis de tendencias con IA
app.post('/api/ai/analysis', async (req, res) => {
  try {
    const { context } = req.body;
    
    console.log('📊 Generando análisis de tendencias...');
    
    const result = await aiService.analyzeTrends(context);
    
    if (result.success) {
      res.json({ 
        success: true, 
        analysis: result.response 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('❌ Error en análisis:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Resumen ejecutivo con IA
app.post('/api/ai/summary', async (req, res) => {
  try {
    const { context } = req.body;
    
    console.log('📋 Generando resumen ejecutivo...');
    
    const result = await aiService.generateExecutiveSummary(context);
    
    if (result.success) {
      res.json({ 
        success: true, 
        summary: result.response 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    console.error('❌ Error en resumen:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Test de conectividad con IA
app.get('/api/test-ai', async (req, res) => {
  try {
    const result = await aiService.testConnection();
    
    res.json({
      success: result.success,
      message: result.success ? 'IA funcionando correctamente' : result.error,
      configured: aiService.isConfigured()
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'Error probando IA: ' + error.message,
      configured: aiService.isConfigured()
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`🔗 API disponible en http://localhost:${PORT}/api`);
  console.log(`🌐 Modo: API Externa con Fallback a SQLite`);
});

export default app;
