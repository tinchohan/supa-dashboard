import Database from 'better-sqlite3';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de SQLite (local)
const sqliteDb = new Database('./data/linisco.db');

// Configuración de PostgreSQL (Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrateData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migración de datos...');
    
    // 1. Migrar stores
    console.log('📦 Migrando tiendas...');
    const stores = sqliteDb.prepare('SELECT * FROM stores').all();
    
    for (const store of stores) {
      await client.query(`
        INSERT INTO stores (store_id, store_name, email, created_at) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (store_id) DO UPDATE SET
          store_name = EXCLUDED.store_name,
          email = EXCLUDED.email
      `, [store.store_id, store.store_name, store.email, store.created_at]);
    }
    console.log(`✅ ${stores.length} tiendas migradas`);
    
    // 2. Migrar sale_orders
    console.log('📦 Migrando órdenes de venta...');
    const orders = sqliteDb.prepare('SELECT * FROM sale_orders').all();
    
    for (const order of orders) {
      await client.query(`
        INSERT INTO sale_orders (id, id_sale_order, store_id, order_date, total, discount, payment_method, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id_sale_order) DO UPDATE SET
          total = EXCLUDED.total,
          discount = EXCLUDED.discount,
          payment_method = EXCLUDED.payment_method
      `, [
        order.id, 
        order.id_sale_order, 
        order.store_id, 
        order.order_date, 
        order.total, 
        order.discount || 0, 
        order.payment_method, 
        order.created_at
      ]);
    }
    console.log(`✅ ${orders.length} órdenes migradas`);
    
    // 3. Migrar sale_products
    console.log('📦 Migrando productos de venta...');
    const products = sqliteDb.prepare('SELECT * FROM sale_products').all();
    
    for (const product of products) {
      await client.query(`
        INSERT INTO sale_products (id, id_sale_order, store_id, name, fixed_name, quantity, sale_price, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          fixed_name = EXCLUDED.fixed_name,
          quantity = EXCLUDED.quantity,
          sale_price = EXCLUDED.sale_price
      `, [
        product.id,
        product.id_sale_order,
        product.store_id,
        product.name,
        product.fixed_name,
        product.quantity,
        product.sale_price,
        product.created_at
      ]);
    }
    console.log(`✅ ${products.length} productos migrados`);
    
    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    sqliteDb.close();
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateData()
    .then(() => {
      console.log('✅ Migración completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

export default migrateData;
