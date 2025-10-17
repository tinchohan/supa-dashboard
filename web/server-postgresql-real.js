import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService-postgresql.js';

// Configurar entorno para Railway
import '../scripts/configure-railway-env.js';
import '../railway-startup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'linisco_db',
  password: process.env.PGPASSWORD || 'password',
  port: process.env.PGPORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para detectar columna de método de pago
function getPaymentColumn() {
  // En PostgreSQL real, siempre usamos 'paymentmethod' según la API
  return 'paymentmethod';
}

// Inicializar base de datos PostgreSQL
async function initializeDatabase() {
  try {
    console.log('🔧 Inicializando base de datos PostgreSQL...');
    
    // Leer y ejecutar schema
    const schemaPath = path.join(__dirname, '../schemas/postgresql-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Schema PostgreSQL ejecutado correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos PostgreSQL:', error);
  }
}

// Endpoint para inicializar base de datos
app.post('/api/init-db', async (req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true, message: 'Base de datos PostgreSQL inicializada' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para estadísticas generales
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.body;
    
    console.log('📊 Stats request - storeId:', storeId);
    console.log('📅 Fechas solicitadas - fromDate:', fromDate, 'toDate:', toDate);
    
    const paymentColumn = getPaymentColumn();
    console.log('🔍 Columna de payment method detectada:', paymentColumn);
    
    // Query para estadísticas generales
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT so.id_sale_order) as total_orders,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT s.store_id) as total_stores
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
    `;
    
    const statsParams = [fromDate, toDate];
    
    if (storeId && storeId.length > 0) {
      statsQuery += ` AND so.store_id = ANY($3)`;
      statsParams.push(storeId);
    }
    
    const statsResult = await pool.query(statsQuery, statsParams);
    const stats = statsResult.rows[0];
    
    // Query para breakdown de métodos de pago
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
    
    if (storeId && storeId.length > 0) {
      paymentQuery += ` AND so.store_id = ANY($3)`;
      paymentParams.push(storeId);
    }
    
    paymentQuery += `
      GROUP BY
        CASE
          WHEN so.${paymentColumn} = 'cash' OR so.${paymentColumn} = 'cc_pedidosyaft' THEN 'Efectivo'
          WHEN so.${paymentColumn} = 'cc_rappiol' OR so.${paymentColumn} = 'cc_pedidosyaol' THEN 'Apps'
          ELSE 'Otros'
        END
      ORDER BY total_amount DESC
    `;
    
    const paymentResult = await pool.query(paymentQuery, paymentParams);
    console.log('🔍 Payment breakdown resultado:', paymentResult.rows);
    
    // Query para productos más vendidos
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
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order AND sp.store_id = so.store_id
      JOIN stores s ON sp.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
    `;
    
    const productsParams = [fromDate, toDate];
    
    if (storeId && storeId.length > 0) {
      productsQuery += ` AND sp.store_id = ANY($3)`;
      productsParams.push(storeId);
    }
    
    productsQuery += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT $${productsParams.length + 1}
    `;
    
    productsParams.push(50);
    
    const productsResult = await pool.query(productsQuery, productsParams);
    console.log('✅ Productos obtenidos:', productsResult.rows.length);
    
    res.json({
      success: true,
      data: {
        ...stats,
        payment_breakdown: paymentResult.rows,
        top_products: productsResult.rows
      }
    });
    
  } catch (error) {
    console.error('❌ Error en /api/stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para obtener tiendas
app.get('/api/stores', async (req, res) => {
  try {
    const result = await pool.query('SELECT store_id, store_name FROM stores ORDER BY store_name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error en /api/stores:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para sincronización
app.post('/api/sync', async (req, res) => {
  try {
    const { storeId, password, data } = req.body;
    
    const syncService = new MultiStoreSyncService(pool);
    const result = await syncService.syncStoreData(storeId, password, data);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error en /api/sync:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para chat con AI
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const response = await aiGeminiService.generateResponse(message, context);
    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ Error en /api/chat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para gráficos con AI
app.post('/api/ai/charts', async (req, res) => {
  try {
    const { data, chartType } = req.body;
    const response = await aiGeminiService.generateChartAnalysis(data, chartType);
    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ Error en /api/ai/charts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicializar base de datos al arrancar
initializeDatabase();

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🔍 Configuración de PostgreSQL:');
  console.log('- Base de datos: PostgreSQL (real)');
  console.log('- Es Railway:', process.env.RAILWAY_ENVIRONMENT ? true : false);
  console.log(`🌐 Servidor PostgreSQL ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`✅ Server ready (PostgreSQL real version): ${new Date().toISOString()}`);
});

export default app;
