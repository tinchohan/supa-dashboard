import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import ApiService from './services/apiService.js';

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

// Endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    mode: 'API Externa con Fallback'
  });
});

// Obtener tiendas (usar datos fijos ya que no hay endpoint específico)
app.get('/api/stores', async (req, res) => {
  try {
    // Retornar lista fija de tiendas ya que no hay endpoint específico
    const stores = [
      { store_id: "63953", store_name: "Subway Lacroze" },
      { store_id: "66220", store_name: "Subway Corrientes" },
      { store_id: "72267", store_name: "Subway Ortiz" },
      { store_id: "30036", store_name: "Daniel Lacroze" },
      { store_id: "30038", store_name: "Daniel Corrientes" },
      { store_id: "10019", store_name: "Daniel Ortiz" },
      { store_id: "10020", store_name: "Seitu Juramento" }
    ];
    
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('❌ Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener estadísticas
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.body;
    
    console.log(`📊 Obteniendo estadísticas desde ${fromDate} hasta ${toDate}`);
    
    const result = await apiService.getStats(fromDate, toDate, storeId);
    
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

// Test de conectividad con API
app.get('/api/test-api', async (req, res) => {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(process.env.LINISCO_API_URL || 'https://api.linisco.com.ar', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Linisco-Dashboard/1.0.0'
      }
    });
    
    res.json({
      success: true,
      message: 'API de Linisco accesible',
      status: response.status,
      url: process.env.LINISCO_API_URL || 'https://api.linisco.com.ar'
    });
  } catch (error) {
    res.json({
      success: false,
      message: 'API de Linisco no accesible, usando modo demo',
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
  console.log(`🌐 Modo: API Externa con Fallback a Datos Demo`);
});

export default app;