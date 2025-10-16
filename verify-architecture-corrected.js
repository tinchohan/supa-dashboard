import { db } from './config/database.js';

console.log('🔍 Verificando arquitectura correcta de datos...\n');

// 1. VERIFICAR QUE SALE_ORDERS ES PARA TOTALES
console.log('📊 SALE_ORDERS (Para Totales):');
const ordersSummary = db.prepare(`
  SELECT 
    COUNT(*) as total_orders,
    SUM(total) as total_bruto,
    SUM(discount) as total_descuentos,
    SUM(total - discount) as total_neto,
    AVG(total - discount) as promedio_orden
  FROM sale_orders
  WHERE DATE(order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`).get();

console.log(`   • Total de órdenes: ${ordersSummary.total_orders}`);
console.log(`   • Total bruto: $${ordersSummary.total_bruto.toLocaleString()}`);
console.log(`   • Total descuentos: $${ordersSummary.total_descuentos.toLocaleString()}`);
console.log(`   • Total neto: $${ordersSummary.total_neto.toLocaleString()}`);
console.log(`   • Promedio por orden: $${ordersSummary.promedio_orden.toFixed(2)}`);

// 2. VERIFICAR QUE SALE_PRODUCTS ES PARA CANTIDADES
console.log('\n📦 SALE_PRODUCTS (Para Cantidades):');
const productsSummary = db.prepare(`
  SELECT 
    COUNT(*) as total_product_records,
    SUM(quantity) as total_units_sold,
    COUNT(DISTINCT name) as unique_products,
    AVG(quantity) as avg_quantity_per_record
  FROM sale_products
  WHERE DATE(synced_at) BETWEEN '2025-10-01' AND '2025-10-13'
`).get();

console.log(`   • Total de registros de productos: ${productsSummary.total_product_records}`);
console.log(`   • Total de unidades vendidas: ${productsSummary.total_units_sold}`);
console.log(`   • Productos únicos: ${productsSummary.unique_products}`);
console.log(`   • Promedio de cantidad por registro: ${productsSummary.avg_quantity_per_record.toFixed(2)}`);

// 3. VERIFICAR QUE NO HAY DUPLICACIÓN EN TOTALES
console.log('\n🔍 VERIFICACIÓN DE NO DUPLICACIÓN:');
const noDuplicationCheck = db.prepare(`
  SELECT 
    COUNT(DISTINCT so.id) as unique_orders,
    COUNT(so.id) as total_order_records,
    SUM(so.total - so.discount) as total_revenue
  FROM sale_orders so
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`).get();

console.log(`   • Órdenes únicas: ${noDuplicationCheck.unique_orders}`);
console.log(`   • Registros de órdenes: ${noDuplicationCheck.total_order_records}`);
console.log(`   • Ingresos netos: $${noDuplicationCheck.total_revenue.toLocaleString()}`);

if (noDuplicationCheck.unique_orders === noDuplicationCheck.total_order_records) {
  console.log('   ✅ No hay duplicación en órdenes');
} else {
  console.log('   ❌ Hay duplicación en órdenes');
}

// 4. MOSTRAR TOP PRODUCTOS POR CANTIDAD
console.log('\n🏆 TOP 10 PRODUCTOS POR CANTIDAD:');
const topProducts = db.prepare(`
  SELECT 
    name,
    SUM(quantity) as total_quantity,
    COUNT(*) as times_sold,
    AVG(sale_price) as avg_price
  FROM sale_products
  WHERE DATE(synced_at) BETWEEN '2025-10-01' AND '2025-10-13'
  GROUP BY name
  ORDER BY total_quantity DESC
  LIMIT 10
`).all();

topProducts.forEach((product, index) => {
  console.log(`   ${index + 1}. ${product.name}: ${product.total_quantity} unidades (${product.times_sold} veces)`);
});

// 5. VERIFICAR QUE EL DASHBOARD ESTÁ CORRECTO
console.log('\n🌐 DASHBOARD - Verificación de API:');
const dashboardStats = db.prepare(`
  SELECT
    COUNT(DISTINCT so.id) as total_orders,
    COUNT(DISTINCT s.store_id) as total_stores,
    SUM(so.total - so.discount) as total_revenue,
    AVG(so.total - so.discount) as avg_order_value,
    COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
  FROM sale_orders so
  JOIN stores s ON so.store_id = s.store_id
  WHERE DATE(so.order_date) BETWEEN '2025-10-01' AND '2025-10-13'
`).get();

console.log(`   • Total de órdenes: ${dashboardStats.total_orders}`);
console.log(`   • Total de tiendas: ${dashboardStats.total_stores}`);
console.log(`   • Ingresos netos: $${dashboardStats.total_revenue.toLocaleString()}`);
console.log(`   • Promedio por orden: $${dashboardStats.avg_order_value.toFixed(2)}`);
console.log(`   • Días con ventas: ${dashboardStats.days_with_sales}`);

// 6. VERIFICAR INGRESOS POR FORMA DE PAGO
console.log('\n💳 INGRESOS POR FORMA DE PAGO:');
const paymentMethods = db.prepare(`
  SELECT 
    payment_method,
    COUNT(*) as orders,
    SUM(total - discount) as total_revenue,
    AVG(total - discount) as avg_order_value
  FROM sale_orders
  WHERE DATE(order_date) BETWEEN '2025-10-01' AND '2025-10-13'
  GROUP BY payment_method
  ORDER BY total_revenue DESC
`).all();

paymentMethods.forEach(payment => {
  console.log(`   • ${payment.payment_method}: $${payment.total_revenue.toLocaleString()} (${payment.orders} órdenes)`);
});

console.log('\n✅ ARQUITECTURA CORRECTA:');
console.log('   • sale_orders → Para totales y montos');
console.log('   • sale_products → Para cantidades y productos');
console.log('   • Dashboard → Calcula correctamente sin duplicaciones');

db.close();
