import { db } from './config/database.js';

console.log('🔍 Verificando fechas de sale_products...\n');

try {
  // Verificar rango de fechas en sale_products
  const dateRange = db.prepare(`
    SELECT 
      MIN(DATE(synced_at)) as min_date,
      MAX(DATE(synced_at)) as max_date,
      COUNT(*) as total_records
    FROM sale_products
  `).get();

  console.log('📅 Rango de fechas en sale_products:');
  console.log(`   • Fecha mínima: ${dateRange.min_date}`);
  console.log(`   • Fecha máxima: ${dateRange.max_date}`);
  console.log(`   • Total de registros: ${dateRange.total_records}`);

  // Verificar datos por día
  console.log('\n📊 Registros por día:');
  const dailyData = db.prepare(`
    SELECT 
      DATE(synced_at) as date,
      COUNT(*) as records,
      SUM(quantity) as total_quantity
    FROM sale_products
    GROUP BY DATE(synced_at)
    ORDER BY date DESC
    LIMIT 10
  `).all();

  dailyData.forEach(day => {
    console.log(`   • ${day.date}: ${day.records} registros, ${day.total_quantity} unidades`);
  });

  // Verificar si hay datos en el rango que estamos consultando
  const targetRangeData = db.prepare(`
    SELECT 
      COUNT(*) as records,
      SUM(quantity) as total_quantity
    FROM sale_products
    WHERE DATE(synced_at) BETWEEN '2025-10-01' AND '2025-10-13'
  `).get();

  console.log(`\n🎯 Datos en rango 2025-10-01 a 2025-10-13:`);
  console.log(`   • Registros: ${targetRangeData.records}`);
  console.log(`   • Unidades: ${targetRangeData.total_quantity}`);

  // Verificar datos más recientes
  const recentData = db.prepare(`
    SELECT 
      COUNT(*) as records,
      SUM(quantity) as total_quantity
    FROM sale_products
    WHERE DATE(synced_at) >= '2025-10-14'
  `).get();

  console.log(`\n📈 Datos desde 2025-10-14:`);
  console.log(`   • Registros: ${recentData.records}`);
  console.log(`   • Unidades: ${recentData.total_quantity}`);

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  db.close();
}
