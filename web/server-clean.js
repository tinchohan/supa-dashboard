import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db as postgresDb, initializeDatabase } from '../config/database-postgres-clean.js';
import { db as sqliteDb } from '../config/database.js';
import aiGeminiService from '../services/aiGeminiService.js';
import MultiStoreSyncService from '../services/multiStoreSyncService-clean.js';

// Configurar entorno para Railway
import '../scripts/configure-railway-env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Determinar qué base de datos usar (detección más robusta)
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.RAILWAY_ENVIRONMENT || 
                    process.env.RAILWAY_PROJECT_ID ||
                    process.env.DATABASE_URL?.includes('postgres') ||
                    process.env.DATABASE_URL?.includes('railway');

const dbToUse = isProduction ? postgresDb : sqliteDb; // Usar PostgreSQL en producción, SQLite en desarrollo

console.log('🔍 Configuración de servidor:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('- RAILWAY_PROJECT_ID:', process.env.RAILWAY_PROJECT_ID);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');
console.log('- Es producción:', isProduction);
console.log('- Base de datos:', isProduction ? 'PostgreSQL' : 'SQLite');

// Inicializar base de datos PostgreSQL en producción
let dbReady = false;
if (isProduction) {
  console.log('🔧 Inicializando base de datos PostgreSQL...');
  initializeDatabase()
    .then(async () => {
      console.log('✅ Base de datos PostgreSQL inicializada correctamente');
      dbReady = true;
      
      // Esperar un poco para que las tablas se creen completamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar si hay datos, si no, insertar datos de prueba
      try {
        console.log('🔍 Verificando si las tablas existen...');
        
        // Verificar que la tabla stores existe
        const tableCheck = await dbToUse.prepare(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'stores'
          ) as exists
        `).get();
        
        console.log('📊 Tabla stores existe:', tableCheck.exists);
        
        if (!tableCheck.exists) {
          console.log('❌ Tabla stores no existe, esperando...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        const storeCount = await dbToUse.prepare('SELECT COUNT(*) as count FROM stores').get();
        console.log('📊 Tiendas existentes:', storeCount.count);
        
        if (Number(storeCount.count) === 0) {
          console.log('📊 Base de datos vacía, insertando datos de prueba...');
          
          // Insertar tienda de prueba
          await dbToUse.prepare(`
            INSERT INTO stores (store_id, store_name, email, password) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (store_id) DO NOTHING
          `).run('63953', 'Subway Lacroze', '63953@linisco.com.ar', '63953hansen');
          
          // Insertar órdenes de prueba
          await dbToUse.prepare(`
            INSERT INTO sale_orders (id, store_id, order_date, total, discount, payment_method) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
          `).run('test-001', '63953', '2025-10-15', 1500, 0, 'cash');
          
          await dbToUse.prepare(`
            INSERT INTO sale_orders (id, store_id, order_date, total, discount, payment_method) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING
          `).run('test-002', '63953', '2025-10-14', 2000, 100, 'card');
          
          // Insertar productos de prueba
          await dbToUse.prepare(`
            INSERT INTO sale_products (id_sale_order, store_id, name, fixed_name, quantity, sale_price) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_sale_order, store_id, name) DO NOTHING
          `).run('test-001', '63953', 'Subway Club', 'subway-club', 2, 750);
          
          await dbToUse.prepare(`
            INSERT INTO sale_products (id_sale_order, store_id, name, fixed_name, quantity, sale_price) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id_sale_order, store_id, name) DO NOTHING
          `).run('test-002', '63953', 'Subway BMT', 'subway-bmt', 1, 2000);
          
          console.log('✅ Datos de prueba insertados correctamente');
        } else {
          console.log(`✅ Base de datos ya tiene ${storeCount.count} tiendas`);
        }
      } catch (error) {
        console.error('❌ Error insertando datos de prueba:', error.message);
        console.error('❌ Error completo:', error);
      }
    })
    .catch((error) => {
      console.error('❌ Error inicializando PostgreSQL:', error.message);
      console.log('⚠️  Continuando sin base de datos (modo fallback)');
    });
} else {
  dbReady = true;
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    
    // Query para obtener ventas diarias - adaptado para SQLite y PostgreSQL
    const isPostgres = isProduction;
    const dateFunction = isPostgres ? 'so.order_date::date' : 'DATE(so.order_date)';
    const paramPlaceholder = isPostgres ? '$' : '?';
    
    const dailyQuery = `
      SELECT 
        ${dateFunction} as date,
        COUNT(DISTINCT so.id) as orders,
        SUM(so.total - so.discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE ${dateFunction} BETWEEN ${paramPlaceholder}1 AND ${paramPlaceholder}2
      ${storeId ? `AND so.store_id = ${paramPlaceholder}3` : ''}
      GROUP BY ${dateFunction}
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
    
    const isPostgres = isProduction;
    const dateFunction = isPostgres ? 'so.order_date::date' : 'DATE(so.order_date)';
    const paramPlaceholder = isPostgres ? '$' : '?';
    const joinCondition = isPostgres ? 'sp.id_sale_order = so.id' : 'sp.id_sale_order = so.id_sale_order';
    
    const productsQuery = `
      SELECT
        sp.name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue
      FROM sale_products sp
      JOIN sale_orders so ON ${joinCondition}
      JOIN stores s ON sp.store_id = s.store_id
      WHERE ${dateFunction} BETWEEN ${paramPlaceholder}1 AND ${paramPlaceholder}2
      ${storeId ? `AND sp.store_id = ${paramPlaceholder}3` : ''}
      GROUP BY sp.name
      ORDER BY total_revenue DESC
      LIMIT ${paramPlaceholder}${storeId ? '4' : '3'}
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
    
    const isPostgres = isProduction;
    const dateFunction = isPostgres ? 'so.order_date::date' : 'DATE(so.order_date)';
    const paramPlaceholder = isPostgres ? '$' : '?';
    
    const storesQuery = `
      SELECT 
        s.store_name,
        COUNT(DISTINCT so.id) as orders,
        SUM(so.total - so.discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE ${dateFunction} BETWEEN ${paramPlaceholder}1 AND ${paramPlaceholder}2
      ${storeId ? `AND so.store_id = ${paramPlaceholder}3` : ''}
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
    
    const isPostgres = isProduction;
    const dateFunction = isPostgres ? 'so.order_date::date' : 'DATE(so.order_date)';
    const paramPlaceholder = isPostgres ? '$' : '?';
    
    let query = `
      SELECT 
        ${dateFunction} as date,
        so.payment_method,
        s.store_name,
        s.store_id,
        COUNT(*) as order_count,
        SUM(so.total - so.discount) as total_amount,
        AVG(so.total - so.discount) as avg_order_value
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE ${dateFunction} BETWEEN ${paramPlaceholder}1 AND ${paramPlaceholder}2
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    if (storeId) {
      query += ` AND so.store_id = ${paramPlaceholder}3`;
      params.push(storeId);
    }
    
    query += `
      GROUP BY ${dateFunction}, so.payment_method, s.store_id, s.store_name
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
    const stores = await dbToUse.prepare('SELECT store_id, store_name FROM stores ORDER BY store_name').all();
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
    
    console.log('🔍 Parámetros de estadísticas:', { fromDate, toDate, storeId });
    
    const isPostgres = isProduction;
    const dateFunction = isPostgres ? 'so.order_date::date' : 'DATE(so.order_date)';
    const paramPlaceholder = isPostgres ? '$' : '?';
    
    let query = `
      SELECT 
        COUNT(DISTINCT so.id) as total_orders,
        COUNT(DISTINCT s.store_id) as total_stores,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT ${dateFunction}) as days_with_sales
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE ${dateFunction} BETWEEN ${paramPlaceholder}1 AND ${paramPlaceholder}2
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    // Manejar storeId como string o array
    if (storeId) {
      const storeIds = Array.isArray(storeId) ? storeId : [storeId];
      if (storeIds.length > 0) {
        const placeholders = storeIds.map((_, i) => `${paramPlaceholder}${i + 3}`).join(',');
        const storeIdCondition = isPostgres ? `so.store_id::text IN (${placeholders})` : `so.store_id IN (${placeholders})`;
        query += ` AND ${storeIdCondition}`;
        // Asegurar que los storeIds sean strings para PostgreSQL
        params.push(...storeIds.map(id => String(id)));
      }
    }

    console.log('🔧 Query de estadísticas:', query);
    console.log('🔧 Parámetros:', params);

    const stats = await dbToUse.prepare(query).get(...params);
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
    
    console.log('🔍 Parámetros recibidos:', { fromDate, toDate, storeId, limit });
    
    const isPostgres = process.env.NODE_ENV === 'production' || 
                      process.env.RAILWAY_ENVIRONMENT || 
                      process.env.RAILWAY_PROJECT_ID ||
                      process.env.DATABASE_URL?.includes('postgres') ||
                      process.env.DATABASE_URL?.includes('railway');
    
    console.log('🔧 Configuración de base de datos:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');
    console.log('- Es PostgreSQL:', isPostgres);
    
    const dateFunction = isPostgres ? 'so.order_date::date' : 'DATE(so.order_date)';
    const paramPlaceholder = isPostgres ? '$' : '?';
    const joinCondition = isPostgres ? 'sp.id_sale_order = so.id' : 'sp.id_sale_order = so.id_sale_order';
    
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
      JOIN sale_orders so ON ${joinCondition}
      JOIN stores s ON sp.store_id = s.store_id
      WHERE ${dateFunction} BETWEEN ${paramPlaceholder}1 AND ${paramPlaceholder}2
    `;
    
    const params = [fromDate || '2025-01-01', toDate || '2025-12-31'];
    
    // Manejar storeId como string o array
    if (storeId) {
      const storeIds = Array.isArray(storeId) ? storeId : [storeId];
      if (storeIds.length > 0) {
        const placeholders = storeIds.map((_, i) => `${paramPlaceholder}${i + 3}`).join(',');
        // Para PostgreSQL, convertir store_id a text para comparar con los parámetros
        const storeIdCondition = isPostgres ? `sp.store_id::text IN (${placeholders})` : `sp.store_id IN (${placeholders})`;
        query += ` AND ${storeIdCondition}`;
        // Asegurar que los storeIds sean strings para PostgreSQL
        params.push(...storeIds.map(id => String(id)));
      }
    }
    
    query += `
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT ${paramPlaceholder}${params.length + 1}
    `;
    params.push(parseInt(limit));

    console.log('🔧 Query final:', query);
    console.log('🔧 Parámetros:', params);
    console.log('🔧 Usando base de datos:', isPostgres ? 'PostgreSQL' : 'SQLite');

    const products = await dbToUse.prepare(query).all(...params);
    console.log('✅ Productos obtenidos:', products.length);
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
