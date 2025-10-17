import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import ExternalApiService from './services/externalApiService.js';
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
const apiService = new ExternalApiService();
const aiService = new AIService();

// Endpoints

// Obtener tiendas
app.get('/api/stores', async (req, res) => {
  try {
    const stores = apiService.getStores();
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('❌ Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estadísticas generales
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.body;
    
    console.log(`📊 Obteniendo estadísticas desde ${fromDate} hasta ${toDate}`);
    
    const stats = await apiService.getStats(fromDate, toDate, storeId);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Top productos
app.get('/api/top-products', async (req, res) => {
  try {
    const { fromDate, toDate, storeId, limit = 5 } = req.query;
    
    const stats = await apiService.getStats(fromDate, toDate, storeId ? [storeId] : null);
    
    res.json({
      success: true,
      data: stats.topProducts.slice(0, parseInt(limit))
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
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

// Sincronizar datos (ahora solo refresca cache)
app.post('/api/sync', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31' } = req.body;
    
    console.log(`🔄 Refrescando datos desde ${fromDate} hasta ${toDate}`);
    
    // Limpiar cache para forzar nueva consulta
    apiService.clearCache();
    
    // Obtener datos frescos
    const stats = await apiService.getStats(fromDate, toDate);
    
    res.json({ 
      success: true, 
      message: `Datos actualizados: ${stats.totalOrders} órdenes, $${stats.totalRevenue.toLocaleString()} ingresos`,
      data: {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        stores: stats.storeBreakdown.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error sincronizando datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    mode: 'API Externa'
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
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`🔗 API disponible en http://localhost:${PORT}/api`);
  console.log(`🌐 Modo: API Externa (sin base de datos local)`);
});

export default app;