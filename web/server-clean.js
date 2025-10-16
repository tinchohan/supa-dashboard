import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db as postgresDb, initializeDatabase } from '../config/database-postgres.js';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar PostgreSQL
let dbReady = false;
initializeDatabase()
  .then(() => {
    console.log('✅ PostgreSQL inicializado correctamente');
    dbReady = true;
  })
  .catch((error) => {
    console.error('❌ Error inicializando PostgreSQL:', error);
    process.exit(1);
  });

// Middleware de autenticación simple
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === 'Bearer authenticated') {
    return next();
  }
  res.status(401).json({ success: false, message: 'No autorizado' });
};

// Endpoints de autenticación
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'H4' && password === 'SRL') {
    res.json({ 
      success: true, 
      message: 'Login exitoso',
      redirect: '/'
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Credenciales incorrectas' 
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logout exitoso' });
});

// Servir página principal
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Estado de sincronización
let syncStatus = {
  state: 'idle',
  startedAt: null,
  finishedAt: null,
  summary: null,
  error: null
};

let isSyncing = false;

// Endpoint de sincronización
app.post('/api/sync', async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ success: false, message: 'Base de datos no lista' });
  }

  if (isSyncing) {
    return res.status(429).json({ success: false, message: 'Sincronización en curso' });
  }

  const { fromDate, toDate } = req.body || {};
  console.log(`🔄 Iniciando sync: ${fromDate} → ${toDate}`);

  isSyncing = true;
  syncStatus = {
    state: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    summary: null,
    error: null
  };

  res.status(202).json({ 
    success: true, 
    message: 'Sincronización iniciada',
    statusUrl: '/api/sync/status'
  });

  // Ejecutar en background
  setImmediate(async () => {
    try {
      const syncService = new MultiStoreSyncService();
      const result = await syncService.syncAllStores(fromDate, toDate);
      
      if (result.success) {
        console.log(`✅ Sync completado: ${result.totalRecords} registros`);
        syncStatus = {
          state: 'success',
          startedAt: syncStatus.startedAt,
          finishedAt: new Date().toISOString(),
          summary: {
            totalRecords: result.totalRecords,
            storesProcessed: result.results.length,
            errors: result.errors.length
          },
          error: null
        };
      } else {
        console.error('❌ Error en sync:', result.error);
        syncStatus = {
          state: 'error',
          startedAt: syncStatus.startedAt,
          finishedAt: new Date().toISOString(),
          summary: null,
          error: result.error
        };
      }
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      syncStatus = {
        state: 'error',
        startedAt: syncStatus.startedAt,
        finishedAt: new Date().toISOString(),
        summary: null,
        error: error.message
      };
    } finally {
      isSyncing = false;
    }
  });
});

// Estado de sincronización
app.get('/api/sync/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    syncing: isSyncing,
    status: syncStatus
  });
});

// API de tiendas
app.get('/api/stores', async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ success: false, message: 'Base de datos no lista' });
  }

  try {
    const stores = await postgresDb.prepare('SELECT store_id, store_name FROM stores ORDER BY store_name').all();
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo tiendas' });
  }
});

// API de estadísticas
app.post('/api/stats', async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ success: false, message: 'Base de datos no lista' });
  }

  try {
    const { fromDate, toDate, storeId } = req.body;
    
    let query = `
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT s.store_id) as total_stores,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT so.order_date::date) as days_with_sales
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE so.order_date::date BETWEEN $1::date AND $2::date
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    if (storeId && storeId.length > 0) {
      const placeholders = storeId.map((_, i) => `$${i + 3}`).join(',');
      query += ` AND so.store_id IN (${placeholders})`;
      params.push(...storeId);
    }

    const stats = await postgresDb.prepare(query).get(...params);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
  }
});

// API de productos
app.get('/api/top-products', async (req, res) => {
  if (!dbReady) {
    return res.status(503).json({ success: false, message: 'Base de datos no lista' });
  }

  try {
    const { fromDate, toDate, storeId, limit = 20 } = req.query;
    
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
      JOIN sale_orders so ON sp.id_sale_order = so.id
      JOIN stores s ON sp.store_id = s.store_id
      WHERE so.order_date::date BETWEEN $1::date AND $2::date
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    if (storeId && storeId.length > 0) {
      const placeholders = storeId.map((_, i) => `$${i + 3}`).join(',');
      query += ` AND sp.store_id IN (${placeholders})`;
      params.push(...storeId);
    }
    
    query += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT $${params.length + 1}
    `;
    params.push(parseInt(limit));

    const products = await postgresDb.prepare(query).all(...params);
    res.json({ success: true, data: products, total_records: products.length });
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo productos' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor web ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log('✅ Server ready (build timestamp): ' + new Date().toISOString());
});

export default app;
