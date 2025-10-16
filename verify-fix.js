import { db } from './config/database.js';

console.log('🔍 Verificando la corrección del dashboard...\n');

// Consulta corregida (sin LEFT JOIN problemático)
const correctedQuery = `
  SELECT 
    COUNT(DISTINCT so.id) as total_orders,
    COUNT(DISTINCT s.store_id) as total_stores,
    SUM(so.total - so.discount) as total_revenue,
    AVG(so.total - so.discount) as avg_order_value,
    COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
  FROM sale_orders so
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`;

const result = db.prepare(correctedQuery).get();

console.log('✅ RESULTADO CORREGIDO:');
console.log(`   • Total de órdenes: ${result.total_orders}`);
console.log(`   • Total de tiendas: ${result.total_stores}`);
console.log(`   • Ingresos Netos: $${result.total_revenue.toLocaleString()}`);
console.log(`   • Promedio por orden: $${result.avg_order_value.toFixed(2)}`);
console.log(`   • Días con ventas: ${result.days_with_sales}`);

// Verificar que coincide con nuestro cálculo anterior
console.log('\n🔍 COMPARACIÓN:');
console.log(`   • Cálculo anterior: $63,627,798.51`);
console.log(`   • Cálculo corregido: $${result.total_revenue.toLocaleString()}`);
console.log(`   • Diferencia: $${(result.total_revenue - 63627798.51).toFixed(2)}`);

if (Math.abs(result.total_revenue - 63627798.51) < 1) {
  console.log('✅ ¡CORRECCIÓN EXITOSA! Los valores coinciden.');
} else {
  console.log('❌ Aún hay diferencias. Revisar la consulta.');
}

// Verificar productos por separado
const productsQuery = `
  SELECT COUNT(*) as total_products
  FROM sale_products sp
  WHERE DATE(sp.synced_at) BETWEEN '2025-10-01' AND '2025-10-13'
`;

const products = db.prepare(productsQuery).get();
console.log(`\n📊 Total de productos vendidos: ${products.total_products}`);

db.close();
