import { db } from '../config/database.js';
import SyncService from '../services/syncService.js';

class QueryTool {
  constructor() {
    this.syncService = new SyncService();
  }

  // Consultas predefinidas útiles
  getTopProducts(limit = 10, fromDate = null, toDate = null) {
    let query = `
      SELECT 
        sp.name,
        sp.fixed_name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue,
        AVG(sp.sale_price) as avg_price
      FROM sale_products sp
    `;
    
    if (fromDate && toDate) {
      query += `
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
        WHERE DATE(so.order_date) BETWEEN ? AND ?
      `;
    }
    
    query += `
      GROUP BY sp.name, sp.fixed_name
      ORDER BY times_sold DESC
      LIMIT ?
    `;
    
    const stmt = db.prepare(query);
    return fromDate && toDate ? stmt.all(fromDate, toDate, limit) : stmt.all(limit);
  }

  getSalesByPaymentMethod(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as order_count,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value
      FROM sale_orders 
      WHERE DATE(order_date) BETWEEN ? AND ?
      GROUP BY payment_method
      ORDER BY total_revenue DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getDailySales(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as order_count,
        SUM(total) as total_revenue,
        AVG(total) as avg_order_value
      FROM sale_orders 
      WHERE DATE(order_date) BETWEEN ? AND ?
      GROUP BY DATE(order_date)
      ORDER BY date DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getHourlySales(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        strftime('%H', order_date) as hour,
        COUNT(*) as order_count,
        SUM(total) as total_revenue
      FROM sale_orders 
      WHERE DATE(order_date) BETWEEN ? AND ?
      GROUP BY strftime('%H', order_date)
      ORDER BY hour
    `);
    return stmt.all(fromDate, toDate);
  }

  getSessionSummary(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        s.shop_number,
        s.username,
        s.checkin,
        s.checkout,
        s.total_invoiced,
        s.real_invoiced,
        COUNT(so.id) as order_count
      FROM sessions s
      LEFT JOIN sale_orders so ON s.linisco_id = so.id_session
      WHERE DATE(s.checkin) BETWEEN ? AND ?
      GROUP BY s.linisco_id
      ORDER BY s.checkin DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  getProductPerformance(productName, fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        sp.name,
        sp.fixed_name,
        COUNT(*) as times_sold,
        SUM(sp.quantity) as total_quantity,
        SUM(sp.sale_price * sp.quantity) as total_revenue,
        AVG(sp.sale_price) as avg_price,
        MIN(sp.sale_price) as min_price,
        MAX(sp.sale_price) as max_price
      FROM sale_products sp
      JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
      WHERE sp.name LIKE ? 
        AND DATE(so.order_date) BETWEEN ? AND ?
      GROUP BY sp.name, sp.fixed_name
    `);
    return stmt.all(`%${productName}%`, fromDate, toDate);
  }

  getComboAnalysis(fromDate, toDate) {
    const stmt = db.prepare(`
      SELECT 
        sc.name,
        COUNT(*) as times_sold,
        SUM(sc.quantity) as total_quantity,
        SUM(sc.sale_price * sc.quantity) as total_revenue,
        AVG(sc.sale_price) as avg_price
      FROM sale_combos sc
      JOIN sale_orders so ON sc.id_sale_order = so.id_sale_order
      WHERE DATE(so.order_date) BETWEEN ? AND ?
      GROUP BY sc.name
      ORDER BY total_revenue DESC
    `);
    return stmt.all(fromDate, toDate);
  }

  // Método para ejecutar consultas SQL personalizadas
  executeCustomQuery(sql, params = []) {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    } catch (error) {
      console.error('❌ Error ejecutando consulta:', error.message);
      throw error;
    }
  }

  // Exportar datos a CSV
  exportToCSV(query, filename, params = []) {
    try {
      const data = this.executeCustomQuery(query, params);
      
      if (data.length === 0) {
        console.log('⚠️ No hay datos para exportar');
        return;
      }

      // Obtener nombres de columnas
      const columns = Object.keys(data[0]);
      
      // Crear contenido CSV
      let csvContent = columns.join(',') + '\n';
      
      data.forEach(row => {
        const values = columns.map(col => {
          const value = row[col];
          // Escapar comillas y envolver en comillas si contiene comas
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        });
        csvContent += values.join(',') + '\n';
      });

      // Escribir archivo
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(process.cwd(), 'exports', filename);
      
      // Crear directorio si no existe
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(outputPath, csvContent);
      console.log(`✅ Datos exportados a: ${outputPath}`);
      
    } catch (error) {
      console.error('❌ Error exportando datos:', error.message);
      throw error;
    }
  }

  close() {
    this.syncService.close();
  }
}

export default QueryTool;
