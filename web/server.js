import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { db as sqliteDb, initializeDatabase } from '../config/database-postgres.js';
import { db } from '../config/database.js';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Determinar qué base de datos usar
const isProduction = process.env.NODE_ENV === 'production';
const dbToUse = isProduction ? sqliteDb : db;

// Inicializar base de datos PostgreSQL en producción
if (isProduction) {
  console.log('🔧 Inicializando base de datos PostgreSQL...');
  initializeDatabase()
    .then(async () => {
      console.log('✅ Base de datos PostgreSQL inicializada correctamente');
      
      // Verificar si hay datos, si no, insertar datos de prueba
      try {
        const storeCount = await dbToUse.prepare('SELECT COUNT(*) as count FROM stores').get();
        if (storeCount.count === 0) {
          console.log('📊 Base de datos vacía, insertando datos de prueba...');
          
          // Insertar datos de prueba
          await dbToUse.prepare(`
            INSERT INTO stores (store_id, store_name, email, password) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (store_id) DO NOTHING
          `).run('63953', 'Subway Lacroze', '63953@linisco.com.ar', '63953hansen');
          
          await dbToUse.prepare(`
            INSERT INTO sale_orders (id, store_id, order_date, total, discount, payment_method) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
          `).run('test-001', '63953', '2025-10-15', 1500, 0, 'cash');
          
          await dbToUse.prepare(`
            INSERT INTO sale_products (id_sale_order, store_id, name, fixed_name, quantity, sale_price) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_sale_order, store_id, name) DO NOTHING
          `).run('test-001', '63953', 'Subway Club', 'subway-club', 2, 750);
          
          console.log('✅ Datos de prueba insertados correctamente');
        } else {
          console.log(`✅ Base de datos ya tiene ${storeCount.count} tiendas`);
        }
      } catch (error) {
        console.error('❌ Error insertando datos de prueba:', error.message);
      }
    })
    .catch((error) => {
      console.error('❌ Error inicializando PostgreSQL:', error.message);
      console.log('⚠️  Continuando sin base de datos (modo fallback)');
    });
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
// Chat con IA (Gemini si está configurado, fallback si no)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { userId = 'default', query, fromDate, toDate, storeId = null } = req.body || {};
    if (!query || !fromDate || !toDate) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros: query, fromDate, toDate' });
    }

    const result = await aiGeminiService.chatWithContext(userId, query, fromDate, toDate, storeId);
    return res.json({ success: true, data: { message: result.message, fallback: result.fallback || false } });
  } catch (error) {
    console.error('Error en /api/ai/chat:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Error interno en chat de IA',
      configured: aiGeminiService.isConfigured ? aiGeminiService.isConfigured() : false
    });
  }
});

// NL -> SQL: ejecuta SELECT generado por IA con saneamiento
app.post('/api/ai/sql', async (req, res) => {
  try {
    const { query, fromDate, toDate, storeId = null } = req.body || {};
    if (!query || !fromDate || !toDate) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros: query, fromDate, toDate' });
    }

    const result = await aiGeminiService.naturalLanguageQuery(query, fromDate, toDate, storeId);
    return res.json({ success: result.success, data: { rows: result.rows, sql: result.sql }, error: result.error || null });
  } catch (error) {
    console.error('Error en /api/ai/sql:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error interno en AI SQL' });
  }
});

// Estado de IA (diagnóstico rápido)
app.get('/api/ai/status', async (req, res) => {
  try {
    const configured = aiGeminiService.isConfigured ? aiGeminiService.isConfigured() : false;
    const model = aiGeminiService.model || null;
    const hasKey = !!(aiGeminiService.apiKey);
    return res.json({ success: true, data: { configured, hasKey, model } });
  } catch (error) {
    console.error('Error en /api/ai/status:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Error verificando estado de IA' });
  }
});

// Función para obtener datos diarios de ventas
async function getDailySalesData(fromDate, toDate, storeId) {
  try {
    
    // Query para obtener ventas diarias
    const dailyQuery = `
      SELECT 
        DATE(so.order_date) as date,
        COUNT(DISTINCT so.id) as orders,
        SUM(so.total - so.discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
      GROUP BY DATE(so.order_date)
      ORDER BY date
    `;
    
    const params = storeId ? [fromDate, toDate, storeId] : [fromDate, toDate];
    const dailyData = await dbToUse.prepare(dailyQuery).all(...params);
    
    // Generar array completo de fechas (incluyendo días sin ventas)
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const allDates = [];
    const dailySales = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      allDates.push(dateStr);
      
      // Buscar datos para esta fecha
      const dayData = dailyData.find(item => item.date === dateStr);
      dailySales.push({
        date: dateStr,
        orders: dayData ? dayData.orders : 0,
        revenue: dayData ? dayData.revenue : 0
      });
    }
    
    return {
      labels: allDates,
      data: dailySales.map(d => d.revenue),
      orders: dailySales.map(d => d.orders)
    };
    
  } catch (error) {
    console.error('Error obteniendo datos diarios:', error);
    return {
      labels: [],
      data: [],
      orders: []
    };
  }
}

// Función para obtener datos de productos más vendidos
async function getTopProductsData(fromDate, toDate, storeId, limit = 10) {
  try {
    
    const productsQuery = `
      SELECT
        sp.name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      JOIN stores s ON sp.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND sp.store_id = ?' : ''}
      GROUP BY sp.name
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    
    const params = storeId ? [fromDate, toDate, storeId, limit] : [fromDate, toDate, limit];
    const productsData = await dbToUse.prepare(productsQuery).all(...params);
    
    return {
      labels: productsData.map(p => p.name),
      data: productsData.map(p => p.total_revenue),
      quantities: productsData.map(p => p.total_quantity)
    };
    
  } catch (error) {
    console.error('Error obteniendo datos de productos:', error);
    return {
      labels: [],
      data: [],
      quantities: []
    };
  }
}

// Función para obtener datos de ventas por tienda
async function getStoreSalesData(fromDate, toDate, storeId) {
  try {
    
    const storesQuery = `
      SELECT 
        s.store_name,
        COUNT(DISTINCT so.id) as orders,
        SUM(so.total - so.discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
      GROUP BY s.store_name, s.store_id
      ORDER BY revenue DESC
    `;
    
    const params = storeId ? [fromDate, toDate, storeId] : [fromDate, toDate];
    const storesData = await dbToUse.prepare(storesQuery).all(...params);
    
    return {
      labels: storesData.map(s => s.store_name),
      data: storesData.map(s => s.revenue),
      orders: storesData.map(s => s.orders)
    };
    
  } catch (error) {
    console.error('Error obteniendo datos de tiendas:', error);
    return {
      labels: [],
      data: [],
      orders: []
    };
  }
}

// Función para detectar el tipo de gráfico según la solicitud del usuario
function detectChartType(userMessage) {
  const message = userMessage.toLowerCase();
  
  console.log('🔍 Analizando mensaje para detectar tipo:', message);
  
  // Detectar productos (prioridad alta)
  if (message.includes('producto') || message.includes('productos') || message.includes('vendido') || message.includes('ranking') || message.includes('top') || message.includes('mejor')) {
    console.log('✅ Tipo detectado: products');
    return 'products';
  }
  
  // Detectar tiendas (prioridad alta)
  if (message.includes('tienda') || message.includes('tiendas') || message.includes('sucursal') || message.includes('sucursales') || message.includes('participacion') || message.includes('participación') || message.includes('porcentual') || message.includes('distribucion') || message.includes('distribución')) {
    console.log('✅ Tipo detectado: stores');
    return 'stores';
  }
  
  // Detectar tipo de gráfico específico
  if (message.includes('circular') || message.includes('pie') || message.includes('torta') || message.includes('donut')) {
    console.log('✅ Tipo detectado: stores (por tipo circular)');
    return 'stores';
  }
  
  if (message.includes('barras') || message.includes('barra')) {
    console.log('✅ Tipo detectado: products (por tipo barras)');
    return 'products';
  }
  
  if (message.includes('línea') || message.includes('linea') || message.includes('tendencia')) {
    console.log('✅ Tipo detectado: daily (por tipo línea)');
    return 'daily';
  }
  
  // Detectar datos diarios (prioridad media)
  if (message.includes('diario') || message.includes('diaria') || message.includes('día') || message.includes('dias') || message.includes('días') || message.includes('temporal') || message.includes('tiempo')) {
    console.log('✅ Tipo detectado: daily');
    return 'daily';
  }
  
  // Por defecto, mostrar datos diarios
  console.log('✅ Tipo detectado: daily (por defecto)');
  return 'daily';
}

// Función para generar código de gráfico basado en el tipo detectado
function generateChartCode(chartType, data, fromDate, toDate, customChartId = null) {
  const chartId = customChartId || 'chartContainer';
  
  // Verificar si hay datos
  if (!data.labels || data.labels.length === 0) {
    return `
      const canvas = document.getElementById('${chartId}');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No hay datos disponibles para el período seleccionado', canvas.width/2, canvas.height/2);
      }
    `;
  }
  
  switch (chartType) {
    case 'daily':
      return `
        const canvas = document.getElementById('${chartId}');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          new Chart(ctx, {
            type: 'line',
            data: {
              labels: ${JSON.stringify(data.labels)},
              datasets: [{
                label: 'Ingresos Diarios',
                data: ${JSON.stringify(data.data)},
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Ventas Diarias - ${fromDate} a ${toDate}'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return '$' + value.toLocaleString('es-ES');
                    }
                  }
                }
              }
            }
          });
        }
      `;
      
    case 'products':
      return `
        const canvas = document.getElementById('${chartId}');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(data.labels)},
              datasets: [{
                label: 'Ingresos por Producto',
                data: ${JSON.stringify(data.data)},
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Productos Más Vendidos - ${fromDate} a ${toDate}'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: function(value) {
                      return '$' + value.toLocaleString('es-ES');
                    }
                  }
                },
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 45
                  }
                }
              }
            }
          });
        }
      `;
      
    case 'stores':
      return `
        const canvas = document.getElementById('${chartId}');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ${JSON.stringify(data.labels)},
              datasets: [{
                data: ${JSON.stringify(data.data)},
                backgroundColor: [
                  'rgba(255, 99, 132, 0.8)',
                  'rgba(54, 162, 235, 0.8)',
                  'rgba(255, 205, 86, 0.8)',
                  'rgba(75, 192, 192, 0.8)',
                  'rgba(153, 102, 255, 0.8)',
                  'rgba(255, 159, 64, 0.8)'
                ]
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                title: {
                  display: true,
                  text: 'Ventas por Tienda - ${fromDate} a ${toDate}'
                },
                legend: {
                  position: 'right'
                }
              }
            }
          });
        }
      `;
      
    default:
      return generateChartCode('daily', data, fromDate, toDate);
  }
}

// Generar gráficos con IA
app.post('/api/ai/charts', async (req, res) => {
  try {
    console.log('🎨 Endpoint /api/ai/charts llamado');
    const { fromDate, toDate, storeId, userMessage, chartId } = req.body;
    console.log('📊 Parámetros recibidos:', { fromDate, toDate, storeId, userMessage, chartId });
    
    // Detectar el tipo de gráfico según la solicitud del usuario
    const chartType = detectChartType(userMessage);
    console.log('🔍 Tipo de gráfico detectado:', chartType);
    
    // Obtener datos específicos según el tipo de gráfico
    let chartData;
    console.log('🔍 Obteniendo datos para tipo:', chartType);
    console.log('📅 Parámetros:', { fromDate, toDate, storeId });
    
    switch (chartType) {
      case 'daily':
        chartData = await getDailySalesData(fromDate, toDate, storeId);
        break;
      case 'products':
        chartData = await getTopProductsData(fromDate, toDate, storeId, 10);
        break;
      case 'stores':
        chartData = await getStoreSalesData(fromDate, toDate, storeId);
        break;
      default:
        chartData = await getDailySalesData(fromDate, toDate, storeId);
    }
    
    console.log('📊 Datos obtenidos para el gráfico:', chartData);
    console.log('📊 Labels length:', chartData.labels?.length || 0);
    console.log('📊 Data length:', chartData.data?.length || 0);
    
    // Generar código del gráfico usando el sistema inteligente
    const chartCode = generateChartCode(chartType, chartData, fromDate, toDate, chartId);
    
    console.log('✅ Código del gráfico generado exitosamente');
    
    res.json({
      success: true,
      chartCode: chartCode,
      chartType: chartType,
      dataPreview: {
        labels: chartData.labels?.slice(0, 5) || [],
        dataPoints: chartData.data?.slice(0, 5) || []
      }
    });

  } catch (error) {
    console.error('Error generando gráficos:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Obtener resumen de ventas por fecha y forma de pago (agrupado en Cash y Otros)
app.get('/api/sales-summary', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.query;
    
    let query = `
      SELECT 
        DATE(so.order_date) as date,
        so.payment_method,
        s.store_name,
        s.store_id,
        COUNT(*) as order_count,
        SUM(so.total - so.discount) as total_amount,
        AVG(so.total - so.discount) as avg_order_value
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    if (storeId) {
      query += ' AND so.store_id = ?';
      params.push(storeId);
    }
    
    query += `
      GROUP BY DATE(so.order_date), so.payment_method, s.store_id, s.store_name
      ORDER BY date DESC, total_amount DESC
    `;
    
    const stmt = dbToUse.prepare(query);
    const results = await stmt.all(...params);
    
    // Agrupar los datos en JavaScript
    const groupedData = {};
    
    results.forEach(row => {
      const key = `${row.date}_${row.store_id}_${row.store_name}`;
      const paymentCategory = row.payment_method === 'cash' ? 'cash' : 'otros_medios';
      
      if (!groupedData[key]) {
        groupedData[key] = {
          date: row.date,
          store_name: row.store_name,
          store_id: row.store_id,
          cash: { order_count: 0, total_amount: 0, avg_order_value: 0 },
          otros_medios: { order_count: 0, total_amount: 0, avg_order_value: 0 }
        };
      }
      
      if (paymentCategory === 'cash') {
        groupedData[key].cash.order_count += row.order_count;
        groupedData[key].cash.total_amount += row.total_amount;
        groupedData[key].cash.avg_order_value = row.avg_order_value;
      } else {
        groupedData[key].otros_medios.order_count += row.order_count;
        groupedData[key].otros_medios.total_amount += row.total_amount;
        groupedData[key].otros_medios.avg_order_value = row.avg_order_value;
      }
    });
    
    // Convertir a array y crear entradas para cash y otros_medios
    const finalResults = [];
    Object.values(groupedData).forEach(group => {
      // Agregar entrada para cash si tiene datos
      if (group.cash.order_count > 0) {
        finalResults.push({
          date: group.date,
          payment_method: 'cash',
          store_name: group.store_name,
          store_id: group.store_id,
          order_count: group.cash.order_count,
          total_amount: group.cash.total_amount,
          avg_order_value: group.cash.avg_order_value
        });
      }
      
      // Agregar entrada para otros_medios si tiene datos
      if (group.otros_medios.order_count > 0) {
        finalResults.push({
          date: group.date,
          payment_method: 'otros_medios',
          store_name: group.store_name,
          store_id: group.store_id,
          order_count: group.otros_medios.order_count,
          total_amount: group.otros_medios.total_amount,
          avg_order_value: group.otros_medios.avg_order_value
        });
      }
    });
    
    // Ordenar por fecha y monto total
    finalResults.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.total_amount - a.total_amount;
    });
    
    res.json({
      success: true,
      data: finalResults,
      total_records: finalResults.length
    });
    
  } catch (error) {
    console.error('Error en /api/sales-summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener productos más vendidos
app.get('/api/top-products', async (req, res) => {
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
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      JOIN stores s ON sp.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    // Manejar múltiples storeId si se proporcionan
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
    
    console.log('🔍 Query productos:', query);
    console.log('📊 Parámetros:', params);
    
    const stmt = dbToUse.prepare(query);
    const results = await stmt.all(...params);
    
    console.log('✅ Productos encontrados:', results.length);
    
    res.json({
      success: true,
      data: results,
      total_records: results.length
    });
    
  } catch (error) {
    console.error('Error en /api/top-products:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener tiendas disponibles
app.get('/api/stores', async (req, res) => {
  try {
    const stmt = dbToUse.prepare('SELECT store_id, store_name, email FROM stores ORDER BY store_name');
    const stores = await stmt.all();
    
    res.json({
      success: true,
      data: stores
    });
    
  } catch (error) {
    console.error('Error en /api/stores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas generales (POST para manejar múltiples tiendas)
app.post('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.body;
    
    console.log('📊 Stats POST request - storeId:', storeId);
    console.log('📅 Fechas solicitadas - fromDate:', fromDate, 'toDate:', toDate);
    
    // Estadísticas generales
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT s.store_id) as total_stores,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    // Manejar múltiples storeId si se proporcionan
    if (storeId && storeId.length > 0) {
      console.log('🏪 StoreIds procesados:', storeId);
      console.log('🏪 Tipos de storeIds:', storeId.map(id => typeof id));
      
      const placeholders = storeId.map(() => '?').join(',');
      statsQuery += ` AND so.store_id IN (${placeholders})`;
      params.push(...storeId);
      console.log('📊 Query con filtro de tiendas:', statsQuery);
      console.log('📊 Parámetros:', params);
      
      // Verificar qué tiendas existen en la base de datos
      const checkStoresQuery = 'SELECT store_id, store_name FROM stores WHERE store_id IN (' + placeholders + ')';
    const checkStmt = dbToUse.prepare(checkStoresQuery);
    const existingStores = await checkStmt.all(...storeId);
      console.log('🏪 Tiendas encontradas en BD:', existingStores);
    }
    
    console.log('📊 Ejecutando query de estadísticas:', statsQuery);
    console.log('📊 Parámetros finales:', params);
    
    const stmt = dbToUse.prepare(statsQuery);
    const stats = await stmt.get(...params);
    
    console.log('📊 Resultados de estadísticas:', stats);
    
    // Si no hay resultados, verificar si hay datos en sale_orders para esas tiendas
    if (storeId && storeId.length > 0 && (!stats || stats.total_orders === 0)) {
      console.log('🔍 Verificando datos en sale_orders...');
      
      // Primero verificar sin filtro de fechas
      const checkOrdersQuery = `
        SELECT 
          so.store_id,
          s.store_name,
          COUNT(*) as order_count,
          MIN(so.order_date) as first_order,
          MAX(so.order_date) as last_order
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE so.store_id IN (${storeId.map(() => '?').join(',')})
        GROUP BY so.store_id, s.store_name
      `;
    const checkOrdersStmt = dbToUse.prepare(checkOrdersQuery);
    const orderData = await checkOrdersStmt.all(...storeId);
      console.log('🔍 Datos de órdenes encontrados (sin filtro de fechas):', orderData);
      
      // Luego verificar con filtro de fechas
      const checkOrdersWithDateQuery = `
        SELECT 
          so.store_id,
          s.store_name,
          COUNT(*) as order_count,
          MIN(so.order_date) as first_order,
          MAX(so.order_date) as last_order
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE so.store_id IN (${storeId.map(() => '?').join(',')})
        AND DATE(so.order_date) BETWEEN ? AND ?
        GROUP BY so.store_id, s.store_name
      `;
    const checkOrdersWithDateStmt = dbToUse.prepare(checkOrdersWithDateQuery);
    const orderDataWithDate = await checkOrdersWithDateStmt.all(...storeId, fromDate || '2025-01-01', toDate || '2025-12-31');
      console.log('🔍 Datos de órdenes encontrados (con filtro de fechas):', orderDataWithDate);
    }
    
    // Desglose por medios de pago
    let paymentQuery = `
      SELECT 
        so.payment_method,
        COUNT(*) as order_count,
        SUM(so.total - so.discount) as total_amount
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const paymentParams = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    // Manejar múltiples storeId si se proporcionan
    if (storeId && storeId.length > 0) {
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
    
    paymentQuery += ' GROUP BY so.payment_method ORDER BY total_amount DESC';
    
    const paymentStmt = dbToUse.prepare(paymentQuery);
    const paymentBreakdown = await paymentStmt.all(...paymentParams);
    
    // Desglose por tienda (siempre mostrar, pero filtrar según selección)
    let storeBreakdown = [];
    let storeQuery = `
      SELECT 
        s.store_id,
        s.store_name,
        COUNT(DISTINCT so.id) as order_count,
        SUM(so.total - so.discount) as revenue
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const storeParams = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    // Manejar múltiples storeId si se proporcionan
    if (storeId && storeId.length > 0) {
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
    const storeResults = await storeStmt.all(...storeParams);
    
    // Calcular porcentajes
    const totalRevenue = storeResults.reduce((sum, store) => sum + store.revenue, 0);
    storeBreakdown = storeResults.map(store => ({
      ...store,
      percentage: totalRevenue > 0 ? (store.revenue / totalRevenue) * 100 : 0
    }));
    
    // Contar productos únicos
    let productQuery = `
      SELECT COUNT(DISTINCT sp.name) as total_products
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const productParams = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    if (storeId && storeId.length > 0) {
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
    const productResult = await productStmt.get(...productParams);
    
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
    console.error('Error en /api/stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas generales (GET para compatibilidad)
app.get('/api/stats', async (req, res) => {
  try {
    const { fromDate, toDate, storeId } = req.query;
    
    console.log('📊 Stats request - storeId:', storeId);
    console.log('📅 Fechas solicitadas - fromDate:', fromDate, 'toDate:', toDate);
    
    // Estadísticas generales
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT s.store_id) as total_stores,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
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
        console.log('📊 Query con filtro de tiendas:', statsQuery);
        console.log('📊 Parámetros:', params);
        
        // Verificar qué tiendas existen en la base de datos
        const checkStoresQuery = 'SELECT store_id, store_name FROM stores WHERE store_id IN (' + placeholders + ')';
        const checkStmt = dbToUse.prepare(checkStoresQuery);
        const existingStores = checkStmt.all(...storeIds);
        console.log('🏪 Tiendas encontradas en BD:', existingStores);
      }
    }
    
    console.log('📊 Ejecutando query de estadísticas:', statsQuery);
    console.log('📊 Parámetros finales:', params);
    
    const stmt = dbToUse.prepare(statsQuery);
    const stats = await stmt.get(...params);
    
    console.log('📊 Resultados de estadísticas:', stats);
    
    // Si no hay resultados, verificar si hay datos en sale_orders para esas tiendas
    if (storeId && (!stats || stats.total_orders === 0)) {
      console.log('🔍 Verificando datos en sale_orders...');
      
      // Primero verificar sin filtro de fechas
      const checkOrdersQuery = `
        SELECT 
          so.store_id,
          s.store_name,
          COUNT(*) as order_count,
          MIN(so.order_date) as first_order,
          MAX(so.order_date) as last_order
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE so.store_id IN (${storeIds.map(() => '?').join(',')})
        GROUP BY so.store_id, s.store_name
      `;
      const checkOrdersStmt = dbToUse.prepare(checkOrdersQuery);
      const orderData = checkOrdersStmt.all(...storeIds);
      console.log('🔍 Datos de órdenes encontrados (sin filtro de fechas):', orderData);
      
      // Luego verificar con filtro de fechas
      const checkOrdersWithDateQuery = `
        SELECT 
          so.store_id,
          s.store_name,
          COUNT(*) as order_count,
          MIN(so.order_date) as first_order,
          MAX(so.order_date) as last_order
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE so.store_id IN (${storeIds.map(() => '?').join(',')})
        AND DATE(so.order_date) BETWEEN ? AND ?
        GROUP BY so.store_id, s.store_name
      `;
      const checkOrdersWithDateStmt = dbToUse.prepare(checkOrdersWithDateQuery);
      const orderDataWithDate = checkOrdersWithDateStmt.all(...storeIds, fromDate || '2025-01-01', toDate || '2025-12-31');
      console.log('🔍 Datos de órdenes encontrados (con filtro de fechas):', orderDataWithDate);
    }
    
    // Desglose por medios de pago
    let paymentQuery = `
      SELECT 
        so.payment_method,
        COUNT(*) as order_count,
        SUM(so.total - so.discount) as total_amount
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const paymentParams = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
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
        paymentQuery += ` AND so.store_id IN (${placeholders})`;
        paymentParams.push(...storeIds);
      }
    }
    
    paymentQuery += ' GROUP BY so.payment_method ORDER BY total_amount DESC';
    
    const paymentStmt = dbToUse.prepare(paymentQuery);
    const paymentBreakdown = await paymentStmt.all(...paymentParams);
    
    // Desglose por tienda (siempre mostrar, pero filtrar según selección)
    let storeBreakdown = [];
    let storeQuery = `
      SELECT 
        s.store_id,
        s.store_name,
        COUNT(DISTINCT so.id) as order_count,
        SUM(so.total - so.discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const storeParams = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
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
        storeQuery += ` AND so.store_id IN (${placeholders})`;
        storeParams.push(...storeIds);
      }
    }
    
    storeQuery += `
      GROUP BY s.store_id, s.store_name
      ORDER BY revenue DESC
    `;
    
    const storeStmt = dbToUse.prepare(storeQuery);
    const storeResults = await storeStmt.all(...storeParams);
    
    // Calcular porcentajes
    const totalRevenue = storeResults.reduce((sum, store) => sum + store.revenue, 0);
    storeBreakdown = storeResults.map(store => ({
      ...store,
      percentage: totalRevenue > 0 ? (store.revenue / totalRevenue) * 100 : 0
    }));
    
    // Contar productos únicos
    let productQuery = `
      SELECT COUNT(DISTINCT sp.name) as total_products
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;
    
    const productParams = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    if (storeId) {
      productQuery += ' AND sp.store_id = ?';
      productParams.push(storeId);
    }
    
    const productStmt = dbToUse.prepare(productQuery);
    const productStats = await productStmt.get(...productParams);
    
    res.json({
      success: true,
      data: {
        ...stats,
        total_products: productStats.total_products,
        payment_breakdown: paymentBreakdown,
        store_breakdown: storeBreakdown
      }
    });
    
  } catch (error) {
    console.error('Error en /api/stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Middleware de autenticación
function requireAuth(req, res, next) {
  const isAuthenticated = req.headers['x-authenticated'] === 'true';
  
  if (isAuthenticated) {
    next();
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
}

// Servir la página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Endpoint para verificar credenciales
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

// Endpoint para logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Logout exitoso',
    redirect: '/login'
  });
});

// Servir la página principal (requiere autenticación)
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Servir página de test
app.get('/test-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-dashboard.html'));
});

// Variable para controlar sincronizaciones concurrentes
let isServerSyncing = false;

// Endpoint de sincronización
app.post('/api/sync', async (req, res) => {
  try {
    // Verificar si ya hay una sincronización en curso
    if (isServerSyncing) {
      return res.status(429).json({
        success: false,
        message: 'Ya hay una sincronización en curso. Espera a que termine.',
        error: 'SYNC_IN_PROGRESS'
      });
    }

    const { fromDate, toDate, forceSync } = req.body;
    
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate} (forceSync: ${forceSync})`);
    
    isServerSyncing = true;
    
    // Instanciar servicio de sincronización (import estático)
    const syncService = new MultiStoreSyncService();
    
    // Ejecutar sincronización
    const result = await syncService.syncAllStores(fromDate, toDate);
    
    if (result.success) {
      console.log(`✅ Sincronización completada: ${result.totalRecords} registros sincronizados`);
      res.json({
        success: true,
        message: `Sincronización completada exitosamente`,
        data: {
          totalRecords: result.totalRecords,
          storesProcessed: result.results.length,
          errors: result.errors.length,
          newRecords: result.totalRecords, // Asumiendo que todos son nuevos si no hay duplicados
          duplicateRecords: 0 // El servicio debería manejar duplicados automáticamente
        }
      });
    } else {
      console.log(`⚠️ Sincronización completada con errores: ${result.errors.length} errores`);
      res.json({
        success: false,
        message: `Sincronización completada con ${result.errors.length} errores`,
        data: {
          totalRecords: result.totalRecords,
          storesProcessed: result.results.length,
          errors: result.errors
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno durante la sincronización',
      error: error.message
    });
  } finally {
    isServerSyncing = false;
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor web ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Dashboard disponible en http://localhost:${PORT}`);
  // Healthcheck para Railway
  // Mantener esta línea para forzar redeploys visibles en logs
  console.log('✅ Server ready (build timestamp): ' + new Date().toISOString());
});

export default app;
