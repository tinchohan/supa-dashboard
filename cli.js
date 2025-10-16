#!/usr/bin/env node

import MultiStoreSyncService from './services/multiStoreSyncService.js';
import QueryTool from './tools/query.js';
import DataAnalyzer from './tools/analyzer.js';
import StoreManager from './config/stores.js';
import dotenv from 'dotenv';

dotenv.config();

class CLI {
  constructor() {
    this.syncService = new MultiStoreSyncService();
    this.queryTool = new QueryTool();
    this.analyzer = new DataAnalyzer();
    this.storeManager = new StoreManager();
  }

  async run() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    try {
      switch (command) {
        case 'sync':
          await this.handleSync(args);
          break;
        case 'sync-store':
          await this.handleSyncStore(args);
          break;
        case 'stores':
          await this.handleStores(args);
          break;
        case 'query':
          await this.handleQuery(args);
          break;
        case 'analyze':
          await this.handleAnalyze(args);
          break;
        case 'export':
          await this.handleExport(args);
          break;
        case 'help':
          this.showHelp();
          break;
        default:
          console.log('❌ Comando no reconocido. Usa "node cli.js help" para ver la ayuda.');
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  async handleSync(args) {
    const fromDate = args[0] || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = args[1] || fromDate;

    console.log(`🔄 Sincronizando todas las tiendas desde ${fromDate} hasta ${toDate}...`);
    const result = await this.syncService.syncAllStores(fromDate, toDate);
    
    if (result.success) {
      console.log(`✅ Sincronización exitosa: ${result.totalRecords} registros de ${result.results.length} tiendas`);
    } else {
      console.log(`⚠️ Sincronización parcial: ${result.totalRecords} registros, ${result.errors.length} errores`);
    }
  }

  async handleSyncStore(args) {
    const storeId = args[0];
    const fromDate = args[1] || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = args[2] || fromDate;

    if (!storeId) {
      console.log('❌ Debes especificar el ID de la tienda');
      console.log('Uso: node cli.js sync-store <store_id> [fecha_inicio] [fecha_fin]');
      return;
    }

    console.log(`🔄 Sincronizando tienda ${storeId} desde ${fromDate} hasta ${toDate}...`);
    const result = await this.syncService.syncStoreById(storeId, fromDate, toDate);
    
    if (result.success) {
      console.log(`✅ Sincronización exitosa: ${result.records} registros`);
    } else {
      console.log(`❌ Error en sincronización: ${result.error}`);
    }
  }

  async handleStores(args) {
    const action = args[0] || 'list';

    switch (action) {
      case 'list':
        const stores = this.storeManager.getStoreNames();
        console.log('🏪 TIENDAS CONFIGURADAS:');
        stores.forEach((store, index) => {
          console.log(`   ${index + 1}. ${store.name} (ID: ${store.id}) - ${store.email}`);
        });
        break;

      case 'summary':
        const fromDate = args[1] || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const toDate = args[2] || new Date().toISOString().split('T')[0];
        
        const summary = this.syncService.getStoresSummary(fromDate, toDate);
        console.log(`📊 RESUMEN POR TIENDA (${fromDate} - ${toDate}):`);
        summary.forEach(store => {
          console.log(`   • ${store.store_name} (${store.store_id}):`);
          console.log(`     - Órdenes: ${store.total_orders || 0}`);
          console.log(`     - Productos: ${store.total_products || 0}`);
          console.log(`     - Combos: ${store.total_combos || 0}`);
          console.log(`     - Ingresos: $${store.total_revenue?.toFixed(2) || 0}`);
          console.log(`     - Promedio por orden: $${store.avg_order_value?.toFixed(2) || 0}`);
          console.log('');
        });
        break;

      default:
        console.log('❌ Acción no reconocida. Acciones disponibles: list, summary');
    }
  }

  async handleQuery(args) {
    const queryType = args[0];
    const fromDate = args[1] || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = args[2] || new Date().toISOString().split('T')[0];

    switch (queryType) {
      case 'top-products':
        const limit = parseInt(args[3]) || 10;
        const products = this.queryTool.getTopProducts(limit, fromDate, toDate);
        console.log(`🏆 Top ${limit} productos más vendidos:`);
        products.forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} - ${product.times_sold} ventas - $${product.total_revenue.toFixed(2)}`);
        });
        break;

      case 'payment-methods':
        const methods = this.queryTool.getSalesByPaymentMethod(fromDate, toDate);
        console.log('💳 Ventas por método de pago:');
        methods.forEach(method => {
          console.log(`   • ${method.payment_method}: ${method.order_count} órdenes - $${method.total_revenue.toFixed(2)}`);
        });
        break;

      case 'daily-sales':
        const daily = this.queryTool.getDailySales(fromDate, toDate);
        console.log('📅 Ventas diarias:');
        daily.forEach(day => {
          console.log(`   • ${day.date}: ${day.order_count} órdenes - $${day.total_revenue.toFixed(2)}`);
        });
        break;

      case 'sessions':
        const sessions = this.queryTool.getSessionSummary(fromDate, toDate);
        console.log('👥 Resumen de sesiones:');
        sessions.forEach(session => {
          console.log(`   • ${session.shop_number} - ${session.username}: ${session.order_count} órdenes - $${session.total_invoiced.toFixed(2)}`);
        });
        break;

      default:
        console.log('❌ Tipo de consulta no reconocido. Tipos disponibles:');
        console.log('   • top-products [limit]');
        console.log('   • payment-methods');
        console.log('   • daily-sales');
        console.log('   • sessions');
    }
  }

  async handleAnalyze(args) {
    const fromDate = args[0] || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = args[1] || new Date().toISOString().split('T')[0];
    const productName = args[2];

    if (productName) {
      this.analyzer.analyzeProductPerformance(productName, fromDate, toDate);
    } else {
      await this.analyzer.analyzeSales(fromDate, toDate);
    }
  }

  async handleExport(args) {
    const queryType = args[0];
    const fromDate = args[1] || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = args[2] || new Date().toISOString().split('T')[0];
    const filename = args[3] || `export_${queryType}_${fromDate}_to_${toDate}.csv`;

    let query, params;
    
    switch (queryType) {
      case 'products':
        query = `
          SELECT sp.*, so.order_date 
          FROM sale_products sp
          JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order
          WHERE DATE(so.order_date) BETWEEN ? AND ?
          ORDER BY so.order_date DESC
        `;
        params = [fromDate, toDate];
        break;

      case 'orders':
        query = `
          SELECT * FROM sale_orders 
          WHERE DATE(order_date) BETWEEN ? AND ?
          ORDER BY order_date DESC
        `;
        params = [fromDate, toDate];
        break;

      case 'sessions':
        query = `
          SELECT * FROM sessions 
          WHERE DATE(checkin) BETWEEN ? AND ?
          ORDER BY checkin DESC
        `;
        params = [fromDate, toDate];
        break;

      default:
        console.log('❌ Tipo de exportación no reconocido. Tipos disponibles: products, orders, sessions');
        return;
    }

    this.queryTool.exportToCSV(query, filename, params);
  }

  showHelp() {
    console.log(`
🚀 Linisco Multi-Store Data Sync - Herramienta CLI

COMANDOS DISPONIBLES:

📥 SINCRONIZACIÓN:
  node cli.js sync [fecha_inicio] [fecha_fin]
    - Sincroniza TODAS las tiendas desde la API
    - Ejemplo: node cli.js sync 2024-01-01 2024-01-31

  node cli.js sync-store <store_id> [fecha_inicio] [fecha_fin]
    - Sincroniza una tienda específica
    - Ejemplo: node cli.js sync-store 20003 2024-01-01 2024-01-31

🏪 GESTIÓN DE TIENDAS:
  node cli.js stores list
    - Lista todas las tiendas configuradas

  node cli.js stores summary [fecha_inicio] [fecha_fin]
    - Resumen de ventas por tienda
    - Ejemplo: node cli.js stores summary 2024-01-01 2024-01-31

📊 CONSULTAS:
  node cli.js query <tipo> [fecha_inicio] [fecha_fin] [opciones]
    - top-products [limit] - Productos más vendidos
    - payment-methods - Ventas por método de pago
    - daily-sales - Ventas diarias
    - sessions - Resumen de sesiones

🔍 ANÁLISIS:
  node cli.js analyze [fecha_inicio] [fecha_fin] [producto]
    - Análisis completo de ventas
    - Análisis de producto específico

📤 EXPORTAR:
  node cli.js export <tipo> [fecha_inicio] [fecha_fin] [archivo]
    - products - Exportar productos vendidos
    - orders - Exportar órdenes de venta
    - sessions - Exportar sesiones

EJEMPLOS:
  # Sincronizar todas las tiendas
  node cli.js sync 2024-01-01 2024-01-31
  
  # Sincronizar tienda específica
  node cli.js sync-store 20003 2024-01-01 2024-01-31
  
  # Ver resumen por tienda
  node cli.js stores summary 2024-01-01 2024-01-31
  
  # Consultar top productos
  node cli.js query top-products 2024-01-01 2024-01-31 20
  
  # Análisis completo
  node cli.js analyze 2024-01-01 2024-01-31
  
  # Exportar datos
  node cli.js export products 2024-01-01 2024-01-31 productos.csv
    `);
  }

  cleanup() {
    this.syncService.close();
    this.queryTool.close();
    this.analyzer.close();
  }
}

// Ejecutar CLI
const cli = new CLI();
cli.run();
