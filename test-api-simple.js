import { db } from './config/database.js';

console.log('🔍 Probando consulta de API directamente...\n');

// Probar la consulta que usa el endpoint
const query = `
  SELECT 
    DATE(so.order_date) as date,
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
  GROUP BY DATE(so.order_date), payment_method_group, s.store_id, s.store_name
  ORDER BY date DESC, total_amount DESC
`;

const results = db.prepare(query).all();

console.log('📊 RESULTADOS:');
console.log(`   • Total de registros: ${results.length}`);

if (results.length > 0) {
  console.log('\n📅 Primeros 5 registros:');
  results.slice(0, 5).forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.date} - ${row.store_name} - ${row.payment_method_group}: $${row.total_amount.toLocaleString()}`);
  });
  
  // Verificar que solo hay 2 tipos de pago
  const paymentTypes = [...new Set(results.map(row => row.payment_method_group))];
  console.log(`\n💳 Tipos de pago encontrados: ${paymentTypes.join(', ')}`);
  
  if (paymentTypes.length === 2) {
    console.log('✅ Correcto: Solo 2 tipos de pago');
  } else {
    console.log('❌ Error: Debería haber solo 2 tipos de pago');
  }
  
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


