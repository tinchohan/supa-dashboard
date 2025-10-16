import { db } from './config/database.js';

console.log('🔍 Verificando duplicados en la base de datos...\n');

// Verificar duplicados en usuarios
console.log('1. Verificando usuarios duplicados...');
const userQuery = `
  SELECT 
    linisco_id, 
    email, 
    store_id,
    COUNT(*) as count
  FROM users 
  GROUP BY linisco_id, email, store_id
  HAVING COUNT(*) > 1
`;
const userDups = db.prepare(userQuery).all();
console.log(`   ${userDups.length > 0 ? '❌' : '✅'} Usuarios duplicados: ${userDups.length}`);

// Verificar duplicados en sesiones
console.log('2. Verificando sesiones duplicadas...');
const sessionQuery = `
  SELECT 
    linisco_id, 
    shop_number, 
    store_id,
    COUNT(*) as count
  FROM sessions 
  GROUP BY linisco_id, shop_number, store_id
  HAVING COUNT(*) > 1
`;
const sessionDups = db.prepare(sessionQuery).all();
console.log(`   ${sessionDups.length > 0 ? '❌' : '✅'} Sesiones duplicadas: ${sessionDups.length}`);

// Verificar duplicados en órdenes
console.log('3. Verificando órdenes duplicadas...');
const orderQuery = `
  SELECT 
    linisco_id, 
    shop_number, 
    store_id,
    id_sale_order,
    COUNT(*) as count
  FROM sale_orders 
  GROUP BY linisco_id, shop_number, store_id, id_sale_order
  HAVING COUNT(*) > 1
`;
const orderDups = db.prepare(orderQuery).all();
console.log(`   ${orderDups.length > 0 ? '❌' : '✅'} Órdenes duplicadas: ${orderDups.length}`);

// Verificar duplicados en productos
console.log('4. Verificando productos duplicados...');
const productQuery = `
  SELECT 
    linisco_id, 
    shop_number, 
    store_id,
    id_sale_product,
    COUNT(*) as count
  FROM sale_products 
  GROUP BY linisco_id, shop_number, store_id, id_sale_product
  HAVING COUNT(*) > 1
`;
const productDups = db.prepare(productQuery).all();
console.log(`   ${productDups.length > 0 ? '❌' : '✅'} Productos duplicados: ${productDups.length}`);

// Resumen
const totalDuplicates = userDups.length + sessionDups.length + orderDups.length + productDups.length;

console.log('\n📊 RESUMEN:');
console.log(`   • Total de grupos duplicados: ${totalDuplicates}`);

if (totalDuplicates === 0) {
  console.log('✅ ¡PERFECTO! No hay duplicados en la base de datos');
} else {
  console.log('❌ Se encontraron duplicados. Usa "INSERT OR IGNORE" para evitarlos.');
  
  // Mostrar algunos ejemplos de duplicados
  if (userDups.length > 0) {
    console.log('\n🔍 Ejemplos de usuarios duplicados:');
    userDups.slice(0, 3).forEach(dup => {
      console.log(`   • ID: ${dup.linisco_id}, Email: ${dup.email}, Store: ${dup.store_id} (${dup.count} veces)`);
    });
  }
  
  if (orderDups.length > 0) {
    console.log('\n🔍 Ejemplos de órdenes duplicadas:');
    orderDups.slice(0, 3).forEach(dup => {
      console.log(`   • ID: ${dup.linisco_id}, Shop: ${dup.shop_number}, Order: ${dup.id_sale_order} (${dup.count} veces)`);
    });
  }
}

// Verificar conteos totales
console.log('\n📈 CONTEOS TOTALES:');
const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
const totalOrders = db.prepare('SELECT COUNT(*) as count FROM sale_orders').get().count;
const totalProducts = db.prepare('SELECT COUNT(*) as count FROM sale_products').get().count;

console.log(`   • Usuarios: ${totalUsers}`);
console.log(`   • Sesiones: ${totalSessions}`);
console.log(`   • Órdenes: ${totalOrders}`);
console.log(`   • Productos: ${totalProducts}`);

db.close();
