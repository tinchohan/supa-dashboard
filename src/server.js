import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDatabase, getDatabase } from './database/connection.js';
import LiniscoSyncService from './services/liniscoSync.js';
import LocalDataService from './services/localDataService.js';
import AIService from './services/aiService.js';

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
const syncService = new LiniscoSyncService();
const localDataService = new LocalDataService();
const aiService = new AIService();

// Inicializar base de datos
async function initializeDatabase() {
  try {
    const db = await getDatabase();
    
    // Ejecutar esquema
    const fs = await import('fs');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await db.query(schema);
    console.log('✅ Esquema de base de datos ejecutado');
    
    // Insertar tiendas
    const storesPath = path.join(__dirname, 'config', 'stores.json');
    const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
    
    for (const store of stores) {
      await db.query(`
        INSERT INTO stores (store_id, store_name, email, password) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (store_id) DO NOTHING
      `, [store.store_id, store.store_name, store.email, store.password]);
    }
    
    console.log('✅ Tiendas insertadas');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Endpoints

// Inicializar base de datos
app.post('/api/init-db', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true, message: 'Base de datos inicializada correctamente' });
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sincronizar datos
app.post('/api/sync', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', useLocal = true } = req.body;
    
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
    
    const db = await getDatabase();
    
    if (useLocal) {
      // Usar datos locales
      const result = await localDataService.syncToPostgreSQL(db);
      res.json({ 
        success: true, 
        message: 'Datos locales sincronizados a PostgreSQL',
        data: result
      });
    } else {
      // Intentar sincronizar con Linisco
      const result = await syncService.syncAllStores(fromDate, toDate, db);
      res.json({ 
        success: true, 
        message: `Sincronización con Linisco completada con ${result.totalRecords} registros`,
        data: result
      });
    }
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener tiendas
app.get('/api/stores', async (req, res) => {
  try {
    // Usar datos locales primero
    const localStores = localDataService.getStores();
    res.json({ success: true, data: localStores });
  } catch (error) {
    console.error('❌ Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estadísticas generales
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.body;
    
    // Usar datos locales
    const stats = localDataService.getStats(fromDate, toDate, storeId);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chat con IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    const response = await aiService.chat(message, context);
    
    res.json({
      success: true,
      response
    });
    
  } catch (error) {
    console.error('❌ Error en chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Análisis de IA
app.post('/api/ai/analysis', async (req, res) => {
  try {
    const { stats } = req.body;
    
    const analysis = await aiService.generateSalesAnalysis(stats);
    
    res.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    console.error('❌ Error generando análisis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Datos para gráficos
app.post('/api/ai/charts', async (req, res) => {
  try {
    const { stats, chartType } = req.body;
    
    const chartData = await aiService.generateChartData(stats, chartType);
    
    res.json({
      success: true,
      chartData
    });
    
  } catch (error) {
    console.error('❌ Error generando gráfico:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint para verificar API de Linisco
app.get('/api/test-linisco', async (req, res) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(process.env.LINISCO_API_URL || 'https://api.linisco.com.ar', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Linisco-Dashboard/2.0.0'
      }
    });
    
    res.json({
      success: true,
      message: 'API de Linisco accesible',
      status: response.status,
      url: process.env.LINISCO_API_URL || 'https://api.linisco.com.ar'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error conectando a API de Linisco',
      error: error.message,
      url: process.env.LINISCO_API_URL || 'https://api.linisco.com.ar'
    });
  }
});

// Iniciar servidor
async function startServer() {
  try {
    await connectDatabase();
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
      console.log(`🔗 API disponible en http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();
