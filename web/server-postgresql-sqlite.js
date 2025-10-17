import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService-postgresql-sqlite.js';

// Configurar entorno para Railway
import '../scripts/configure-railway-env.js';
import '../railway-startup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de SQLite (simulando PostgreSQL)
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const sqliteDb = new Database(path.join(__dirname, '../data/linisco.db'));

console.log('🔍 Configuración de PostgreSQL (simulado con SQLite):');
console.log('- Base de datos: SQLite (simulando PostgreSQL)');
console.log('- Es Railway:', isRailway);

// Función helper para detectar el nombre de la columna de payment method
function getPaymentColumn(db) {
  try {
    // Intentar con payment_method primero (local)
    db.prepare(`SELECT payment_method FROM sale_orders LIMIT 1`).get();
    console.log('🔍 Detectada columna: payment_method (local)');
    return 'payment_method';
  } catch (error) {
    try {
      // Si falla, intentar con paymentmethod (producción)
      db.prepare(`SELECT paymentmethod FROM sale_orders LIMIT 1`).get();
      console.log('🔍 Detectada columna: paymentmethod (producción)');
      return 'paymentmethod';
    } catch (error2) {
      console.log('❌ No se pudo detectar la columna de payment method');
      console.log('🔍 Error payment_method:', error.message);
      console.log('🔍 Error paymentmethod:', error2.message);
      
      // Intentar detectar dinámicamente
      try {
        const tableInfo = db.prepare("PRAGMA table_info(sale_orders)").all();
        const paymentColumn = tableInfo.find(col => 
          col.name === 'payment_method' || col.name === 'paymentmethod'
        );
        
        if (paymentColumn) {
          console.log(`🔍 Detectada columna dinámicamente: ${paymentColumn.name}`);
          return paymentColumn.name;
        }
      } catch (error3) {
        console.log('❌ Error en detección dinámica:', error3.message);
      }
      
      return 'payment_method'; // Fallback
    }
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicializar base de datos SQLite (simulando PostgreSQL)
function initializeDatabase() {
  try {
    console.log('🔧 Inicializando base de datos (simulando PostgreSQL)...');
    
    // Crear tabla stores
    sqliteDb.prepare(`
      CREATE TABLE IF NOT EXISTS stores (
        store_id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        password TEXT,
        email TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    console.log('✅ Tabla stores creada');
    
    // Crear tabla sale_orders
    sqliteDb.prepare(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linisco_id INTEGER UNIQUE,
        shop_number TEXT,
        store_id TEXT REFERENCES stores(store_id),
        id_sale_order INTEGER,
        id_customer INTEGER,
        number INTEGER,
        order_date DATETIME,
        id_session INTEGER,
        payment_method TEXT,
        total REAL,
        discount REAL,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    console.log('✅ Tabla sale_orders creada');
    
    // Crear tabla sale_products
    sqliteDb.prepare(`
      CREATE TABLE IF NOT EXISTS sale_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linisco_id INTEGER,
        store_id TEXT REFERENCES stores(store_id),
        id_sale_order INTEGER,
        name TEXT,
        fixed_name TEXT,
        quantity INTEGER,
        sale_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    console.log('✅ Tabla sale_products creada');
    
    // Crear índices
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id)`).run();
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date)`).run();
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_orders_payment_method ON sale_orders(payment_method)`).run();
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_products_store_id ON sale_products(store_id)`).run();
    sqliteDb.prepare(`CREATE INDEX IF NOT EXISTS idx_sale_products_id_sale_order ON sale_products(id_sale_order)`).run();
    console.log('✅ Índices creados');
    
    // Insertar tiendas por defecto
    const stores = [
      { store_id: '66220', store_name: 'Subway Lacroze', password: 'subway123' },
      { store_id: '72267', store_name: 'Subway Corrientes', password: 'subway123' },
      { store_id: '63953', store_name: 'Subway Ortiz', password: 'subway123' },
      { store_id: '30036', store_name: 'Daniel Lacroze', password: 'daniel123' },
      { store_id: '10019', store_name: 'Daniel Ortiz', password: 'daniel123' },
      { store_id: '30038', store_name: 'Daniel Corrientes', password: 'daniel123' },
      { store_id: '30039', store_name: 'Seitu Juramento', password: 'seitu123' }
    ];
    
    for (const store of stores) {
      sqliteDb.prepare(`
        INSERT OR REPLACE INTO stores (store_id, store_name, password, email) 
        VALUES (?, ?, ?, ?)
      `).run(store.store_id, store.store_name, store.password, `${store.store_id}@example.com`);
      console.log(`✅ Tienda insertada: ${store.store_name}`);
    }
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Endpoint para inicializar base de datos
app.post('/api/init-db', (req, res) => {
  try {
    initializeDatabase();
    res.json({ success: true, message: 'Base de datos PostgreSQL (simulada) inicializada correctamente' });
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para estadísticas
app.post('/api/stats', (req, res) => {
  const { fromDate, toDate, storeId } = req.body;
  
  if (!fromDate || !toDate) {
    return res.status(400).json({ success: false, error: 'fromDate y toDate son requeridos' });
  }
  
  try {
    console.log('📊 Stats request - storeId:', storeId);
    console.log('📅 Fechas solicitadas - fromDate:', fromDate, 'toDate:', toDate);
    
    // Estadísticas generales
    let statsQuery = `
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
    
    // Manejar múltiples storeId si se proporcionan
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        statsQuery += ` AND so.store_id IN (${placeholders})`;
        params.push(...storeIds);
      }
    }
    
    const stats = sqliteDb.prepare(statsQuery).get(...params);
    
    // Detectar nombre de columna de payment method
    const paymentColumn = getPaymentColumn(sqliteDb);
    console.log('🔍 Columna de payment method detectada:', paymentColumn);
    console.log('🔍 Entorno actual:', {
      isRailway: isRailway,
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
    });
    
    // Desglose por medios de pago (categorización corregida)
    let paymentQuery = `
      SELECT 
        CASE 
          WHEN so.${paymentColumn} = 'cash' OR so.${paymentColumn} = 'cc_pedidosyaft' THEN 'Efectivo'
          WHEN so.${paymentColumn} = 'cc_rappiol' OR so.${paymentColumn} = 'cc_pedidosyaol' THEN 'Apps'
          ELSE 'Otros'
        END as payment_category,
        COUNT(*) as order_count,
        SUM(so.total - so.discount) as total_amount
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const paymentParams = [fromDate, toDate];
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        paymentQuery += ` AND so.store_id IN (${placeholders})`;
        paymentParams.push(...storeIds);
      }
    }
    
    paymentQuery += ` 
      GROUP BY 
        CASE 
          WHEN so.${paymentColumn} = 'cash' OR so.${paymentColumn} = 'cc_pedidosyaft' THEN 'Efectivo'
          WHEN so.${paymentColumn} = 'cc_rappiol' OR so.${paymentColumn} = 'cc_pedidosyaol' THEN 'Apps'
          ELSE 'Otros'
        END 
      ORDER BY total_amount DESC`;
    
    const paymentBreakdown = sqliteDb.prepare(paymentQuery).all(...paymentParams);
    console.log('🔍 Payment breakdown resultado:', paymentBreakdown);
    console.log('🔍 Parámetros de payment query:', paymentParams);
    console.log('🔍 Query de payment ejecutada:', paymentQuery);
    
    // Desglose por tienda (siempre mostrar, pero filtrar según selección)
    let storeQuery = `
      SELECT 
        s.store_id,
        s.store_name,
        COUNT(DISTINCT so.linisco_id) as order_count,
        SUM(so.total - so.discount) as revenue
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const storeParams = [fromDate, toDate];
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        storeQuery += ` AND so.store_id IN (${placeholders})`;
        storeParams.push(...storeIds);
      }
    }
    
    storeQuery += `
      GROUP BY s.store_id, s.store_name
      ORDER BY revenue DESC`;
    
    const storeBreakdown = sqliteDb.prepare(storeQuery).all(...storeParams);
    
    // Calcular porcentajes para tiendas
    const totalRevenue = parseFloat(stats.total_revenue) || 0;
    storeBreakdown.forEach(store => {
      store.percentage = totalRevenue > 0 ? (parseFloat(store.revenue) / totalRevenue) * 100 : 0;
    });
    
    // Productos más vendidos
    let productsQuery = `
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
    
    const productsParams = [fromDate, toDate];
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        productsQuery += ` AND sp.store_id IN (${placeholders})`;
        productsParams.push(...storeIds);
      }
    }
    
    productsQuery += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT ?`;
    
    productsParams.push(50); // Límite de 50 productos
    
    const products = sqliteDb.prepare(productsQuery).all(...productsParams);
    console.log('✅ Productos obtenidos:', products.length);
    
    // Calcular total de productos únicos
    const totalProducts = products.length;
    
    res.json({
      success: true,
      data: {
        ...stats,
        total_products: totalProducts,
        payment_breakdown: paymentBreakdown,
        store_breakdown: storeBreakdown,
        products: products
      }
    });
    
  } catch (error) {
    console.error('Error en /api/stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para obtener tiendas
app.get('/api/stores', (req, res) => {
  try {
    const stores = sqliteDb.prepare('SELECT store_id, store_name FROM stores ORDER BY store_name').all();
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para chat con IA
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Mensaje es requerido' });
    }
    
    const response = await aiGeminiService.generateResponse(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error en chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para gráficos con IA
app.post('/api/ai/charts', async (req, res) => {
  try {
    const { data, question } = req.body;
    
    if (!data || !question) {
      return res.status(400).json({ success: false, error: 'Datos y pregunta son requeridos' });
    }
    
    const response = await aiGeminiService.generateChartAnalysis(data, question);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error en análisis de gráficos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para sincronización
app.post('/api/sync', async (req, res) => {
  try {
    const { storeId, password, data } = req.body;
    
    if (!storeId || !password || !data) {
      return res.status(400).json({ success: false, error: 'storeId, password y data son requeridos' });
    }
    
    const syncService = new MultiStoreSyncService();
    const result = await syncService.syncStoreData(storeId, password, data);
    
    res.json(result);
  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicializar base de datos al iniciar
initializeDatabase();

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor PostgreSQL (simulado) ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`✅ Server ready (PostgreSQL simulated version): ${new Date().toISOString()}`);
});

export default app;
