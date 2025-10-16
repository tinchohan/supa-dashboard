import QueryTool from './query.js';

class DataAnalyzer {
  constructor() {
    this.queryTool = new QueryTool();
  }

  // Análisis completo de ventas
  async analyzeSales(fromDate, toDate) {
    console.log(`📊 Analizando ventas desde ${fromDate} hasta ${toDate}...\n`);

    // Resumen general
    const summary = this.queryTool.syncService.getSalesSummary(fromDate, toDate);
    console.log('📈 RESUMEN GENERAL:');
    console.log(`   • Total de órdenes: ${summary.total_orders}`);
    console.log(`   • Total de productos vendidos: ${summary.total_products}`);
    console.log(`   • Total de combos vendidos: ${summary.total_combos}`);
    console.log(`   • Ingresos totales: $${summary.total_revenue?.toFixed(2) || 0}`);
    console.log(`   • Valor promedio por orden: $${summary.avg_order_value?.toFixed(2) || 0}\n`);

    // Top productos
    console.log('🏆 TOP 10 PRODUCTOS MÁS VENDIDOS:');
    const topProducts = this.queryTool.getTopProducts(10, fromDate, toDate);
    topProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} - ${product.times_sold} ventas - $${product.total_revenue.toFixed(2)}`);
    });
    console.log('');

    // Ventas por método de pago
    console.log('💳 VENTAS POR MÉTODO DE PAGO:');
    const paymentMethods = this.queryTool.getSalesByPaymentMethod(fromDate, toDate);
    paymentMethods.forEach(method => {
      console.log(`   • ${method.payment_method}: ${method.order_count} órdenes - $${method.total_revenue.toFixed(2)}`);
    });
    console.log('');

    // Ventas diarias
    console.log('📅 VENTAS DIARIAS:');
    const dailySales = this.queryTool.getDailySales(fromDate, toDate);
    dailySales.forEach(day => {
      console.log(`   • ${day.date}: ${day.order_count} órdenes - $${day.total_revenue.toFixed(2)}`);
    });
    console.log('');

    // Análisis de combos
    console.log('🍔 ANÁLISIS DE COMBOS:');
    const combos = this.queryTool.getComboAnalysis(fromDate, toDate);
    if (combos.length > 0) {
      combos.forEach(combo => {
        console.log(`   • ${combo.name}: ${combo.times_sold} ventas - $${combo.total_revenue.toFixed(2)}`);
      });
    } else {
      console.log('   • No se encontraron combos vendidos en el período');
    }
    console.log('');

    // Análisis por horas
    console.log('⏰ VENTAS POR HORA:');
    const hourlySales = this.queryTool.getHourlySales(fromDate, toDate);
    hourlySales.forEach(hour => {
      console.log(`   • ${hour.hour}:00 - ${hour.order_count} órdenes - $${hour.total_revenue.toFixed(2)}`);
    });
  }

  // Análisis de rendimiento de productos
  analyzeProductPerformance(productName, fromDate, toDate) {
    console.log(`🔍 Analizando rendimiento de: ${productName}\n`);
    
    const performance = this.queryTool.getProductPerformance(productName, fromDate, toDate);
    
    if (performance.length === 0) {
      console.log('❌ No se encontraron productos con ese nombre');
      return;
    }

    performance.forEach(product => {
      console.log(`📦 PRODUCTO: ${product.name}`);
      console.log(`   • Veces vendido: ${product.times_sold}`);
      console.log(`   • Cantidad total: ${product.total_quantity}`);
      console.log(`   • Ingresos totales: $${product.total_revenue.toFixed(2)}`);
      console.log(`   • Precio promedio: $${product.avg_price.toFixed(2)}`);
      console.log(`   • Precio mínimo: $${product.min_price.toFixed(2)}`);
      console.log(`   • Precio máximo: $${product.max_price.toFixed(2)}`);
      console.log('');
    });
  }

  // Análisis de sesiones
  analyzeSessions(fromDate, toDate) {
    console.log(`👥 Análisis de sesiones desde ${fromDate} hasta ${toDate}...\n`);
    
    const sessions = this.queryTool.getSessionSummary(fromDate, toDate);
    
    if (sessions.length === 0) {
      console.log('❌ No se encontraron sesiones en el período');
      return;
    }

    console.log('📊 RESUMEN DE SESIONES:');
    sessions.forEach(session => {
      const duration = session.checkout 
        ? Math.round((new Date(session.checkout) - new Date(session.checkin)) / 60000)
        : 'En progreso';
      
      console.log(`   • Tienda: ${session.shop_number} | Usuario: ${session.username}`);
      console.log(`     - Inicio: ${session.checkin}`);
      console.log(`     - Fin: ${session.checkout || 'En progreso'}`);
      console.log(`     - Duración: ${duration}${typeof duration === 'number' ? ' minutos' : ''}`);
      console.log(`     - Órdenes: ${session.order_count}`);
      console.log(`     - Facturado: $${session.total_invoiced.toFixed(2)}`);
      console.log(`     - Real: $${session.real_invoiced.toFixed(2)}`);
      console.log('');
    });
  }

  // Generar reporte completo
  async generateReport(fromDate, toDate, outputPath = null) {
    console.log(`📋 Generando reporte completo desde ${fromDate} hasta ${toDate}...\n`);
    
    const report = {
      period: { from: fromDate, to: toDate },
      generated_at: new Date().toISOString(),
      summary: this.queryTool.syncService.getSalesSummary(fromDate, toDate),
      top_products: this.queryTool.getTopProducts(20, fromDate, toDate),
      payment_methods: this.queryTool.getSalesByPaymentMethod(fromDate, toDate),
      daily_sales: this.queryTool.getDailySales(fromDate, toDate),
      hourly_sales: this.queryTool.getHourlySales(fromDate, toDate),
      combos: this.queryTool.getComboAnalysis(fromDate, toDate),
      sessions: this.queryTool.getSessionSummary(fromDate, toDate)
    };

    if (outputPath) {
      const fs = require('fs');
      const path = require('path');
      
      // Crear directorio si no existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
      console.log(`✅ Reporte guardado en: ${outputPath}`);
    }

    return report;
  }

  close() {
    this.queryTool.close();
  }
}

export default DataAnalyzer;
