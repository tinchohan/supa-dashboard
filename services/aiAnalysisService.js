import { db } from '../config/database.js';

class AIAnalysisService {
  constructor() {
    this.analysisCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // Análisis inteligente de patrones de ventas
  async analyzeSalesPatterns(fromDate, toDate, storeId = null) {
    try {
      const cacheKey = `patterns_${fromDate}_${toDate}_${storeId || 'all'}`;
      const cached = this.analysisCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Obtener datos de ventas por día de la semana
      const dayOfWeekQuery = `
        SELECT 
          CASE 
            WHEN strftime('%w', order_date) = '0' THEN 'Domingo'
            WHEN strftime('%w', order_date) = '1' THEN 'Lunes'
            WHEN strftime('%w', order_date) = '2' THEN 'Martes'
            WHEN strftime('%w', order_date) = '3' THEN 'Miércoles'
            WHEN strftime('%w', order_date) = '4' THEN 'Jueves'
            WHEN strftime('%w', order_date) = '5' THEN 'Viernes'
            WHEN strftime('%w', order_date) = '6' THEN 'Sábado'
          END as day_name,
          strftime('%w', order_date) as day_number,
          COUNT(*) as order_count,
          SUM(total - discount) as total_revenue,
          AVG(total - discount) as avg_order_value
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY strftime('%w', order_date)
        ORDER BY day_number
      `;

      const params = [fromDate, toDate];
      if (storeId) params.push(storeId);

      const dayOfWeekStmt = db.prepare(dayOfWeekQuery);
      const dayOfWeekData = dayOfWeekStmt.all(...params);

      // Obtener datos de ventas por hora
      const hourlyQuery = `
        SELECT 
          strftime('%H', order_date) as hour,
          COUNT(*) as order_count,
          SUM(total - discount) as total_revenue
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY strftime('%H', order_date)
        ORDER BY hour
      `;

      const hourlyStmt = db.prepare(hourlyQuery);
      const hourlyData = hourlyStmt.all(...params);

      // Análisis de tendencias de productos
      const productTrendsQuery = `
        SELECT 
          sp.name,
          sp.fixed_name,
          COUNT(*) as times_sold,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue,
          AVG(sp.sale_price) as avg_price,
          DATE(sp.synced_at) as sale_date
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
        JOIN stores s ON sp.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND sp.store_id = ?' : ''}
        GROUP BY sp.name, sp.fixed_name, DATE(sp.synced_at)
        ORDER BY sale_date DESC, total_quantity DESC
        LIMIT 20
      `;

      const productTrendsStmt = db.prepare(productTrendsQuery);
      const productTrendsData = productTrendsStmt.all(...params);

      // Análisis de métodos de pago
      const paymentMethodQuery = `
        SELECT 
          payment_method,
          COUNT(*) as order_count,
          SUM(total - discount) as total_revenue,
          AVG(total - discount) as avg_order_value
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY payment_method
        ORDER BY total_revenue DESC
      `;

      const paymentMethodStmt = db.prepare(paymentMethodQuery);
      const paymentMethodData = paymentMethodStmt.all(...params);

      // Generar insights automáticos
      const insights = this.generateInsights({
        dayOfWeekData,
        hourlyData,
        productTrendsData,
        paymentMethodData
      });

      const result = {
        dayOfWeekPatterns: dayOfWeekData,
        hourlyPatterns: hourlyData,
        productTrends: productTrendsData,
        paymentMethodAnalysis: paymentMethodData,
        insights: insights,
        generatedAt: new Date().toISOString()
      };

      // Cachear resultado
      this.analysisCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Error en análisis de patrones:', error);
      throw error;
    }
  }

  // Generar insights automáticos basados en los datos
  generateInsights(data) {
    const insights = [];

    // Insight sobre el mejor día de la semana
    if (data.dayOfWeekData.length > 0) {
      const bestDay = data.dayOfWeekData.reduce((max, day) => 
        day.total_revenue > max.total_revenue ? day : max
      );
      insights.push({
        type: 'performance',
        title: 'Mejor Día de Ventas',
        message: `${bestDay.day_name} es tu mejor día con $${bestDay.total_revenue.toLocaleString()} en ventas`,
        recommendation: `Considera promociones especiales los ${bestDay.day_name}s para maximizar ingresos`
      });
    }

    // Insight sobre horarios pico
    if (data.hourlyData.length > 0) {
      const peakHour = data.hourlyData.reduce((max, hour) => 
        hour.total_revenue > max.total_revenue ? hour : max
      );
      insights.push({
        type: 'timing',
        title: 'Horario Pico',
        message: `La hora ${peakHour.hour}:00 es tu momento de mayor actividad con $${peakHour.total_revenue.toLocaleString()}`,
        recommendation: `Asegúrate de tener suficiente personal durante las ${peakHour.hour}:00`
      });
    }

    // Insight sobre productos estrella
    if (data.productTrendsData.length > 0) {
      const topProduct = data.productTrendsData[0];
      insights.push({
        type: 'product',
        title: 'Producto Estrella',
        message: `"${topProduct.name}" es tu producto más vendido con ${topProduct.total_quantity} unidades`,
        recommendation: `Mantén stock suficiente de este producto y considera promociones relacionadas`
      });
    }

    // Insight sobre métodos de pago
    if (data.paymentMethodData.length > 0) {
      const cashOrders = data.paymentMethodData.find(pm => pm.payment_method === 'cash');
      const cardOrders = data.paymentMethodData.filter(pm => pm.payment_method !== 'cash');
      
      if (cashOrders && cardOrders.length > 0) {
        const totalCardRevenue = cardOrders.reduce((sum, pm) => sum + pm.total_revenue, 0);
        const cashPercentage = (cashOrders.total_revenue / (cashOrders.total_revenue + totalCardRevenue)) * 100;
        
        insights.push({
          type: 'payment',
          title: 'Análisis de Pagos',
          message: `${cashPercentage.toFixed(1)}% de tus ventas son en efectivo`,
          recommendation: cashPercentage > 70 ? 
            'Considera incentivar pagos con tarjeta para reducir manejo de efectivo' :
            'Tu mix de pagos está bien balanceado'
        });
      }
    }

    return insights;
  }

  // Análisis predictivo simple
  async generatePredictions(fromDate, toDate, storeId = null) {
    try {
      // Obtener datos históricos de los últimos 30 días
      const historicalQuery = `
        SELECT 
          DATE(order_date) as date,
          COUNT(*) as order_count,
          SUM(total - discount) as total_revenue,
          AVG(total - discount) as avg_order_value
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN date(?, '-30 days') AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY DATE(order_date)
        ORDER BY date
      `;

      const params = [toDate, toDate];
      if (storeId) params.push(storeId);

      const stmt = db.prepare(historicalQuery);
      const historicalData = stmt.all(...params);

      if (historicalData.length < 7) {
        return {
          predictions: [],
          confidence: 'low',
          message: 'Se necesitan más datos históricos para predicciones precisas'
        };
      }

      // Cálculo simple de tendencia
      const recentData = historicalData.slice(-7); // Últimos 7 días
      const olderData = historicalData.slice(-14, -7); // 7 días anteriores

      const recentAvg = recentData.reduce((sum, day) => sum + day.total_revenue, 0) / recentData.length;
      const olderAvg = olderData.reduce((sum, day) => sum + day.total_revenue, 0) / olderData.length;
      
      const trend = ((recentAvg - olderAvg) / olderAvg) * 100;
      const confidence = Math.min(95, Math.max(20, 100 - Math.abs(trend)));

      const predictions = [];
      
      // Predicción para los próximos 7 días
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(toDate);
        futureDate.setDate(futureDate.getDate() + i);
        
        const predictedRevenue = recentAvg * (1 + (trend / 100));
        const predictedOrders = Math.round(recentData.reduce((sum, day) => sum + day.order_count, 0) / recentData.length);
        
        predictions.push({
          date: futureDate.toISOString().split('T')[0],
          predictedRevenue: Math.round(predictedRevenue),
          predictedOrders: predictedOrders,
          confidence: Math.round(confidence)
        });
      }

      return {
        predictions,
        trend: Math.round(trend * 100) / 100,
        confidence: Math.round(confidence),
        message: trend > 5 ? 'Tendencia positiva detectada' : 
                 trend < -5 ? 'Tendencia negativa detectada' : 
                 'Tendencia estable'
      };

    } catch (error) {
      console.error('Error en predicciones:', error);
      throw error;
    }
  }

  // Generar recomendaciones inteligentes
  async generateRecommendations(fromDate, toDate, storeId = null) {
    try {
      const recommendations = [];

      // Análisis de productos con bajo rendimiento
      const lowPerformingQuery = `
        SELECT 
          sp.name,
          sp.fixed_name,
          COUNT(*) as times_sold,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
        JOIN stores s ON sp.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND sp.store_id = ?' : ''}
        GROUP BY sp.name, sp.fixed_name
        HAVING COUNT(*) < 3
        ORDER BY total_revenue ASC
        LIMIT 5
      `;

      const params = [fromDate, toDate];
      if (storeId) params.push(storeId);

      const lowPerformingStmt = db.prepare(lowPerformingQuery);
      const lowPerformingProducts = lowPerformingStmt.all(...params);

      if (lowPerformingProducts.length > 0) {
        recommendations.push({
          type: 'inventory',
          priority: 'medium',
          title: 'Productos con Bajo Rendimiento',
          description: `${lowPerformingProducts.length} productos han vendido menos de 3 veces`,
          action: 'Considera promociones o revisar si estos productos son necesarios',
          products: lowPerformingProducts.map(p => p.name)
        });
      }

      // Análisis de días con baja actividad
      const dailyActivityQuery = `
        SELECT 
          DATE(order_date) as date,
          COUNT(*) as order_count,
          SUM(total - discount) as total_revenue
        FROM sale_orders so
        JOIN stores s ON so.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND so.store_id = ?' : ''}
        GROUP BY DATE(order_date)
        ORDER BY total_revenue ASC
        LIMIT 3
      `;

      const dailyActivityStmt = db.prepare(dailyActivityQuery);
      const lowActivityDays = dailyActivityStmt.all(...params);

      if (lowActivityDays.length > 0) {
        recommendations.push({
          type: 'marketing',
          priority: 'high',
          title: 'Días con Baja Actividad',
          description: `Identificados ${lowActivityDays.length} días con ventas por debajo del promedio`,
          action: 'Considera campañas promocionales para estos días',
          dates: lowActivityDays.map(d => d.date)
        });
      }

      // Análisis de oportunidades de mejora en precios
      const priceAnalysisQuery = `
        SELECT 
          sp.name,
          AVG(sp.sale_price) as avg_price,
          COUNT(*) as times_sold,
          SUM(sp.quantity) as total_quantity
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
        JOIN stores s ON sp.store_id = s.store_id
        WHERE DATE(so.order_date) BETWEEN ? AND ?
        ${storeId ? 'AND sp.store_id = ?' : ''}
        GROUP BY sp.name
        HAVING COUNT(*) >= 5
        ORDER BY avg_price DESC
        LIMIT 5
      `;

      const priceAnalysisStmt = db.prepare(priceAnalysisQuery);
      const highPriceProducts = priceAnalysisStmt.all(...params);

      if (highPriceProducts.length > 0) {
        recommendations.push({
          type: 'pricing',
          priority: 'low',
          title: 'Productos Premium',
          description: 'Productos con precios altos que se venden bien',
          action: 'Considera introducir productos similares o aumentar el stock',
          products: highPriceProducts.map(p => ({ name: p.name, price: p.avg_price }))
        });
      }

      return recommendations;

    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      throw error;
    }
  }

  // Limpiar cache
  clearCache() {
    this.analysisCache.clear();
  }
}

export default new AIAnalysisService();

