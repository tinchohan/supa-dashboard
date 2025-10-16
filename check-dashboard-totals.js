import { db } from './config/database.js';

console.log('🔍 Verificando qué suma el dashboard en "Ingresos Totales"...\n');

// Replicar exactamente la consulta que usa el dashboard
const dashboardQuery = `
  SELECT 
    COUNT(DISTINCT so.id) as total_orders,
    COUNT(DISTINCT sp.id) as total_products,
    COUNT(DISTINCT s.store_id) as total_stores,
    SUM(so.total - so.discount) as total_revenue,
    AVG(so.total - so.discount) as avg_order_value,
    COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
  FROM sale_orders so
  LEFT JOIN sale_products sp ON so.linisco_id = sp.id_sale_order
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`;

const result = db.prepare(dashboardQuery).get();

console.log('📊 RESULTADO DEL DASHBOARD:');
console.log(`   • Total de órdenes: ${result.total_orders}`);
console.log(`   • Total de productos: ${result.total_products}`);
console.log(`   • Total de tiendas: ${result.total_stores}`);
console.log(`   • Ingresos Totales (total_revenue): $${result.total_revenue.toLocaleString()}`);
console.log(`   • Promedio por orden: $${result.avg_order_value.toFixed(2)}`);
console.log(`   • Días con ventas: ${result.days_with_sales}`);

// Verificar la fórmula que está usando
console.log('\n🔍 VERIFICANDO LA FÓRMULA:');
const formulaCheck = `
  SELECT 
    SUM(so.total) as suma_total,
    SUM(so.discount) as suma_descuentos,
    SUM(so.total - so.discount) as suma_neto,
    COUNT(*) as total_registros
  FROM sale_orders so
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`;

const formulaResult = db.prepare(formulaCheck).get();

console.log(`   • Suma de 'total': $${formulaResult.suma_total.toLocaleString()}`);
console.log(`   • Suma de 'discount': $${formulaResult.suma_descuentos.toLocaleString()}`);
console.log(`   • Suma de 'total - discount': $${formulaResult.suma_neto.toLocaleString()}`);
console.log(`   • Total de registros: ${formulaResult.total_registros}`);

// Verificar si hay diferencias por el LEFT JOIN
console.log('\n🔍 VERIFICANDO IMPACTO DEL LEFT JOIN:');
const withoutJoinQuery = `
  SELECT 
    SUM(so.total - so.discount) as total_revenue_sin_join,
    COUNT(*) as registros_sin_join
  FROM sale_orders so
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`;

const withoutJoin = db.prepare(withoutJoinQuery).get();
console.log(`   • Sin LEFT JOIN: $${withoutJoin.total_revenue_sin_join.toLocaleString()} (${withoutJoin.registros_sin_join} registros)`);

// Verificar algunos ejemplos específicos
console.log('\n📋 EJEMPLOS DE CÁLCULOS:');
const examplesQuery = `
  SELECT 
    so.linisco_id,
    so.total,
    so.discount,
    (so.total - so.discount) as neto,
    s.store_name,
    so.payment_method
  FROM sale_orders so
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
  ORDER BY so.total DESC
  LIMIT 10
`;

const examples = db.prepare(examplesQuery).all();
examples.forEach((order, index) => {
  console.log(`   ${index + 1}. Orden ${order.linisco_id} (${order.store_name}):`);
  console.log(`      Total: $${order.total} - Descuento: $${order.discount} = Neto: $${order.neto}`);
  console.log(`      Forma de pago: ${order.payment_method}`);
  console.log('');
});

db.close();
