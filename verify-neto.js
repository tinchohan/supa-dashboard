import { db } from './config/database.js';

console.log('🔍 Verificando cálculos de ingresos netos...\n');

// Verificar algunos ejemplos de órdenes con descuentos
const examplesQuery = `
  SELECT 
    linisco_id,
    total,
    discount,
    (total - discount) as neto,
    payment_method,
    order_date
  FROM sale_orders 
  WHERE discount > 0
  LIMIT 5
`;

const examples = db.prepare(examplesQuery).all();

if (examples.length > 0) {
  console.log('📊 Ejemplos de órdenes con descuentos:');
  examples.forEach(order => {
    console.log(`   • Orden ${order.linisco_id}: Total $${order.total} - Descuento $${order.discount} = Neto $${order.neto}`);
  });
} else {
  console.log('ℹ️ No se encontraron órdenes con descuentos en el período actual');
}

// Calcular totales usando la fórmula anterior vs la nueva
const oldTotalQuery = `
  SELECT 
    SUM(total) as total_bruto,
    SUM(discount) as total_descuentos,
    SUM(total - discount) as total_neto,
    COUNT(*) as total_ordenes
  FROM sale_orders 
  WHERE DATE(order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`;

const totals = db.prepare(oldTotalQuery).get();

console.log('\n📈 COMPARACIÓN DE CÁLCULOS:');
console.log(`   • Total Bruto (suma de 'total'): $${totals.total_bruto.toLocaleString()}`);
console.log(`   • Total Descuentos: $${totals.total_descuentos.toLocaleString()}`);
console.log(`   • Total Neto (total - descuento): $${totals.total_neto.toLocaleString()}`);
console.log(`   • Total de Órdenes: ${totals.total_ordenes}`);

const diferencia = totals.total_bruto - totals.total_neto;
console.log(`   • Diferencia (descuentos aplicados): $${diferencia.toLocaleString()}`);

// Verificar por tienda
console.log('\n🏪 INGRESOS NETOS POR TIENDA:');
const byStoreQuery = `
  SELECT 
    s.store_name,
    s.store_id,
    SUM(so.total - so.discount) as total_neto,
    COUNT(*) as ordenes
  FROM sale_orders so
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
  GROUP BY s.store_id, s.store_name
  ORDER BY total_neto DESC
`;

const byStore = db.prepare(byStoreQuery).all();
byStore.forEach(store => {
  console.log(`   • ${store.store_name}: $${store.total_neto.toLocaleString()} (${store.ordenes} órdenes)`);
});

db.close();
