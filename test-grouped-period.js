import { db } from './config/database.js';

console.log('🔍 Probando agrupación por período completo...\n');

// Probar la nueva consulta agrupada por período
const query = `
  SELECT 
    CASE 
      WHEN so.payment_method = 'cash' THEN 'Efectivo'
      ELSE 'Otros Medios de Pago'
    END as payment_method_group,
    s.store_name,
    s.store_id,
    COUNT(*) as order_count,
    SUM(so.total - so.discount) as total_amount,
    AVG(so.total - so.discount) as avg_order_value
  FROM sale_orders so
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
  GROUP BY payment_method_group, s.store_id, s.store_name
  ORDER BY total_amount DESC
`;

const results = db.prepare(query).all();

console.log('📊 RESULTADOS AGRUPADOS POR PERÍODO:');
console.log(`   • Total de registros: ${results.length}`);

if (results.length > 0) {
  console.log('\n🏪 Resultados por tienda:');
  results.forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.store_name} - ${row.payment_method_group}: $${row.total_amount.toLocaleString()} (${row.order_count} órdenes)`);
  });
  
  // Verificar que solo hay 2 tipos de pago por tienda
  const stores = [...new Set(results.map(row => row.store_name))];
  console.log(`\n🏪 Tiendas: ${stores.length}`);
  
  stores.forEach(store => {
    const storeResults = results.filter(r => r.store_name === store);
    console.log(`   • ${store}: ${storeResults.length} líneas (${storeResults.map(r => r.payment_method_group).join(', ')})`);
  });
  
  // Verificar totales
  const efectivo = results.filter(r => r.payment_method_group === 'Efectivo');
  const otros = results.filter(r => r.payment_method_group === 'Otros Medios de Pago');
  
  const totalEfectivo = efectivo.reduce((sum, r) => sum + r.total_amount, 0);
  const totalOtros = otros.reduce((sum, r) => sum + r.total_amount, 0);
  
  console.log(`\n💰 TOTALES:`);
  console.log(`   • Efectivo: $${totalEfectivo.toLocaleString()}`);
  console.log(`   • Otros Medios: $${totalOtros.toLocaleString()}`);
  console.log(`   • Total: $${(totalEfectivo + totalOtros).toLocaleString()}`);
}

db.close();


