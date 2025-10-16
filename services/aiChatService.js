import { db } from '../config/database.js';

class AIChatService {
  constructor() {
    this.conversationHistory = new Map();
    this.maxHistoryLength = 10;
  }

  // Procesar consulta en lenguaje natural
  async processQuery(userId, query, fromDate, toDate, storeId = null) {
    try {
      // Obtener contexto de la conversación
      const history = this.conversationHistory.get(userId) || [];
      
      // Analizar el tipo de consulta
      const queryType = this.analyzeQueryType(query);
      
      // Ejecutar consulta basada en el tipo
      let response;
      switch (queryType.type) {
        case 'sales_summary':
          response = await this.getSalesSummary(query, fromDate, toDate, storeId);
          break;
        case 'product_analysis':
          response = await this.getProductAnalysis(query, fromDate, toDate, storeId);
          break;
        case 'payment_analysis':
          response = await this.getPaymentAnalysis(query, fromDate, toDate, storeId);
          break;
        case 'comparison':
          response = await this.getComparisonAnalysis(query, fromDate, toDate, storeId);
          break;
        case 'trends':
          response = await this.getTrendAnalysis(query, fromDate, toDate, storeId);
          break;
        default:
          response = await this.getGeneralInsights(query, fromDate, toDate, storeId);
      }

      // Agregar a historial
      history.push({
        query: query,
        response: response,
        timestamp: new Date().toISOString()
      });

      // Mantener solo los últimos N mensajes
      if (history.length > this.maxHistoryLength) {
        history.splice(0, history.length - this.maxHistoryLength);
      }

      this.conversationHistory.set(userId, history);

      return {
        success: true,
        data: response,
        queryType: queryType.type,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error procesando consulta:', error);
      return {
        success: false,
        error: 'No pude procesar tu consulta. Intenta reformularla.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Analizar el tipo de consulta
  analyzeQueryType(query) {
    const lowerQuery = query.toLowerCase();
    
    // Palabras clave para diferentes tipos de consultas
    const salesKeywords = ['ventas', 'ingresos', 'revenue', 'total', 'dinero', 'facturación'];
    const productKeywords = ['producto', 'productos', 'más vendido', 'top', 'popular', 'estrella'];
    const paymentKeywords = ['pago', 'efectivo', 'tarjeta', 'método', 'forma de pago'];
    const comparisonKeywords = ['comparar', 'vs', 'versus', 'diferencia', 'mejor', 'peor'];
    const trendKeywords = ['tendencia', 'crecimiento', 'decrecimiento', 'evolución', 'cambio'];

    if (salesKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { type: 'sales_summary', confidence: 0.8 };
    }
    if (productKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { type: 'product_analysis', confidence: 0.8 };
    }
    if (paymentKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { type: 'payment_analysis', confidence: 0.8 };
    }
    if (comparisonKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { type: 'comparison', confidence: 0.7 };
    }
    if (trendKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return { type: 'trends', confidence: 0.7 };
    }

    return { type: 'general', confidence: 0.5 };
  }

  // Obtener resumen de ventas
  async getSalesSummary(query, fromDate, toDate, storeId) {
    let query_sql = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(so.total - so.discount) as total_revenue,
        AVG(so.total - so.discount) as avg_order_value,
        COUNT(DISTINCT so.store_id) as active_stores
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
    `;

    const params = [fromDate, toDate];
    if (storeId) {
      query_sql += ' AND so.store_id = ?';
      params.push(storeId);
    }

    const stmt = db.prepare(query_sql);
    const result = stmt.get(...params);

    return {
      type: 'sales_summary',
      message: `📊 **Resumen de Ventas**\n\n` +
               `• **Total de órdenes:** ${result.total_orders || 0}\n` +
               `• **Ingresos totales:** $${(result.total_revenue || 0).toLocaleString()}\n` +
               `• **Promedio por orden:** $${(result.avg_order_value || 0).toFixed(2)}\n` +
               `• **Tiendas activas:** ${result.active_stores || 0}`,
      data: result
    };
  }

  // Análisis de productos
  async getProductAnalysis(query, fromDate, toDate, storeId) {
    const query_sql = `
      SELECT 
        sp.name,
        sp.fixed_name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue,
        AVG(sp.sale_price) as avg_price
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      JOIN stores s ON sp.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND sp.store_id = ?' : ''}
      GROUP BY sp.name, sp.fixed_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    const params = [fromDate, toDate];
    if (storeId) params.push(storeId);

    const stmt = db.prepare(query_sql);
    const results = stmt.all(...params);

    const topProduct = results[0];
    let message = `🏆 **Análisis de Productos**\n\n`;
    
    if (topProduct) {
      message += `**Producto estrella:** ${topProduct.name}\n` +
                 `• Vendido ${topProduct.times_sold} veces\n` +
                 `• Cantidad total: ${topProduct.total_quantity} unidades\n` +
                 `• Ingresos: $${topProduct.total_revenue.toLocaleString()}\n\n`;
    }

    message += `**Top 5 productos:**\n`;
    results.slice(0, 5).forEach((product, index) => {
      message += `${index + 1}. ${product.name} - ${product.total_quantity} unidades\n`;
    });

    return {
      type: 'product_analysis',
      message: message,
      data: results
    };
  }

  // Análisis de métodos de pago
  async getPaymentAnalysis(query, fromDate, toDate, storeId) {
    const query_sql = `
      SELECT 
        CASE 
          WHEN payment_method = 'cash' THEN 'Efectivo'
          ELSE 'Otros Medios'
        END as payment_group,
        COUNT(*) as order_count,
        SUM(total - discount) as total_revenue,
        AVG(total - discount) as avg_order_value
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
      GROUP BY payment_group
      ORDER BY total_revenue DESC
    `;

    const params = [fromDate, toDate];
    if (storeId) params.push(storeId);

    const stmt = db.prepare(query_sql);
    const results = stmt.all(...params);

    let message = `💳 **Análisis de Métodos de Pago**\n\n`;
    
    results.forEach(payment => {
      const percentage = ((payment.total_revenue / results.reduce((sum, p) => sum + p.total_revenue, 0)) * 100).toFixed(1);
      message += `**${payment.payment_group}:**\n` +
                 `• Órdenes: ${payment.order_count}\n` +
                 `• Ingresos: $${payment.total_revenue.toLocaleString()} (${percentage}%)\n` +
                 `• Promedio: $${payment.avg_order_value.toFixed(2)}\n\n`;
    });

    return {
      type: 'payment_analysis',
      message: message,
      data: results
    };
  }

  // Análisis comparativo
  async getComparisonAnalysis(query, fromDate, toDate, storeId) {
    // Comparar con período anterior
    const currentQuery = `
      SELECT 
        COUNT(*) as orders,
        SUM(total - discount) as revenue,
        AVG(total - discount) as avg_order
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
    `;

    const currentParams = [fromDate, toDate];
    if (storeId) currentParams.push(storeId);

    const currentStmt = db.prepare(currentQuery);
    const currentData = currentStmt.get(...currentParams);

    // Calcular período anterior
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    const daysDiff = Math.ceil((toDateObj - fromDateObj) / (1000 * 60 * 60 * 24));
    
    const prevToDate = new Date(fromDateObj.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000));

    const prevParams = [prevFromDate.toISOString().split('T')[0], prevToDate.toISOString().split('T')[0]];
    if (storeId) prevParams.push(storeId);

    const prevStmt = db.prepare(currentQuery);
    const prevData = prevStmt.get(...prevParams);

    const ordersChange = prevData.orders > 0 ? 
      (((currentData.orders - prevData.orders) / prevData.orders) * 100).toFixed(1) : 0;
    
    const revenueChange = prevData.revenue > 0 ? 
      (((currentData.revenue - prevData.revenue) / prevData.revenue) * 100).toFixed(1) : 0;

    let message = `📈 **Análisis Comparativo**\n\n`;
    message += `**Período actual vs anterior:**\n\n`;
    message += `**Órdenes:**\n`;
    message += `• Actual: ${currentData.orders || 0}\n`;
    message += `• Anterior: ${prevData.orders || 0}\n`;
    message += `• Cambio: ${ordersChange > 0 ? '+' : ''}${ordersChange}%\n\n`;
    message += `**Ingresos:**\n`;
    message += `• Actual: $${(currentData.revenue || 0).toLocaleString()}\n`;
    message += `• Anterior: $${(prevData.revenue || 0).toLocaleString()}\n`;
    message += `• Cambio: ${revenueChange > 0 ? '+' : ''}${revenueChange}%\n\n`;

    if (parseFloat(ordersChange) > 10) {
      message += `🎉 ¡Excelente crecimiento en órdenes!`;
    } else if (parseFloat(ordersChange) < -10) {
      message += `⚠️ Disminución en órdenes - revisa estrategias`;
    } else {
      message += `📊 Rendimiento estable`;
    }

    return {
      type: 'comparison',
      message: message,
      data: {
        current: currentData,
        previous: prevData,
        changes: {
          orders: parseFloat(ordersChange),
          revenue: parseFloat(revenueChange)
        }
      }
    };
  }

  // Análisis de tendencias
  async getTrendAnalysis(query, fromDate, toDate, storeId) {
    const query_sql = `
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as orders,
        SUM(total - discount) as revenue
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
      GROUP BY DATE(order_date)
      ORDER BY date
    `;

    const params = [fromDate, toDate];
    if (storeId) params.push(storeId);

    const stmt = db.prepare(query_sql);
    const results = stmt.all(...params);

    if (results.length < 3) {
      return {
        type: 'trends',
        message: '📊 Se necesitan más datos para analizar tendencias',
        data: results
      };
    }

    // Calcular tendencia simple
    const firstHalf = results.slice(0, Math.floor(results.length / 2));
    const secondHalf = results.slice(Math.floor(results.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.revenue, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.revenue, 0) / secondHalf.length;

    const trend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    let message = `📈 **Análisis de Tendencias**\n\n`;
    message += `**Período analizado:** ${results.length} días\n`;
    message += `**Promedio primera mitad:** $${firstHalfAvg.toLocaleString()}\n`;
    message += `**Promedio segunda mitad:** $${secondHalfAvg.toLocaleString()}\n\n`;

    if (trend > 5) {
      message += `📈 **Tendencia positiva:** +${trend.toFixed(1)}% de crecimiento`;
    } else if (trend < -5) {
      message += `📉 **Tendencia negativa:** ${trend.toFixed(1)}% de decrecimiento`;
    } else {
      message += `📊 **Tendencia estable:** ${trend.toFixed(1)}% de variación`;
    }

    return {
      type: 'trends',
      message: message,
      data: {
        dailyData: results,
        trend: trend,
        firstHalfAvg: firstHalfAvg,
        secondHalfAvg: secondHalfAvg
      }
    };
  }

  // Insights generales
  async getGeneralInsights(query, fromDate, toDate, storeId) {
    // Obtener estadísticas generales
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(total - discount) as total_revenue,
        AVG(total - discount) as avg_order_value,
        COUNT(DISTINCT store_id) as stores_count
      FROM sale_orders so
      JOIN stores s ON so.store_id = s.store_id
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      ${storeId ? 'AND so.store_id = ?' : ''}
    `;

    const params = [fromDate, toDate];
    if (storeId) params.push(storeId);

    const stmt = db.prepare(statsQuery);
    const stats = stmt.get(...params);

    let message = `🤖 **Insights Generales**\n\n`;
    message += `Basándome en los datos del período seleccionado:\n\n`;
    message += `• **${stats.total_orders || 0} órdenes** procesadas\n`;
    message += `• **$${(stats.total_revenue || 0).toLocaleString()}** en ingresos totales\n`;
    message += `• **$${(stats.avg_order_value || 0).toFixed(2)}** promedio por orden\n`;
    message += `• **${stats.stores_count || 0} tiendas** activas\n\n`;

    if (stats.avg_order_value > 100) {
      message += `💡 **Insight:** Tu ticket promedio es alto, considera estrategias de upselling`;
    } else if (stats.avg_order_value < 50) {
      message += `💡 **Insight:** Ticket promedio bajo, evalúa aumentar precios o agregar productos complementarios`;
    } else {
      message += `💡 **Insight:** Ticket promedio equilibrado, mantén la estrategia actual`;
    }

    return {
      type: 'general',
      message: message,
      data: stats
    };
  }

  // Obtener historial de conversación
  getConversationHistory(userId) {
    return this.conversationHistory.get(userId) || [];
  }

  // Limpiar historial de conversación
  clearConversationHistory(userId) {
    this.conversationHistory.delete(userId);
  }
}

export default new AIChatService();
