import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
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
// En Railway, usar la misma ruta que el endpoint de inicialización
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const dbToUse = isRailway ? new Database('/app/data/linisco.db') : sqliteDb;

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

    // Credenciales únicas para acceder al dashboard (desde variables de entorno)
    const validCredentials = {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'linisco2025'
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

// API de estadísticas completas
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId } = req.body;
    
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
      
      console.log('🏪 StoreIds procesados:', storeIds);
      console.log('🏪 Tipos de storeIds:', storeIds.map(id => typeof id));
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        statsQuery += ` AND so.store_id IN (${placeholders})`;
        params.push(...storeIds);
      }
    }
    
    console.log('🔍 Query de estadísticas:', statsQuery);
    console.log('📊 Parámetros:', params);
    
    const stats = dbToUse.prepare(statsQuery).get(...params);
    
    // Desglose por medios de pago (categorización específica)
    let paymentQuery = `
      SELECT 
        CASE 
          WHEN so.payment_method = 'cash' OR so.payment_method = 'pedidosyaef' THEN 'Efectivo + PedidosYa EF'
          WHEN so.payment_method = 'rappiol' OR so.payment_method = 'pedidosyaol' THEN 'Rappi + PedidosYa OL'
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
          WHEN so.payment_method = 'cash' OR so.payment_method = 'pedidosyaef' THEN 'Efectivo + PedidosYa EF'
          WHEN so.payment_method = 'rappiol' OR so.payment_method = 'pedidosyaol' THEN 'Rappi + PedidosYa OL'
          ELSE 'Otros'
        END 
      ORDER BY total_amount DESC`;
    
    const paymentStmt = dbToUse.prepare(paymentQuery);
    const paymentBreakdown = paymentStmt.all(...paymentParams);
    
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
        ORDER BY revenue DESC
      `;
      
    const storeStmt = dbToUse.prepare(storeQuery);
    const storeResults = storeStmt.all(...storeParams);
    
    // Calcular porcentajes
    const totalRevenue = storeResults.reduce((sum, store) => sum + store.revenue, 0);
    const storeBreakdown = storeResults.map(store => ({
      ...store,
      percentage: totalRevenue > 0 ? (store.revenue / totalRevenue) * 100 : 0
    }));
    
    // Contar productos únicos
    let productQuery = `
      SELECT COUNT(DISTINCT sp.name) as total_products
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const productParams = [fromDate, toDate];
    
    if (storeId) {
      let storeIds;
      if (Array.isArray(storeId)) {
        storeIds = storeId;
      } else {
        storeIds = [storeId];
      }
      
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        productQuery += ` AND so.store_id IN (${placeholders})`;
        productParams.push(...storeIds);
      }
    }
    
    const productStmt = dbToUse.prepare(productQuery);
    const productResult = productStmt.get(...productParams);
    
    console.log('✅ Estadísticas obtenidas:', stats);
    res.json({
      success: true,
      data: {
        ...stats,
        total_products: productResult.total_products || 0,
        payment_breakdown: paymentBreakdown,
        store_breakdown: storeBreakdown
      }
    });
    
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

// API de chat con IA usando datos reales
app.post('/api/chat', async (req, res) => {
  try {
    const { message, fromDate = '2025-01-01', toDate = '2025-12-31', storeId = null } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mensaje requerido' });
    }

    console.log('🔍 Chat IA - Consultando datos reales de la base de datos...');
    
    // Verificar API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ success: true, response: '🤖 Entiendo tu consulta: "' + message + '". Para respuestas más inteligentes, configura una API key de Gemini.' });
    }

    // Obtener datos reales de la base de datos
    let contextData = '';
    try {
      // Consultar estadísticas básicas
      const statsQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(AVG(total), 0) as avg_order_value,
          COUNT(DISTINCT store_id) as total_stores
        FROM sale_orders 
        WHERE DATE(order_date) BETWEEN ? AND ?
        ${storeId ? 'AND store_id = ?' : ''}
      `;
      
      const params = storeId ? [fromDate, toDate, storeId] : [fromDate, toDate];
      const stats = dbToUse.prepare(statsQuery).get(...params);
      
      // Consultar productos más vendidos
      const productsQuery = `
        SELECT 
          sp.name,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY sp.name
        ORDER BY total_quantity DESC
        LIMIT 5
      `;
      
      const products = dbToUse.prepare(productsQuery).all(...params);
      
      // Consultar métodos de pago (corregido para distinguir efectivo de otros)
      const paymentQuery = `
        SELECT 
          CASE 
            WHEN payment_method = 'cash' OR payment_method = 'pedidosyaef' THEN 'Efectivo + PedidosYa EF'
            WHEN payment_method = 'rappiol' OR payment_method = 'pedidosyaol' OR payment_method = 'cc_rappiol' OR payment_method = 'cc_pedidosyaol' THEN 'Rappi + PedidosYa OL'
            ELSE 'Otros'
          END as payment_category,
          COUNT(*) as count,
          SUM(total) as revenue
        FROM sale_orders 
        WHERE DATE(order_date) BETWEEN ? AND ?
        ${storeId ? 'AND store_id = ?' : ''}
        GROUP BY 
          CASE 
            WHEN payment_method = 'cash' OR payment_method = 'pedidosyaef' THEN 'Efectivo + PedidosYa EF'
            WHEN payment_method = 'rappiol' OR payment_method = 'pedidosyaol' OR payment_method = 'cc_rappiol' OR payment_method = 'cc_pedidosyaol' THEN 'Rappi + PedidosYa OL'
            ELSE 'Otros'
          END
        ORDER BY count DESC
      `;
      
      const payments = dbToUse.prepare(paymentQuery).all(...params);
      
      contextData = `
Datos reales de la base de datos para el período ${fromDate} a ${toDate}${storeId ? ` (Tienda: ${storeId})` : ''}:

ESTADÍSTICAS GENERALES:
- Total de órdenes: ${stats.total_orders}
- Ingresos totales: $${stats.total_revenue.toFixed(2)}
- Promedio por orden: $${stats.avg_order_value.toFixed(2)}
- Tiendas activas: ${stats.total_stores}

PRODUCTOS MÁS VENDIDOS:
${products.map((p, i) => `${i+1}. ${p.name}: ${p.total_quantity} unidades, $${p.total_revenue.toFixed(2)}`).join('\n')}

MÉTODOS DE PAGO:
${payments.map(p => `- ${p.payment_category}: ${p.count} órdenes, $${p.revenue.toFixed(2)}`).join('\n')}
      `;
      
      console.log('✅ Datos de contexto obtenidos:', contextData.substring(0, 200) + '...');
    } catch (dbError) {
      console.warn('⚠️ Error obteniendo datos de contexto:', dbError);
      contextData = 'No se pudieron obtener datos específicos de la base de datos.';
    }

    // Crear instancia de Gemini
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    
    const prompt = `Eres un asistente experto en análisis de datos de ventas de restaurantes Subway. Responde de manera útil y profesional en español.

${contextData}

Pregunta del usuario: "${message}"

Responde basándote en los datos reales proporcionados arriba. Sé específico con números y estadísticas cuando sea relevante.`;
    
    console.log('🤖 Enviando prompt a Gemini con datos reales...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Respuesta de Gemini recibida:', text.substring(0, 100) + '...');
    res.json({ success: true, response: text });
  } catch (error) {
    console.error('❌ Error en chat IA:', error);
    res.json({ success: true, response: '🤖 Entiendo tu consulta: "' + message + '". Para respuestas más inteligentes, configura una API key de Gemini.' });
  }
});

// API de generación de gráficos
app.post('/api/generate-chart', async (req, res) => {
  try {
    const { query, chartType = 'bar', fromDate = '2025-01-01', toDate = '2025-12-31', storeId = null } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Consulta requerida' });
    }

    // Validar que la consulta no sea peligrosa
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];
    const upperQuery = query.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return res.status(400).json({ 
          success: false, 
          message: `Operación no permitida: ${keyword}` 
        });
      }
    }
    
    // Ejecutar consulta SQL directamente
    const result = dbToUse.prepare(query).all();
    
    // Generar código de gráfico básico
    const chartCode = `
      // Gráfico ${chartType} generado automáticamente
      const data = ${JSON.stringify(result, null, 2)};
      
      // Configuración del gráfico
      const config = {
        type: '${chartType}',
        data: data,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Gráfico de Datos'
            }
          }
        }
      };
      
      // Crear gráfico
      const ctx = document.getElementById('chartCanvas').getContext('2d');
      new Chart(ctx, config);
    `;
    
    res.json({ success: true, chartCode });
  } catch (error) {
    console.error('Error generando gráfico:', error);
    res.status(500).json({ success: false, message: 'Error generando gráfico' });
  }
});

// API de gráficos de IA con datos reales
app.post('/api/ai/charts', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId = null, userMessage = '', chartId = 'chartCanvas' } = req.body;
    
    console.log('📊 Generando gráfico de IA con datos reales...');
    
    // Obtener datos reales de la base de datos
    let chartData = {};
    let chartType = 'bar';
    let chartTitle = 'Análisis de Ventas';
    
    try {
      // Consultar ventas por día
      const dailySalesQuery = `
        SELECT 
          DATE(order_date) as date,
          COUNT(*) as orders,
          SUM(total) as revenue
        FROM sale_orders 
        WHERE DATE(order_date) BETWEEN ? AND ?
        ${storeId ? 'AND store_id = ?' : ''}
        GROUP BY DATE(order_date)
        ORDER BY date
      `;
      
      const params = storeId ? [fromDate, toDate, storeId] : [fromDate, toDate];
      const dailySales = dbToUse.prepare(dailySalesQuery).all(...params);
      
      // Consultar productos más vendidos
      const topProductsQuery = `
        SELECT 
          sp.name,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY sp.name
        ORDER BY total_quantity DESC
        LIMIT 10
      `;
      
      const topProducts = dbToUse.prepare(topProductsQuery).all(...params);
      
      // Consultar métodos de pago (corregido para distinguir efectivo de otros)
      const paymentQuery = `
        SELECT 
          CASE 
            WHEN payment_method = 'cash' OR payment_method = 'pedidosyaef' THEN 'Efectivo + PedidosYa EF'
            WHEN payment_method = 'rappiol' OR payment_method = 'pedidosyaol' OR payment_method = 'cc_rappiol' OR payment_method = 'cc_pedidosyaol' THEN 'Rappi + PedidosYa OL'
            ELSE 'Otros'
          END as payment_category,
          COUNT(*) as count,
          SUM(total) as revenue
        FROM sale_orders 
        WHERE DATE(order_date) BETWEEN ? AND ?
        ${storeId ? 'AND store_id = ?' : ''}
        GROUP BY 
          CASE 
            WHEN payment_method = 'cash' OR payment_method = 'pedidosyaef' THEN 'Efectivo + PedidosYa EF'
            WHEN payment_method = 'rappiol' OR payment_method = 'pedidosyaol' OR payment_method = 'cc_rappiol' OR payment_method = 'cc_pedidosyaol' THEN 'Rappi + PedidosYa OL'
            ELSE 'Otros'
          END
        ORDER BY count DESC
      `;
      
      const payments = dbToUse.prepare(paymentQuery).all(...params);
      
      // Consultar ventas por tienda
      const storeSalesQuery = `
        SELECT 
          store_id,
          COUNT(*) as orders,
          SUM(total) as revenue
        FROM sale_orders 
        WHERE DATE(order_date) BETWEEN ? AND ?
        GROUP BY store_id
        ORDER BY revenue DESC
      `;
      
      const storeSales = dbToUse.prepare(storeSalesQuery).all(...params);
      
      // Determinar tipo de gráfico basado en el mensaje del usuario
      if (userMessage.toLowerCase().includes('producto') || userMessage.toLowerCase().includes('productos')) {
        chartType = 'bar';
        chartTitle = 'Productos Más Vendidos';
        chartData = {
          labels: topProducts.map(p => p.name),
          datasets: [{
            label: 'Cantidad Vendida',
            data: topProducts.map(p => p.total_quantity),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };
      } else if (userMessage.toLowerCase().includes('pago') || userMessage.toLowerCase().includes('efectivo') || userMessage.toLowerCase().includes('tarjeta')) {
        chartType = 'doughnut';
        chartTitle = 'Distribución por Medios de Pago';
        chartData = {
          labels: payments.map(p => p.payment_category),
          datasets: [{
            data: payments.map(p => p.count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 205, 86, 0.6)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 205, 86, 1)'
            ],
            borderWidth: 1
          }]
        };
      } else if (userMessage.toLowerCase().includes('tienda') || userMessage.toLowerCase().includes('tiendas')) {
        chartType = 'bar';
        chartTitle = 'Ventas por Tienda';
        chartData = {
          labels: storeSales.map(s => `Tienda ${s.store_id}`),
          datasets: [{
            label: 'Ingresos ($)',
            data: storeSales.map(s => s.revenue),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        };
      } else {
        // Gráfico por defecto: ventas diarias
        chartType = 'line';
        chartTitle = 'Ventas Diarias';
        chartData = {
          labels: dailySales.map(d => d.date),
          datasets: [{
            label: 'Ingresos ($)',
            data: dailySales.map(d => d.revenue),
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          }]
        };
      }
      
      console.log('✅ Datos de gráfico obtenidos:', chartData);
    } catch (dbError) {
      console.warn('⚠️ Error obteniendo datos de gráfico:', dbError);
      chartData = {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Sin datos',
          data: [0],
          backgroundColor: 'rgba(200, 200, 200, 0.6)'
        }]
      };
    }

    // Generar código de gráfico
    const chartCode = `
      // Gráfico ${chartType} generado por IA
      const ctx = document.getElementById('${chartId}').getContext('2d');
      
      const config = {
        type: '${chartType}',
        data: ${JSON.stringify(chartData, null, 2)},
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: '${chartTitle}'
            },
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: ${chartType === 'line' || chartType === 'bar' ? `{
            y: {
              beginAtZero: true
            }
          }` : '{}'}
        }
      };
      
      new Chart(ctx, config);
    `;
    
    res.json({ 
      success: true, 
      chartCode: chartCode,
      chartType: chartType,
      chartTitle: chartTitle,
      data: chartData,
      message: 'Gráfico generado exitosamente',
      // Datos simplificados para el frontend
      simpleData: {
        labels: chartData.labels || [],
        datasets: chartData.datasets || [],
        type: chartType,
        title: chartTitle
      }
    });
  } catch (error) {
    console.error('❌ Error generando gráfico de IA:', error);
    res.status(500).json({ success: false, message: 'Error generando gráfico de IA' });
  }
});

// API de ventas diarias
app.post('/api/daily-sales', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId } = req.body;
    
    let query = `
      SELECT 
        DATE(so.order_date) as date,
        COUNT(DISTINCT so.linisco_id) as orders,
        SUM(so.total - so.discount) as revenue
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
    
    query += ' GROUP BY DATE(so.order_date) ORDER BY date';
    
    const dailySales = dbToUse.prepare(query).all(...params);
    res.json({ success: true, data: dailySales });
  } catch (error) {
    console.error('Error obteniendo ventas diarias:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo ventas diarias' });
  }
});

// API de ventas por tienda
app.post('/api/store-sales', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId } = req.body;
    
    let query = `
      SELECT 
        s.store_id,
        s.store_name,
        COUNT(DISTINCT so.linisco_id) as orders,
        SUM(so.total - so.discount) as revenue,
        AVG(so.total - so.discount) as avg_order_value
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
    
    query += ' GROUP BY s.store_id, s.store_name ORDER BY revenue DESC';
    
    const storeSales = dbToUse.prepare(query).all(...params);
    res.json({ success: true, data: storeSales });
  } catch (error) {
    console.error('Error obteniendo ventas por tienda:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo ventas por tienda' });
  }
});

// API de resumen de ventas
app.post('/api/sales-summary', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId } = req.body;
    
    // Obtener datos de ventas diarias
    let dailyQuery = `
      SELECT 
        DATE(so.order_date) as date,
        COUNT(DISTINCT so.linisco_id) as orders,
        SUM(so.total - so.discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const dailyParams = [fromDate, toDate];
    
    if (storeId) {
      const storeIds = Array.isArray(storeId) ? storeId : [storeId];
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        dailyQuery += ` AND so.store_id IN (${placeholders})`;
        dailyParams.push(...storeIds);
      }
    }
    
    dailyQuery += ' GROUP BY DATE(so.order_date) ORDER BY date';
    
    const dailySales = dbToUse.prepare(dailyQuery).all(...dailyParams);
    
    // Obtener productos top
    let topProductsQuery = `
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
    
    const topProductsParams = [fromDate, toDate];
    
    if (storeId) {
      const storeIds = Array.isArray(storeId) ? storeId : [storeId];
      if (storeIds.length > 0) {
        const placeholders = storeIds.map(() => '?').join(',');
        topProductsQuery += ` AND sp.store_id IN (${placeholders})`;
        topProductsParams.push(...storeIds);
      }
    }
    
    topProductsQuery += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;
    
    const topProducts = dbToUse.prepare(topProductsQuery).all(...topProductsParams);
    
    res.json({ 
      success: true, 
      data: {
        daily_sales: dailySales,
        top_products: topProducts
      }
    });
  } catch (error) {
    console.error('Error obteniendo resumen de ventas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo resumen de ventas' });
  }
});

// API de consultas SQL personalizadas
app.post('/api/sql', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: 'Consulta SQL requerida' });
    }
    
    // Validar que la consulta no sea peligrosa
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];
    const upperQuery = query.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperQuery.includes(keyword)) {
        return res.status(400).json({ 
          success: false, 
          message: `Operación no permitida: ${keyword}` 
        });
      }
    }
    
    const result = dbToUse.prepare(query).all();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error ejecutando consulta SQL:', error);
    res.status(500).json({ success: false, message: 'Error ejecutando consulta SQL: ' + error.message });
  }
});

// API de análisis avanzado con IA
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId = null } = req.body;
    
    const analysis = await aiGeminiService.analyzeSalesWithAI(fromDate, toDate, storeId);
    res.json(analysis);
  } catch (error) {
    console.error('Error en análisis IA:', error);
    res.status(500).json({ success: false, message: 'Error en análisis IA' });
  }
});

// API de predicciones con IA
app.post('/api/ai-predictions', async (req, res) => {
  try {
    const { fromDate = '2025-01-01', toDate = '2025-12-31', storeId = null } = req.body;
    
    const predictions = await aiGeminiService.generateAdvancedPredictions(fromDate, toDate, storeId);
    res.json(predictions);
  } catch (error) {
    console.error('Error en predicciones IA:', error);
    res.status(500).json({ success: false, message: 'Error en predicciones IA' });
  }
});

// API de consulta en lenguaje natural
app.post('/api/natural-query', async (req, res) => {
  try {
    const { message, fromDate = '2025-01-01', toDate = '2025-12-31', storeId = null } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mensaje requerido' });
    }
    
    const result = await aiGeminiService.naturalLanguageQuery(message, fromDate, toDate, storeId);
    res.json(result);
  } catch (error) {
    console.error('Error en consulta natural:', error);
    res.status(500).json({ success: false, message: 'Error en consulta natural' });
  }
});

// API de diagnóstico de configuración
app.get('/api/debug-config', (req, res) => {
  try {
    const config = {
      gemini_api_key_present: !!process.env.GEMINI_API_KEY,
      gemini_api_key_length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
      gemini_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      node_env: process.env.NODE_ENV,
      railway_environment: process.env.RAILWAY_ENVIRONMENT,
      ai_configured: aiGeminiService.isConfigured(),
      all_env_vars: Object.keys(process.env).filter(key => key.includes('GEMINI') || key.includes('RAILWAY') || key.includes('NODE'))
    };
    
    console.log('🔍 Diagnóstico de configuración:', config);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({ success: false, message: 'Error en diagnóstico' });
  }
});

// API para reinicializar el servicio de IA
app.post('/api/reinit-ai', (req, res) => {
  try {
    console.log('🔄 Reinicializando servicio de IA...');
    
    // Forzar verificación de configuración
    const wasConfigured = aiGeminiService.isConfigured();
    console.log('✅ Servicio de IA reinicializado. Configurado:', wasConfigured);
    
    res.json({ 
      success: true, 
      message: 'Servicio de IA reinicializado',
      configured: wasConfigured
    });
  } catch (error) {
    console.error('Error reinicializando IA:', error);
    res.status(500).json({ success: false, message: 'Error reinicializando IA' });
  }
});

// API de prueba directa de Gemini
app.post('/api/test-gemini', async (req, res) => {
  try {
    console.log('🧪 Probando Gemini directamente...');
    
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.json({ success: false, message: 'No API key found' });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const result = await model.generateContent('Responde solo "Hola" en español');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Gemini funcionando:', text);
    res.json({ success: true, response: text });
  } catch (error) {
    console.error('❌ Error probando Gemini:', error);
    res.status(500).json({ success: false, message: 'Error probando Gemini: ' + error.message });
  }
});

// API de prueba de chat con nueva instancia (igual que test-gemini)
app.post('/api/test-chat', async (req, res) => {
  try {
    const { message = 'Hola, ¿funciona el chat?' } = req.body;
    console.log('🧪 Probando chat con nueva instancia de Gemini...');
    
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.json({ success: false, message: 'No API key found' });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    });
    
    const prompt = `Eres un asistente de análisis de datos. Responde de manera útil y profesional en español. Pregunta del usuario: "${message}"`;
    
    console.log('🤖 Enviando prompt a Gemini...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Respuesta de Gemini recibida:', text.substring(0, 100) + '...');
    res.json({ success: true, response: text });
  } catch (error) {
    console.error('❌ Error probando chat con Gemini:', error);
    res.status(500).json({ success: false, message: 'Error probando chat: ' + error.message });
  }
});

// API de prueba del servicio de IA con datos reales
app.post('/api/test-ai-service', async (req, res) => {
  try {
    const { message = 'Hola, ¿funciona el servicio de IA?', fromDate = '2025-10-15', toDate = '2025-10-15', storeId = null } = req.body;
    console.log('🧪 Probando servicio de IA con datos reales...');
    
    console.log('🔍 Verificando configuración del servicio...');
    const isConfigured = aiGeminiService.isConfigured();
    console.log('✅ Servicio configurado:', isConfigured);
    
    if (!isConfigured) {
      return res.json({ success: false, message: 'Servicio de IA no configurado' });
    }
    
    console.log('🤖 Llamando a chatWithContext...');
    const response = await aiGeminiService.chatWithContext('user', message, fromDate, toDate, storeId);
    console.log('✅ Respuesta del servicio:', response);
    
    res.json({ success: true, response: response.message || response });
  } catch (error) {
    console.error('❌ Error probando servicio de IA:', error);
    res.status(500).json({ success: false, message: 'Error probando servicio: ' + error.message });
  }
});

// API de diagnóstico profundo del servicio de IA
app.get('/api/deep-debug-ai', (req, res) => {
  try {
    console.log('🔍 Diagnóstico profundo del servicio de IA...');
    
    // Información del servicio actual
    const serviceInfo = {
      hasApiKey: !!aiGeminiService.apiKey,
      apiKeyLength: aiGeminiService.apiKey ? aiGeminiService.apiKey.length : 0,
      hasGenAI: !!aiGeminiService.genAI,
      hasModelInstance: !!aiGeminiService.modelInstance,
      model: aiGeminiService.model,
      temperature: aiGeminiService.temperature,
      maxTokens: aiGeminiService.maxTokens
    };
    
    // Información de las variables de entorno
    const envInfo = {
      GEMINI_API_KEY_present: !!process.env.GEMINI_API_KEY,
      GEMINI_API_KEY_length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
      GEMINI_API_KEY_first_10: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : 'N/A',
      GEMINI_API_KEY_last_10: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 10) : 'N/A',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'default',
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
    };
    
    // Verificar configuración paso a paso
    const stepByStep = {
      step1_env_var_exists: !!process.env.GEMINI_API_KEY,
      step2_api_key_length: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
      step3_service_has_key: !!aiGeminiService.apiKey,
      step4_keys_match: process.env.GEMINI_API_KEY === aiGeminiService.apiKey,
      step5_has_genai: !!aiGeminiService.genAI,
      step6_has_model: !!aiGeminiService.modelInstance,
      step7_is_configured: aiGeminiService.isConfigured()
    };
    
    // Intentar crear una nueva instancia
    let newInstanceTest = null;
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const newGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const newModel = newGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      newInstanceTest = {
        success: true,
        hasGenAI: !!newGenAI,
        hasModel: !!newModel
      };
    } catch (error) {
      newInstanceTest = {
        success: false,
        error: error.message
      };
    }
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      service_info: serviceInfo,
      env_info: envInfo,
      step_by_step: stepByStep,
      new_instance_test: newInstanceTest,
      all_env_vars: Object.keys(process.env).filter(key => 
        key.includes('GEMINI') || 
        key.includes('RAILWAY') || 
        key.includes('NODE') ||
        key.includes('API')
      )
    };
    
    console.log('🔍 Diagnóstico completo:', JSON.stringify(diagnosis, null, 2));
    res.json({ success: true, diagnosis });
  } catch (error) {
    console.error('❌ Error en diagnóstico profundo:', error);
    res.status(500).json({ success: false, message: 'Error en diagnóstico: ' + error.message });
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
