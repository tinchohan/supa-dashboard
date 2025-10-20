import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import SyncService from './services/sync.js';
import AiService from './services/ai.js';

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
const syncService = new SyncService();
const aiService = new AiService();

// Inicializar servicios
syncService.initialize().then(async initialized => {
  if (initialized) {
    console.log('✅ Servicios inicializados');
    
    // Autenticar todas las tiendas al iniciar
    console.log('🔐 Autenticando todas las tiendas...');
    const authResult = await syncService.authenticateAllStores();
    if (authResult.success) {
      console.log(`✅ ${authResult.summary.successful}/${authResult.summary.total} tiendas autenticadas`);
    }
  } else {
    console.log('⚠️ Error inicializando servicios');
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

// Obtener estadísticas
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeIds } = req.body;
    
    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'fromDate y toDate son requeridos' 
      });
    }

    console.log('📊 Obteniendo estadísticas...');
    const result = await syncService.getStats(fromDate, toDate, storeIds);
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Sincronizar tiendas seleccionadas
app.post('/api/sync', async (req, res) => {
  try {
    const { storeIds, fromDate, toDate } = req.body;
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'storeIds es requerido y debe ser un array no vacío' 
      });
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'fromDate y toDate son requeridos' 
      });
    }

    console.log(`🔄 Sincronizando tiendas seleccionadas: ${storeIds.join(', ')}`);
    const result = await syncService.syncSelectedStores(storeIds, fromDate, toDate);
    res.json(result);
  } catch (error) {
    console.error('❌ Error sincronizando tiendas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Autenticar todas las tiendas
app.post('/api/auth/authenticate-all', async (req, res) => {
  try {
    console.log('🔐 Autenticando todas las tiendas...');
    const result = await syncService.authenticateAllStores();
    res.json(result);
  } catch (error) {
    console.error('❌ Error autenticando tiendas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener estado de autenticación
app.get('/api/auth/status', async (req, res) => {
  try {
    const result = await syncService.getAuthenticationStatus();
    res.json(result);
  } catch (error) {
    console.error('❌ Error obteniendo estado de autenticación:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener tiendas disponibles
app.get('/api/stores', async (req, res) => {
  try {
    const authStatus = await syncService.getAuthenticationStatus();
    
    if (authStatus.success) {
      const stores = authStatus.status.map(store => ({
        storeId: store.storeId,
        storeName: store.storeName,
        email: store.email,
        status: store.status,
        isExpired: store.isExpired,
        isExpiringSoon: store.isExpiringSoon,
        needsRenewal: store.needsRenewal,
        lastAuth: store.lastAuth
      }));
      
      res.json({
        success: true,
        stores
      });
    } else {
      res.status(500).json({
        success: false,
        error: authStatus.error
      });
    }
  } catch (error) {
    console.error('❌ Error obteniendo tiendas:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
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
