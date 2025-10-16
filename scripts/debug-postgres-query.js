// Script para diagnosticar la query de PostgreSQL
import { db as postgresDb, initializeDatabase } from '../config/database-postgres-clean.js';

async function debugPostgresQuery() {
  console.log('🔍 Diagnosticando query de PostgreSQL...');
  console.log('========================================');
  
  try {
    // Inicializar PostgreSQL
    await initializeDatabase();
    console.log('✅ PostgreSQL inicializado');
    
    // Simular los parámetros que están causando el error
    const fromDate = '2025-10-15';
    const toDate = '2025-10-15';
    const limit = 50;
    
    console.log('📊 Parámetros de prueba:', { fromDate, toDate, limit });
    
    // Construir la query exacta como en el servidor
    const isPostgres = true;
    const dateFunction = 'so.order_date::date';
    const paramPlaceholder = '$';
    const joinCondition = 'sp.id_sale_order = so.id';
    
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
      WHERE ${dateFunction} BETWEEN $1 AND $2
      AND sp.store_id::text IS NOT NULL
      GROUP BY sp.name, sp.fixed_name, s.store_id, s.store_name
      ORDER BY total_revenue DESC
      LIMIT $3
    `;
    
    const params = [fromDate, toDate, Number(limit)];
    
    console.log('🔧 Query construida:');
    console.log(query);
    console.log('🔧 Parámetros:', params);
    
    // Ejecutar la query
    console.log('\n🚀 Ejecutando query...');
    const products = await postgresDb.prepare(query).all(...params);
    console.log('✅ Productos obtenidos:', products.length);
    
    if (products.length > 0) {
      console.log('📋 Primer producto:', products[0]);
    }
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.detail) {
      console.error('Detalle:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
  }
}

debugPostgresQuery();
