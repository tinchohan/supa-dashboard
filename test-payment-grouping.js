import { db } from './config/database.js';

console.log('🔍 Probando agrupación de formas de pago...\n');

// Probar la nueva consulta agrupada
const groupedQuery = `
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

const results = db.prepare(groupedQuery).all();

console.log('📊 RESULTADOS AGRUPADOS:');
console.log(`   • Total de registros: ${results.length}`);

// Mostrar algunos ejemplos
console.log('\n📅 Ejemplos por fecha:');
const examples = results.slice(0, 10);
examples.forEach(row => {
  console.log(`   • ${row.date} - ${row.store_name} - ${row.payment_method_group}: $${row.total_amount.toLocaleString()} (${row.order_count} órdenes)`);
});

// Verificar totales por grupo
console.log('\n💰 TOTALES POR GRUPO:');
const totals = db.prepare(`
  SELECT 
    CASE 
      WHEN so.payment_method = 'cash' THEN 'Efectivo'
      ELSE 'Otros Medios de Pago'
    END as payment_method_group,
    COUNT(*) as total_orders,
    SUM(so.total - so.discount) as total_amount
  FROM sale_orders so
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
  GROUP BY payment_method_group
  ORDER BY total_amount DESC
`).all();

totals.forEach(group => {
  console.log(`   • ${group.payment_method_group}: $${group.total_amount.toLocaleString()} (${group.total_orders} órdenes)`);
});

// Verificar que la suma coincide
const totalSum = totals.reduce((sum, group) => sum + group.total_amount, 0);
console.log(`\n✅ Total verificado: $${totalSum.toLocaleString()}`);

db.close();

