import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import aiGeminiService from '../services/aiGeminiService.js';

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

// Detectar si estamos en Railway con PostgreSQL
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const hasPostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql');

let db;
let dbType;

if (isRailway && hasPostgreSQL) {
  // Usar PostgreSQL en Railway
  console.log('🐘 Usando PostgreSQL en Railway');
  dbType = 'postgresql';
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  db = {
    query: async (sql, params = []) => {
      const result = await pool.query(sql, params);
      return { rows: result.rows };
    },
    prepare: (sql) => ({
      run: async (...params) => {
        await pool.query(sql, params);
        return { changes: 1 };
      },
      get: async (...params) => {
        const result = await pool.query(sql, params);
        return result.rows[0] || null;
      },
      all: async (...params) => {
        const result = await pool.query(sql, params);
        return result.rows;
      }
    })
  };
} else {
  // Usar SQLite localmente
  console.log('🗄️ Usando SQLite localmente');
  dbType = 'sqlite';
  db = new Database(path.join(__dirname, '../data/linisco.db'));
}

// Función para detectar columna de método de pago
function getPaymentColumn() {
  if (dbType === 'postgresql') {
    return 'paymentmethod'; // PostgreSQL usa el nombre de la API
  } else {
    // SQLite - detectar dinámicamente
    try {
      db.prepare(`SELECT payment_method FROM sale_orders LIMIT 1`).get();
      return 'payment_method';
    } catch (error) {
      try {
        db.prepare(`SELECT paymentmethod FROM sale_orders LIMIT 1`).get();
        return 'paymentmethod';
      } catch (error2) {
        return 'payment_method'; // Fallback
      }
    }
  }
}

// Inicializar base de datos
async function initializeDatabase() {
  try {
    if (dbType === 'postgresql') {
      console.log('🔧 Inicializando PostgreSQL en Railway...');
      
      // Leer y ejecutar schema
      const schemaPath = path.join(__dirname, '../schemas/postgresql-schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      await db.query(schema);
      console.log('✅ Schema PostgreSQL ejecutado');
      
    } else {
      console.log('🔧 Inicializando SQLite...');
      
      // Crear tablas SQLite
      db.prepare(`
        CREATE TABLE IF NOT EXISTS stores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          store_id TEXT UNIQUE NOT NULL,
          store_name TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      db.prepare(`
        CREATE TABLE IF NOT EXISTS sale_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          linisco_id INTEGER NOT NULL,
          shop_number TEXT NOT NULL,
          store_id TEXT NOT NULL,
          id_sale_order INTEGER NOT NULL,
          id_customer INTEGER DEFAULT 0,
          number INTEGER DEFAULT 0,
          order_date DATETIME NOT NULL,
          id_session INTEGER NOT NULL,
          payment_method TEXT NOT NULL,
          total REAL NOT NULL,
          discount REAL DEFAULT 0.0,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      db.prepare(`
        CREATE TABLE IF NOT EXISTS sale_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          linisco_id INTEGER NOT NULL,
          shop_number TEXT NOT NULL,
          store_id TEXT NOT NULL,
          id_sale_product INTEGER NOT NULL,
          id_sale_order INTEGER NOT NULL,
          id_product INTEGER,
          id_control_sheet_def INTEGER,
          name TEXT,
          fixed_name TEXT,
          quantity INTEGER NOT NULL,
          sale_price REAL NOT NULL,
          synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      
      // Insertar tiendas
      const stores = [
        { store_id: '66220', store_name: 'Subway Lacroze', password: 'subway123' },
        { store_id: '66221', store_name: 'Subway Corrientes', password: 'subway123' },
        { store_id: '66222', store_name: 'Subway Ortiz', password: 'subway123' },
        { store_id: '10019', store_name: 'Daniel Lacroze', password: 'daniel123' },
        { store_id: '30038', store_name: 'Daniel Corrientes', password: 'daniel123' },
        { store_id: '10019', store_name: 'Daniel Ortiz', password: 'daniel123' },
        { store_id: '30039', store_name: 'Seitu Juramento', password: 'seitu123' }
      ];
      
      for (const store of stores) {
        db.prepare(`
          INSERT OR REPLACE INTO stores (store_id, store_name, email, password) 
          VALUES (?, ?, ?, ?)
        `).run(store.store_id, store.store_name, `${store.store_id}@linisco.com.ar`, store.password);
      }
      
      console.log('✅ Base de datos SQLite inicializada');
    }
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
}

// Endpoint para estadísticas
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
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const statsParams = [fromDate, toDate];
    
    if (storeId && storeId.length > 0) {
      if (dbType === 'postgresql') {
        statsQuery += ` AND so.store_id = ANY($3)`;
      } else {
        statsQuery += ` AND so.store_id IN (${storeId.map(() => '?').join(',')})`;
      }
      statsParams.push(...(Array.isArray(storeId) ? storeId : [storeId]));
    }
    
    const statsResult = await db.query(statsQuery, statsParams);
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
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const paymentParams = [fromDate, toDate];
    
    if (storeId && storeId.length > 0) {
      if (dbType === 'postgresql') {
        paymentQuery += ` AND so.store_id = ANY($3)`;
      } else {
        paymentQuery += ` AND so.store_id IN (${storeId.map(() => '?').join(',')})`;
      }
      paymentParams.push(...(Array.isArray(storeId) ? storeId : [storeId]));
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
    
    const paymentResult = await db.query(paymentQuery, paymentParams);
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
      JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
      JOIN stores s ON sp.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const productsParams = [fromDate, toDate];
    
    if (storeId && storeId.length > 0) {
      if (dbType === 'postgresql') {
        productsQuery += ` AND sp.store_id = ANY($3)`;
      } else {
        productsQuery += ` AND sp.store_id IN (${storeId.map(() => '?').join(',')})`;
      }
      productsParams.push(...(Array.isArray(storeId) ? storeId : [storeId]));
    }
    
    productsQuery += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    
    productsParams.push(50);
    
    const productsResult = await db.query(productsQuery, productsParams);
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
    const result = await db.query('SELECT store_id, store_name FROM stores ORDER BY store_name');
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
    
    // Verificar credenciales
    const storeResult = await db.query(
      'SELECT store_id, store_name FROM stores WHERE store_id = ? AND password = ?',
      [storeId, password]
    );
    
    if (storeResult.rows.length === 0) {
      return res.json({ success: false, error: 'Credenciales inválidas' });
    }
    
    const store = storeResult.rows[0];
    console.log(`🔄 Sincronizando datos para ${store.store_name} (${storeId})`);
    
    let ordersProcessed = 0;
    let productsProcessed = 0;
    
    // Procesar órdenes
    if (data.orders && data.orders.length > 0) {
      console.log(`📦 Procesando ${data.orders.length} órdenes`);
      
      for (const order of data.orders) {
        if (dbType === 'postgresql') {
          await db.query(`
            INSERT INTO sale_orders (
              linisco_id, shop_number, store_id, id_sale_order, id_customer, 
              number, order_date, id_session, paymentmethod, total, discount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (linisco_id, store_id) 
            DO UPDATE SET
              shop_number = EXCLUDED.shop_number,
              id_sale_order = EXCLUDED.id_sale_order,
              id_customer = EXCLUDED.id_customer,
              number = EXCLUDED.number,
              order_date = EXCLUDED.order_date,
              id_session = EXCLUDED.id_session,
              paymentmethod = EXCLUDED.paymentmethod,
              total = EXCLUDED.total,
              discount = EXCLUDED.discount,
              synced_at = CURRENT_TIMESTAMP
          `, [
            order.linisco_id,
            order.shop_number || order.shopNumber,
            storeId,
            order.id_sale_order || order.idSaleOrder,
            order.id_customer || order.idCustomer || 0,
            order.number || 0,
            order.order_date || order.orderDate,
            order.id_session || order.idSession,
            order.paymentmethod || order.paymentMethod,
            order.total,
            order.discount || 0.0
          ]);
        } else {
          db.prepare(`
            INSERT OR REPLACE INTO sale_orders (
              linisco_id, shop_number, store_id, id_sale_order, id_customer, 
              number, order_date, id_session, payment_method, total, discount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            order.linisco_id,
            order.shop_number || order.shopNumber,
            storeId,
            order.id_sale_order || order.idSaleOrder,
            order.id_customer || order.idCustomer || 0,
            order.number || 0,
            order.order_date || order.orderDate,
            order.id_session || order.idSession,
            order.paymentmethod || order.paymentMethod,
            order.total,
            order.discount || 0.0
          );
        }
      }
      ordersProcessed = data.orders.length;
    }
    
    // Procesar productos
    if (data.products && data.products.length > 0) {
      console.log(`🛍️ Procesando ${data.products.length} productos`);
      
      for (const product of data.products) {
        if (dbType === 'postgresql') {
          await db.query(`
            INSERT INTO sale_products (
              linisco_id, shop_number, store_id, id_sale_product, id_sale_order, 
              id_product, id_control_sheet_def, name, fixed_name, quantity, sale_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (linisco_id, store_id) 
            DO UPDATE SET
              shop_number = EXCLUDED.shop_number,
              id_sale_product = EXCLUDED.id_sale_product,
              id_sale_order = EXCLUDED.id_sale_order,
              id_product = EXCLUDED.id_product,
              id_control_sheet_def = EXCLUDED.id_control_sheet_def,
              name = EXCLUDED.name,
              fixed_name = EXCLUDED.fixed_name,
              quantity = EXCLUDED.quantity,
              sale_price = EXCLUDED.sale_price,
              synced_at = CURRENT_TIMESTAMP
          `, [
            product.linisco_id,
            product.shop_number || product.shopNumber,
            storeId,
            product.id_sale_product || product.idSaleProduct,
            product.id_sale_order || product.idSaleOrder,
            product.id_product || product.idProduct,
            product.id_control_sheet_def || product.idControlSheetDef,
            product.name,
            product.fixed_name,
            product.quantity,
            product.sale_price || product.salePrice
          ]);
        } else {
          db.prepare(`
            INSERT OR REPLACE INTO sale_products (
              linisco_id, shop_number, store_id, id_sale_product, id_sale_order, 
              id_product, id_control_sheet_def, name, fixed_name, quantity, sale_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            product.linisco_id,
            product.shop_number || product.shopNumber,
            storeId,
            product.id_sale_product || product.idSaleProduct,
            product.id_sale_order || product.idSaleOrder,
            product.id_product || product.idProduct,
            product.id_control_sheet_def || product.idControlSheetDef,
            product.name,
            product.fixed_name,
            product.quantity,
            product.sale_price || product.salePrice
          );
        }
      }
      productsProcessed = data.products.length;
    }
    
    console.log(`✅ Sincronización completada para ${store.store_name}`);
    
    res.json({
      success: true,
      message: `Datos sincronizados correctamente para ${store.store_name}`,
      orders_processed: ordersProcessed,
      products_processed: productsProcessed
    });
    
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
  console.log(`🔍 Configuración de servidor híbrido:`);
  console.log(`- Base de datos: ${dbType.toUpperCase()}`);
  console.log(`- Es Railway: ${isRailway}`);
  console.log(`- Puerto: ${PORT}`);
  console.log(`🌐 Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  console.log(`✅ Server ready (Hybrid version): ${new Date().toISOString()}`);
});

export default app;
