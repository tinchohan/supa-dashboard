import { db } from './config/database.js';

console.log('🔍 Verificando esquema de sale_products...\n');

try {
  // Verificar columnas de sale_products
  const columns = db.prepare('PRAGMA table_info(sale_products)').all();
  console.log('📋 Columnas en sale_products:');
  columns.forEach(col => {
    console.log(`   • ${col.name} (${col.type})`);
  });

  // Verificar datos de ejemplo
  console.log('\n📊 Datos de ejemplo en sale_products:');
  const example = db.prepare('SELECT * FROM sale_products LIMIT 3').all();
  example.forEach((row, index) => {
    console.log(`\n   Registro ${index + 1}:`);
    Object.keys(row).forEach(key => {
      console.log(`     ${key}: ${row[key]}`);
    });
  });

  // Verificar totales de sale_products
  console.log('\n📈 Resumen de sale_products:');
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_records,
      SUM(quantity) as total_quantity,
      COUNT(DISTINCT linisco_id) as unique_products
    FROM sale_products
  `).get();
  
  console.log(`   • Total de registros: ${summary.total_records}`);
  console.log(`   • Total de cantidad: ${summary.total_quantity}`);
  console.log(`   • Productos únicos: ${summary.unique_products}`);

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
