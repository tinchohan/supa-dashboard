import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDatabase, getDatabase } from './database/connection.js';
import LiniscoSyncService from './services/liniscoSync.js';
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
    const { fromDate = '2025-01-01', toDate = '2025-12-31' } = req.body;
    
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
    
    const db = await getDatabase();
    const result = await syncService.syncAllStores(fromDate, toDate, db);
    
    res.json({ 
      success: true, 
      message: `Sincronización completada con ${result.totalRecords} registros`,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener tiendas
app.get('/api/stores', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = await db.query('SELECT store_id, store_name FROM stores ORDER BY store_name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error obteniendo tiendas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estadísticas generales
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.body;
    const db = await getDatabase();
    
    // Construir filtro de tiendas
    let storeFilter = '';
    let params = [fromDate, toDate];
    
    if (storeId && storeId.length > 0) {
      const placeholders = storeId.map((_, i) => `$${i + 3}`).join(',');
      storeFilter = `AND so.store_id IN (${placeholders})`;
      params = params.concat(storeId);
    }
    
    // Estadísticas generales
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as average_order_value
      FROM sale_orders so
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
      ${storeFilter}
    `;
    
    const statsResult = await db.query(statsQuery, params);
    const stats = statsResult.rows[0];
    
    // Desglose por método de pago
    const paymentQuery = `
      SELECT
        CASE
          WHEN so.paymentmethod = 'cash' OR so.paymentmethod = 'cc_pedidosyaft' THEN 'Efectivo'
          WHEN so.paymentmethod = 'cc_rappiol' OR so.paymentmethod = 'cc_pedidosyaol' THEN 'Apps'
          ELSE 'Otros'
        END as payment_category,
        COUNT(*) as order_count,
        SUM(so.total - so.discount) as total_amount
      FROM sale_orders so
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
      ${storeFilter}
      GROUP BY
        CASE
          WHEN so.paymentmethod = 'cash' OR so.paymentmethod = 'cc_pedidosyaft' THEN 'Efectivo'
          WHEN so.paymentmethod = 'cc_rappiol' OR so.paymentmethod = 'cc_pedidosyaol' THEN 'Apps'
          ELSE 'Otros'
        END
      ORDER BY total_amount DESC
    `;
    
    const paymentResult = await db.query(paymentQuery, params);
    
    // Top 5 productos
    const productsQuery = `
      SELECT
        sp.name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
      WHERE DATE(so.order_date) BETWEEN $1 AND $2
      ${storeFilter}
      GROUP BY sp.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `;
    
    const productsResult = await db.query(productsQuery, params);
    
    // Desglose por tienda
    const storesQuery = `
      SELECT
        s.store_name,
        COUNT(so.id) as order_count,
        SUM(so.total - so.discount) as total_amount
      FROM stores s
      LEFT JOIN sale_orders so ON s.store_id = so.store_id 
        AND DATE(so.order_date) BETWEEN $1 AND $2
      GROUP BY s.store_id, s.store_name
      ORDER BY total_amount DESC
    `;
    
    const storesResult = await db.query(storesQuery, [fromDate, toDate]);
    
    res.json({
      success: true,
      data: {
        totalOrders: parseInt(stats.total_orders) || 0,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        averageOrderValue: parseFloat(stats.average_order_value) || 0,
        paymentBreakdown: paymentResult.rows,
        topProducts: productsResult.rows,
        storeBreakdown: storesResult.rows
      }
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
