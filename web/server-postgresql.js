import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService-postgresql.js';

// Configurar entorno para Railway
import '../scripts/configure-railway-env.js';
import '../railway-startup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de PostgreSQL
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/linisco_db';

console.log('🔍 Configuración de PostgreSQL:');
console.log('- DATABASE_URL:', DATABASE_URL ? 'Configurada' : 'No configurada');
console.log('- Es Railway:', isRailway);

// Crear pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: isRailway ? { rejectUnauthorized: false } : false
});

// Función helper para detectar el nombre de la columna de payment method
async function getPaymentColumn(client) {
  try {
    // Intentar con payment_method primero (local)
    await client.query('SELECT payment_method FROM sale_orders LIMIT 1');
    console.log('🔍 Detectada columna: payment_method (local)');
    return 'payment_method';
  } catch (error) {
    try {
      // Si falla, intentar con paymentmethod (producción)
      await client.query('SELECT paymentmethod FROM sale_orders LIMIT 1');
      console.log('🔍 Detectada columna: paymentmethod (producción)');
      return 'paymentmethod';
    } catch (error2) {
      console.log('❌ No se pudo detectar la columna de payment method');
      console.log('🔍 Error payment_method:', error.message);
      console.log('🔍 Error paymentmethod:', error2.message);
      
      // Intentar detectar dinámicamente
      try {
        const result = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'sale_orders' 
          AND column_name IN ('payment_method', 'paymentmethod')
        `);
        
        if (result.rows.length > 0) {
          const columnName = result.rows[0].column_name;
          console.log(`🔍 Detectada columna dinámicamente: ${columnName}`);
          return columnName;
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

// Inicializar base de datos PostgreSQL
async function initializePostgreSQL() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Inicializando base de datos PostgreSQL...');
    
    // Crear tabla stores
    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        store_id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla stores creada');
    
    // Crear tabla sale_orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        id SERIAL PRIMARY KEY,
        linisco_id INTEGER UNIQUE,
        shop_number TEXT,
        store_id TEXT REFERENCES stores(store_id),
        id_sale_order INTEGER,
        id_customer INTEGER,
        number INTEGER,
        order_date TIMESTAMP,
        id_session INTEGER,
        payment_method TEXT,
        total DECIMAL(10,2),
        discount DECIMAL(10,2),
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla sale_orders creada');
    
    // Crear tabla sale_products
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_products (
        id SERIAL PRIMARY KEY,
        linisco_id INTEGER,
        store_id TEXT REFERENCES stores(store_id),
        id_sale_order INTEGER,
        name TEXT,
        fixed_name TEXT,
        quantity INTEGER,
        sale_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla sale_products creada');
    
    // Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id);
      CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_sale_orders_payment_method ON sale_orders(payment_method);
      CREATE INDEX IF NOT EXISTS idx_sale_products_store_id ON sale_products(store_id);
      CREATE INDEX IF NOT EXISTS idx_sale_products_id_sale_order ON sale_products(id_sale_order);
    `);
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
      await client.query(`
        INSERT INTO stores (store_id, store_name, password) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (store_id) DO UPDATE SET 
          store_name = EXCLUDED.store_name,
          password = EXCLUDED.password,
          updated_at = CURRENT_TIMESTAMP
      `, [store.store_id, store.store_name, store.password]);
      console.log(`✅ Tienda insertada: ${store.store_name}`);
    }
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  } finally {
    client.release();
  }
}

// Endpoint para inicializar base de datos
app.post('/api/init-db', async (req, res) => {
  try {
    await initializePostgreSQL();
    res.json({ success: true, message: 'Base de datos PostgreSQL inicializada correctamente' });
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para estadísticas
app.post('/api/stats', async (req, res) => {
  const { fromDate, toDate, storeId } = req.body;
  
  if (!fromDate || !toDate) {
    return res.status(400).json({ success: false, error: 'fromDate y toDate son requeridos' });
  }
  
  const client = await pool.connect();
  
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
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
    `;
    
    const params = [fromDate, toDate];
    let paramCount = 2;
    
    // Manejar múltiples storeId si se proporcionan
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map((_, index) => `$${paramCount + index + 1}`).join(',');
        statsQuery += ` AND so.store_id IN (${placeholders})`;
        params.push(...storeIds);
        paramCount += storeIds.length;
      }
    }
    
    const statsResult = await client.query(statsQuery, params);
    const stats = statsResult.rows[0];
    
    // Detectar nombre de columna de payment method
    const paymentColumn = await getPaymentColumn(client);
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
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
    `;
    
    const paymentParams = [fromDate, toDate];
    let paymentParamCount = 2;
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map((_, index) => `$${paymentParamCount + index + 1}`).join(',');
        paymentQuery += ` AND so.store_id IN (${placeholders})`;
        paymentParams.push(...storeIds);
        paymentParamCount += storeIds.length;
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
    
    const paymentResult = await client.query(paymentQuery, paymentParams);
    const paymentBreakdown = paymentResult.rows;
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
        WHERE DATE(so.order_date) BETWEEN $1 AND $2
    `;
    
    const storeParams = [fromDate, toDate];
    let storeParamCount = 2;
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map((_, index) => `$${storeParamCount + index + 1}`).join(',');
        storeQuery += ` AND so.store_id IN (${placeholders})`;
        storeParams.push(...storeIds);
        storeParamCount += storeIds.length;
      }
    }
    
    storeQuery += `
      GROUP BY s.store_id, s.store_name
      ORDER BY revenue DESC`;
    
    const storeResult = await client.query(storeQuery, storeParams);
    const storeBreakdown = storeResult.rows;
    
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
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
    `;
    
    const productsParams = [fromDate, toDate];
    let productsParamCount = 2;
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map((_, index) => `$${productsParamCount + index + 1}`).join(',');
        productsQuery += ` AND sp.store_id IN (${placeholders})`;
        productsParams.push(...storeIds);
        productsParamCount += storeIds.length;
      }
    }
    
    productsQuery += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT $${productsParamCount + 1}`;
    
    productsParams.push(50); // Límite de 50 productos
    
    const productsResult = await client.query(productsQuery, productsParams);
    const products = productsResult.rows;
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
  } finally {
    client.release();
  }
});

// Endpoint para obtener tiendas
app.get('/api/stores', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT store_id, store_name FROM stores ORDER BY store_name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
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
initializePostgreSQL().then(() => {
  console.log('✅ Base de datos PostgreSQL inicializada');
}).catch(error => {
  console.error('❌ Error inicializando base de datos:', error);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor PostgreSQL ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`✅ Server ready (PostgreSQL version): ${new Date().toISOString()}`);
});

export default app;
