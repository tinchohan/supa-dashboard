import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Usar solo SQLite (versión local)
const dbToUse = db;

console.log('🔍 Configuración de servidor local:');
console.log('- Base de datos: SQLite (local)');
console.log('- Entorno: Desarrollo');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Ruta específica para login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// API de autenticación
app.post('/api/auth', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
    }

    const user = dbToUse.prepare('SELECT * FROM stores WHERE email = ? AND password = ?').get(email, password);
    
    if (user) {
      res.json({ 
        success: true, 
        message: 'Autenticación exitosa',
        user: {
          store_id: user.store_id,
          store_name: user.store_name,
          email: user.email
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// API de productos
app.get('/api/top-products', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId, limit = 50 } = req.query;
    
    let query = `
      SELECT
        sp.name,
        sp.fixed_name,
        s.store_name,
        s.store_id,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue,
        AVG(sp.sale_price) as avg_price
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
      JOIN stores s ON sp.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;

    const params = [fromDate, toDate];

    if (storeId) {
      const storeIds = Array.isArray(storeId) ? storeId : [storeId];
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        query += ` AND sp.store_id IN (${placeholders})`;
        params.push(...storeIds);
      }
    }

    query += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    params.push(parseInt(limit));

    console.log('🔍 Query de productos:', query);
    console.log('📊 Parámetros:', params);

    const products = dbToUse.prepare(query).all(...params);
    
    console.log('✅ Productos obtenidos:', products.length);
    res.json({ success: true, data: products, total_records: products.length });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo productos' });
  }
});

// API de estadísticas
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId } = req.body;
    
    let query = `
      SELECT
        COUNT(DISTINCT so.linisco_id) as total_orders,
        COUNT(DISTINCT s.store_id) as total_stores,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;

    const params = [fromDate, toDate];

    if (storeId) {
      const storeIds = Array.isArray(storeId) ? storeId : [storeId];
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        query += ` AND so.store_id IN (${placeholders})`;
        params.push(...storeIds);
      }
    }

    console.log('🔍 Query de estadísticas:', query);
    console.log('📊 Parámetros:', params);

    const stats = dbToUse.prepare(query).get(...params);
    
    console.log('✅ Estadísticas obtenidas:', stats);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
  }
});

// API de sincronización
app.post('/api/sync', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31' } = req.body;
    
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
    
    const syncService = new MultiStoreSyncService();
    const result = await syncService.syncAllStores(fromDate, toDate);
    
    console.log('✅ Sincronización completada:', result);
    res.json({ 
      success: result.success, 
      message: `Sincronización completada con ${result.totalRecords} registros`,
      data: result
    });
  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ success: false, message: 'Error en sincronización: ' + error.message });
  }
});

// API de estado de sincronización
app.get('/api/sync/status', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Sistema de sincronización activo',
    timestamp: new Date().toISOString()
  });
});

// API de chat con IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context = 'general' } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mensaje requerido' });
    }

    const response = await aiGeminiService.generateResponse(message, context);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error en chat IA:', error);
    res.status(500).json({ success: false, message: 'Error en chat IA' });
  }
});

// API de generación de gráficos
app.post('/api/generate-chart', async (req, res) => {
  try {
    const { query, chartType = 'bar' } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Consulta requerida' });
    }

    const chartCode = await aiGeminiService.generateChartCode(query, chartType);
    res.json({ success: true, chartCode });
  } catch (error) {
    console.error('Error generando gráfico:', error);
    res.status(500).json({ success: false, message: 'Error generando gráfico' });
  }
});

// API de productos (para debugging)
app.get('/api/products', async (req, res) => {
  try {
    const products = dbToUse.prepare(`
      SELECT sp.*, so.order_date, s.store_name 
      FROM sale_products sp 
      JOIN sale_orders so ON sp.id_sale_order = so.linisco_id 
      JOIN stores s ON sp.store_id = s.store_id 
      ORDER BY so.order_date DESC 
      LIMIT 100
    `).all();
    
    console.log('✅ Productos obtenidos:', products.length);
    res.json({ success: true, data: products, total_records: products.length });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo productos' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor local ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log('✅ Server ready (local SQLite): ' + new Date().toISOString());
});

export default app;
