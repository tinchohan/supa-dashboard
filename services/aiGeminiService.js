import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

class AIGeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.temperature = parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7;
    this.maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS) || 2048;
    
    console.log('🔍 Configuración de Gemini:');
    console.log('- API Key presente:', !!this.apiKey);
    console.log('- API Key length:', this.apiKey ? this.apiKey.length : 0);
    console.log('- Model:', this.model);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
    
    if (this.apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.modelInstance = this.genAI.getGenerativeModel({ 
          model: this.model,
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens,
          }
        });
        console.log('✅ Gemini configurado correctamente');
      } catch (error) {
        console.error('❌ Error configurando Gemini:', error);
      }
    } else {
      console.log('⚠️ No se encontró GEMINI_API_KEY');
    }
  }

  // Verificar si la API está configurada
  isConfigured() {
    // Verificar configuración en tiempo real
    const currentApiKey = process.env.GEMINI_API_KEY;
    const hasApiKey = !!currentApiKey;
    const hasModel = !!this.modelInstance;
    const isConfigured = hasApiKey && hasModel;
    
    console.log('🔍 Verificando configuración de Gemini (tiempo real):');
    console.log('- API Key presente:', hasApiKey);
    console.log('- API Key length:', currentApiKey ? currentApiKey.length : 0);
    console.log('- Model Instance presente:', hasModel);
    console.log('- Configurado:', isConfigured);
    
    // Si no está configurado pero hay API key, intentar reconfigurar
    if (currentApiKey && !this.modelInstance) {
      console.log('🔄 Reconfigurando Gemini con API key actual...');
      try {
        this.apiKey = currentApiKey;
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.modelInstance = this.genAI.getGenerativeModel({ 
          model: this.model,
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens,
          }
        });
        console.log('✅ Gemini reconfigurado correctamente');
        return true;
      } catch (error) {
        console.error('❌ Error reconfigurando Gemini:', error);
        return false;
      }
    }
    
    return isConfigured;
  }

  // Análisis avanzado de ventas con IA
  async analyzeSalesWithAI(fromDate, toDate, storeId = null) {
    if (!this.isConfigured()) {
      return this.getFallbackAnalysis(fromDate, toDate, storeId);
    }

    try {
      // Obtener datos de ventas
      const salesData = await this.getSalesData(fromDate, toDate, storeId);
      
      const prompt = `
        Analiza los siguientes datos de ventas y proporciona insights inteligentes:
        
        Datos de ventas:
        - Período: ${fromDate} a ${toDate}
        - Total de órdenes: ${salesData.total_orders}
        - Ingresos totales: $${salesData.total_revenue}
        - Promedio por orden: $${salesData.avg_order_value}
        - Tiendas activas: ${salesData.active_stores}
        
        Productos más vendidos:
        ${salesData.top_products.map((p, i) => `${i+1}. ${p.name} - ${p.quantity} unidades - $${p.revenue}`).join('\n')}
        
        Métodos de pago:
        ${salesData.payment_methods.map(pm => `- ${pm.method}: ${pm.percentage}% (${pm.orders} órdenes)`).join('\n')}
        
        Por favor, proporciona:
        1. 3 insights clave sobre el rendimiento
        2. 2 recomendaciones específicas para mejorar
        3. 1 predicción para la próxima semana
        4. Identifica patrones o tendencias importantes
        
        Responde en español, de forma clara y accionable.
      `;

      const result = await this.modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        analysis: text,
        data: salesData,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error en análisis con Gemini:', error);
      return this.getFallbackAnalysis(fromDate, toDate, storeId);
    }
  }

  // Chat inteligente con contexto de datos
  async chatWithContext(userId, message, fromDate, toDate, storeId = null) {
    if (!this.isConfigured()) {
      return this.getFallbackChatResponse(message);
    }

    try {
      // 1) Recolectar contexto rico para el período y tienda
      const snapshot = await this.getContextSnapshot(fromDate, toDate, storeId);

      // 2) Detectar intención tabular
      const tabularIntent = /\b(sql|tabla|tabular|listad|ranking|top|detalle|detalles|desglose|por d[ií]a|por tienda|promedio|promedios|sumas|agrupaci[oó]n)\b/i.test(message);

      let nlSqlSummary = '';
      if (tabularIntent) {
        // Ejecutar NL->SQL primero y sintetizar resultados
        const nlRes = await this.naturalLanguageQuery(message, fromDate, toDate, storeId);
        if (nlRes.success && Array.isArray(nlRes.rows) && nlRes.rows.length > 0) {
          const cols = Object.keys(nlRes.rows[0]).slice(0, 6);
          const maxRows = Math.min(nlRes.rows.length, 10);
          const rowsTxt = nlRes.rows.slice(0, maxRows)
            .map(r => cols.map(c => `${c}=${r[c]}`).join(', '))
            .join('\n');
          nlSqlSummary = `\nConsulta ejecutada (resumen):\nColumnas: ${cols.join(', ')}\nFilas (hasta ${maxRows}):\n${rowsTxt}\n`;
        }
      }

      // 3) Armar prompt con contexto estructurado y (si hay) resumen NL->SQL
      const prompt = `Eres un analista de datos conectado a una base SQLite por medio del backend.\n`+
`Siempre respondes basándote en el período y tienda actuales y en los datos provistos.\n`+
`Periodo: ${fromDate} a ${toDate}${storeId ? ` | Tienda: ${storeId}` : ''}\n\n`+
`Contexto del período (resumen):\n`+
`- Ventas: ${snapshot.summary}\n`+
`- Productos top: ${snapshot.top_products}\n`+
`- Medios de pago: ${snapshot.payment_breakdown}\n`+
`- Ventas por día: ${snapshot.daily_summary}\n`+
`- Por tienda: ${snapshot.store_summary}\n`+
`${nlSqlSummary}`+
`Pregunta del usuario: "${message}"\n\n`+
`Instrucciones de respuesta:\n`+
`- Si hay un resumen de consulta, úsalo como evidencia principal.\n`+
`- Cita explícitamente el período y, si aplica, la tienda.\n`+
`- Sé específico, con números comparativos y conclusiones prácticas.\n`+
`- Si la pregunta es ambigua, pide una aclaración concreta.\n`;

      const result = await this.modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        message: text,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error en chat con Gemini:', error);
      if (error.status === 503 || (error.message || '').includes('overloaded')) {
        console.log('🔄 Modelo sobrecargado, intentando con modelo alternativo...');
        return await this.tryAlternativeModel(message, fromDate, toDate, storeId);
      }
      return this.getFallbackChatResponse(message);
    }
  }

  // NL -> SQL segura (solo SELECT) y ejecución
  async naturalLanguageQuery(message, fromDate, toDate, storeId = null) {
    const allowedTables = [
      { name: 'sale_orders', alias: 'so', columns: ['id','id_sale_order','store_id','order_date','total','discount','payment_method'] },
      { name: 'sale_products', alias: 'sp', columns: ['id','id_sale_order','store_id','name','fixed_name','quantity','sale_price'] },
      { name: 'stores', alias: 's', columns: ['store_id','store_name','email'] }
    ];

    const schemaText = allowedTables
      .map(t => `${t.name} ${t.alias} (${t.columns.join(', ')})`)
      .join('\n');

    if (!this.isConfigured()) {
      return { success: true, sql: null, rows: [], note: 'AI no configurada' };
    }

    try {
      const instruction = `Eres un generador de consultas SQLite para un dashboard de ventas.\n`+
`Devuelve SOLO una consulta que comience con SELECT, sin explicaciones ni comentarios. Reglas estrictas:\n`+
`- UNA sola sentencia SELECT, sin WITH/CTE, sin múltiples sentencias.\n`+
`- Tablas permitidas y alias: sale_orders so, sale_products sp, stores s.\n`+
`- Joins válidos: so.id_sale_order = sp.id_sale_order; so.store_id = s.store_id.\n`+
`- Debes incluir SIEMPRE el filtro de fechas: DATE(so.order_date) BETWEEN '${fromDate}' AND '${toDate}'.\n`+
`- Si storeId es provisto (${storeId || 'null'}), agrega filtro so.store_id = '${storeId || ''}'.\n`+
`- Devuelve columnas con alias comprensibles.\n`+
`- Ordena por valores relevantes DESC.\n`+
`- Incluye LIMIT 100 al final.\n`+
`- No uses funciones ni extensiones no estándar de SQLite.\n`+
`- No uses parámetros; usa los literales provistos.\n\n`+
`Esquema:\n${schemaText}\n\n`+
`Pregunta del usuario:\n${message}\n\n`+
`Devuelve únicamente la consulta SQL, comenzando por SELECT.`;

      const result = await this.modelInstance.generateContent(instruction);
      const response = await result.response;
      let sql = (response.text() || '').trim();

      // Quitar fences si vinieran
      sql = sql.replace(/^```sql\s*/i, '').replace(/```$/i, '').trim();

      // Validaciones básicas
      if (!/^select\s/i.test(sql)) throw new Error('No es un SELECT');
      const forbidden = /(insert|update|delete|drop|alter|attach|detach|pragma|vacuum|;)/i;
      if (forbidden.test(sql)) throw new Error('Consulta prohibida');
      if (!/limit\s+\d+/i.test(sql)) sql += ' LIMIT 100';

      // Enforce filtros si faltan
      const ensureWhere = (clause) => {
        if (/\bwhere\b/i.test(sql)) {
          sql = sql.replace(/\bwhere\b/i, m => `${m} ${clause} AND `);
        } else {
          const orderIdx = sql.search(/\border\s+by\b/i);
          const limitIdx = sql.search(/\blimit\b/i);
          const ins = orderIdx >= 0 ? orderIdx : (limitIdx >= 0 ? limitIdx : sql.length);
          sql = sql.slice(0, ins) + ` WHERE ${clause} ` + sql.slice(ins);
        }
      };

      if (!/date\(\s*so\.order_date\s*\)\s*between/i.test(sql)) {
        ensureWhere(`DATE(so.order_date) BETWEEN '${fromDate}' AND '${toDate}'`);
      }
      if (storeId && !/so\.store_id\s*=\s*['"][^'"]+['"]/i.test(sql)) {
        ensureWhere(`so.store_id = '${storeId}'`);
      }

      // Ejecutar de solo lectura
      const stmt = db.prepare(sql);
      const rows = stmt.all();
      return { success: true, sql, rows };
    } catch (error) {
      console.error('Error NL->SQL:', error);
      return { success: false, sql: null, rows: [], error: error.message };
    }
  }

  // Intentar con modelo alternativo
  async tryAlternativeModel(message, fromDate, toDate, storeId) {
    const alternativeModels = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
    
    for (const modelName of alternativeModels) {
      try {
        console.log(`🔄 Probando modelo alternativo: ${modelName}`);
        
        const altModel = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        });

        const result = await altModel.generateContent(`Responde brevemente: ${message}`);
        const response = await result.response;
        const text = response.text();

        console.log(`✅ Modelo ${modelName} funcionando`);
        return {
          success: true,
          message: text,
          timestamp: new Date().toISOString(),
          model: modelName
        };

      } catch (altError) {
        console.log(`❌ Modelo ${modelName} también falló: ${altError.message.split('\n')[0]}`);
        continue;
      }
    }
    
    // Si todos los modelos fallan, usar fallback
    console.log('❌ Todos los modelos de Gemini fallaron, usando fallback');
    return this.getFallbackChatResponse(message);
  }

  // Predicciones avanzadas con IA
  async generateAdvancedPredictions(fromDate, toDate, storeId = null) {
    if (!this.isConfigured()) {
      return this.getFallbackPredictions(fromDate, toDate, storeId);
    }

    try {
      // Obtener datos históricos
      const historicalData = await this.getHistoricalData(fromDate, toDate, storeId);
      
      const prompt = `
        Basándote en estos datos históricos de ventas, genera predicciones para los próximos 7 días:
        
        Datos históricos (últimos 30 días):
        ${historicalData.daily_sales.map(day => 
          `${day.date}: ${day.orders} órdenes, $${day.revenue} ingresos`
        ).join('\n')}
        
        Patrones identificados:
        - Mejor día: ${historicalData.best_day}
        - Peor día: ${historicalData.worst_day}
        - Tendencia: ${historicalData.trend}
        
        Genera predicciones para los próximos 7 días incluyendo:
        1. Ingresos esperados por día
        2. Número de órdenes esperadas
        3. Nivel de confianza
        4. Factores de riesgo
        5. Recomendaciones para maximizar ventas
        
        Formato la respuesta como JSON con la estructura:
        {
          "predictions": [
            {"date": "YYYY-MM-DD", "predicted_revenue": 0, "predicted_orders": 0, "confidence": 0}
          ],
          "trend_analysis": "texto",
          "recommendations": ["recomendación1", "recomendación2"],
          "risk_factors": ["factor1", "factor2"]
        }
      `;

      const result = await this.modelInstance.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Intentar parsear JSON
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            data: parsed,
            generatedAt: new Date().toISOString()
          };
        }
      } catch (parseError) {
        console.warn('Error parseando JSON de Gemini:', parseError);
      }

      return {
        success: true,
        data: {
          predictions: [],
          trend_analysis: text,
          recommendations: [],
          risk_factors: []
        },
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error en predicciones con Gemini:', error);
      return this.getFallbackPredictions(fromDate, toDate, storeId);
    }
  }

  // Obtener datos de ventas para análisis
  async getSalesData(fromDate, toDate, storeId) {
    const query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT so.store_id) as active_stores
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
    `;

    const params = [fromDate, toDate];
    if (storeId) params.push(storeId);

    const stmt = db.prepare(query);
    const summary = stmt.get(...params);

    // Productos más vendidos
    const productsQuery = `
      SELECT 
        sp.name,
        SUM(sp.quantity) as quantity,
        SUM(sp.sale_price * sp.quantity) as revenue
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND sp.store_id = ?' : ''}
      GROUP BY sp.name
      ORDER BY quantity DESC
      LIMIT 5
    `;

    const productsStmt = db.prepare(productsQuery);
    const topProducts = productsStmt.all(...params);

    // Métodos de pago
    const paymentQuery = `
      SELECT 
        CASE 
          WHEN payment_method = 'cash' THEN 'Efectivo'
          ELSE 'Tarjeta'
        END as method,
        COUNT(*) as orders,
        SUM(total - discount) as revenue
      FROM sale_orders so
      WHERE DATE(order_date) BETWEEN ? AND ?
      ${storeId ? 'AND store_id = ?' : ''}
      GROUP BY method
    `;

    const paymentStmt = db.prepare(paymentQuery);
    const paymentMethods = paymentStmt.all(...params);
    
    const totalRevenue = paymentMethods.reduce((sum, pm) => sum + pm.revenue, 0);
    const paymentMethodsWithPercentage = paymentMethods.map(pm => ({
      ...pm,
      percentage: totalRevenue > 0 ? ((pm.revenue / totalRevenue) * 100).toFixed(1) : 0
    }));

    return {
      total_orders: summary.total_orders || 0,
      total_revenue: summary.total_revenue || 0,
      avg_order_value: summary.avg_order_value || 0,
      active_stores: summary.active_stores || 0,
      top_products: topProducts,
      payment_methods: paymentMethodsWithPercentage
    };
  }

  // Obtener datos de contexto para chat
  async getContextData(fromDate, toDate, storeId) {
    const salesData = await this.getSalesData(fromDate, toDate, storeId);
    
    return {
      summary: `${salesData.total_orders} órdenes, $${salesData.total_revenue.toLocaleString()} ingresos`,
      top_products: salesData.top_products.slice(0, 3).map(p => p.name).join(', '),
      payment_breakdown: salesData.payment_methods.map(pm => 
        `${pm.method}: ${pm.percentage}%`
      ).join(', ')
    };
  }

  // Contexto rico adicional para mejorar respuestas del chat
  async getContextSnapshot(fromDate, toDate, storeId) {
    const salesData = await this.getSalesData(fromDate, toDate, storeId);

    // Ventas por día
    const dailyStmt = db.prepare(`
      SELECT DATE(order_date) as date, COUNT(*) as orders, SUM(total - discount) as revenue
      FROM sale_orders
      WHERE DATE(order_date) BETWEEN ? AND ?
      ${storeId ? 'AND store_id = ?' : ''}
      GROUP BY DATE(order_date)
      ORDER BY date
    `);
    const dailyParams = storeId ? [fromDate, toDate, storeId] : [fromDate, toDate];
    const daily = dailyStmt.all(...dailyParams);
    const daily_summary = daily.slice(-7).map(d => `${d.date}: ${d.orders} ord, $${(d.revenue||0).toLocaleString()}`).join(' | ');

    // Por tienda
    const storeStmt = db.prepare(`
      SELECT s.store_name, COUNT(*) as orders, SUM(so.total - so.discount) as revenue
      FROM sale_orders so JOIN stores s ON s.store_id = so.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
      GROUP BY s.store_name
      ORDER BY revenue DESC
      LIMIT 5
    `);
    const storeRows = storeStmt.all(...dailyParams);
    const store_summary = storeRows.map(r => `${r.store_name}: $${(r.revenue||0).toLocaleString()} (${r.orders} ord)`).join(' | ');

    const ctx = await this.getContextData(fromDate, toDate, storeId);
    return {
      summary: ctx.summary,
      top_products: ctx.top_products,
      payment_breakdown: ctx.payment_breakdown,
      daily_summary,
      store_summary
    };
  }

  // Obtener datos históricos para predicciones
  async getHistoricalData(fromDate, toDate, storeId) {
    const query = `
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as orders,
        SUM(total - discount) as revenue
      FROM sale_orders so
      WHERE DATE(order_date) BETWEEN date(?, '-30 days') AND ?
      ${storeId ? 'AND store_id = ?' : ''}
      GROUP BY DATE(order_date)
      ORDER BY date
    `;

    const params = [toDate, toDate];
    if (storeId) params.push(storeId);

    const stmt = db.prepare(query);
    const dailySales = stmt.all(...params);

    const bestDay = dailySales.reduce((max, day) => 
      day.revenue > max.revenue ? day : max, dailySales[0] || {});
    
    const worstDay = dailySales.reduce((min, day) => 
      day.revenue < min.revenue ? day : min, dailySales[0] || {});

    // Calcular tendencia simple
    const firstHalf = dailySales.slice(0, Math.floor(dailySales.length / 2));
    const secondHalf = dailySales.slice(Math.floor(dailySales.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.revenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.revenue, 0) / secondHalf.length;
    
    const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return {
      daily_sales: dailySales,
      best_day: bestDay.date || 'N/A',
      worst_day: worstDay.date || 'N/A',
      trend: trend > 0 ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`
    };
  }

  // Análisis de respaldo cuando no hay API configurada
  getFallbackAnalysis(fromDate, toDate, storeId) {
    return {
      success: true,
      analysis: `📊 Análisis básico para el período ${fromDate} a ${toDate}.\n\nPara obtener análisis más avanzados, configura una API key de Gemini en las variables de entorno.`,
      data: {},
      generatedAt: new Date().toISOString(),
      fallback: true
    };
  }

  // Chat de respaldo
  getFallbackChatResponse(message) {
    return {
      success: true,
      message: `🤖 Entiendo tu consulta: "${message}". Para respuestas más inteligentes, configura una API key de Gemini.`,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }

  // Predicciones de respaldo
  getFallbackPredictions(fromDate, toDate, storeId) {
    return {
      success: true,
      data: {
        predictions: [],
        trend_analysis: 'Para predicciones avanzadas, configura una API key de Gemini.',
        recommendations: ['Configura la API de Gemini para análisis más precisos'],
        risk_factors: []
      },
      generatedAt: new Date().toISOString(),
      fallback: true
    };
  }
}

export default new AIGeminiService();
