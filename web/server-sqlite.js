import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db as sqliteDb } from '../config/database.js';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService-sqlite.js';

// Configurar entorno para Railway
import '../scripts/configure-railway-env.js';
import '../railway-startup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Usar SQLite siempre (más simple y flexible)
const dbToUse = sqliteDb;

console.log('🔍 Configuración de servidor SQLite:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('- Base de datos: SQLite (simplificado)');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Servir archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Ruta específica para login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// API de autenticación única
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    // Credenciales únicas para acceder al dashboard
    const validCredentials = {
      username: 'admin',
      password: 'linisco2025'
    };

    if (username === validCredentials.username && password === validCredentials.password) {
      res.json({ 
        success: true, 
        message: 'Autenticación exitosa',
        redirect: '/',
        user: {
          username: username,
          role: 'admin'
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

// API de autenticación para tiendas (mantener compatibilidad)
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

// API para inicializar base de datos
app.post('/api/init-db', async (req, res) => {
  try {
    console.log('🔧 Inicializando base de datos SQLite...');
    
    // Crear directorio para la base de datos si no existe
    const dbDir = '/app/data';
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('✅ Directorio /app/data creado');
    }

    // Crear tablas
    dbToUse.exec(`
      CREATE TABLE IF NOT EXISTS stores (
        store_id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla stores creada');

    dbToUse.exec(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        linisco_id INTEGER PRIMARY KEY,
        shop_number TEXT,
        store_id TEXT NOT NULL,
        id_sale_order INTEGER,
        order_date TIMESTAMP NOT NULL,
        id_session INTEGER,
        payment_method TEXT,
        total DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(store_id)
      )
    `);
    console.log('✅ Tabla sale_orders creada');

    dbToUse.exec(`
      CREATE TABLE IF NOT EXISTS sale_products (
        linisco_id INTEGER PRIMARY KEY,
        shop_number TEXT,
        store_id TEXT NOT NULL,
        id_sale_product INTEGER,
        id_sale_order INTEGER,
        name TEXT NOT NULL,
        fixed_name TEXT,
        quantity INTEGER NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(store_id),
        FOREIGN KEY (id_sale_order) REFERENCES sale_orders(linisco_id)
      )
    `);
    console.log('✅ Tabla sale_products creada');

    // Crear índices
    dbToUse.exec(`
      CREATE INDEX IF NOT EXISTS idx_sale_orders_date ON sale_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_sale_orders_store ON sale_orders(store_id);
      CREATE INDEX IF NOT EXISTS idx_sale_products_order ON sale_products(id_sale_order);
      CREATE INDEX IF NOT EXISTS idx_sale_products_store ON sale_products(store_id);
    `);
    console.log('✅ Índices creados');

    // Insertar tiendas
    const stores = [
      { id: '63953', name: 'Subway Lacroze', email: '63953@linisco.com.ar', password: '63953hansen' },
      { id: '66220', name: 'Subway Corrientes', email: '66220@linisco.com.ar', password: '66220hansen' },
      { id: '72267', name: 'Subway Ortiz', email: '72267@linisco.com.ar', password: '72267hansen' },
      { id: '30036', name: 'Daniel Lacroze', email: '30036@linisco.com.ar', password: '30036hansen' },
      { id: '30038', name: 'Daniel Corrientes', email: '30038@linisco.com.ar', password: '30038hansen' },
      { id: '10019', name: 'Daniel Ortiz', email: '10019@linisco.com.ar', password: '10019hansen' },
      { id: '10020', name: 'Seitu Juramento', email: '10020@linisco.com.ar', password: '10020hansen' }
    ];

    const insertStore = dbToUse.prepare(`
      INSERT OR REPLACE INTO stores (store_id, store_name, email, password)
      VALUES (?, ?, ?, ?)
    `);

    for (const store of stores) {
      insertStore.run(store.id, store.name, store.email, store.password);
      console.log(`✅ Tienda insertada: ${store.name}`);
    }

    res.json({ 
      success: true, 
      message: 'Base de datos SQLite inicializada correctamente',
      stores: stores.length
    });

  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error inicializando base de datos: ' + error.message 
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor SQLite ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log('✅ Server ready (SQLite version): ' + new Date().toISOString());
});

export default app;
