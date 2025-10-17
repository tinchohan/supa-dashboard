import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const SQLITE_DB_PATH = path.join(__dirname, '../data/linisco.db');
const POSTGRES_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/linisco_db';

console.log('🔄 Iniciando migración de SQLite a PostgreSQL...');
console.log('📁 SQLite DB:', SQLITE_DB_PATH);
console.log('🐘 PostgreSQL URL:', POSTGRES_URL);

// Conectar a SQLite
const sqliteDb = new Database(SQLITE_DB_PATH);

// Conectar a PostgreSQL
const pgPool = new Pool({
  connectionString: POSTGRES_URL,
  ssl: process.env.RAILWAY_ENVIRONMENT === 'production' ? { rejectUnauthorized: false } : false
});

async function migrateData() {
  const client = await pgPool.connect();
  
  try {
    console.log('🔧 Inicializando esquema PostgreSQL...');
    
    // Crear tablas si no existen
    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        store_id TEXT PRIMARY KEY,
        store_name TEXT NOT NULL,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        id SERIAL PRIMARY KEY,
        linisco_id INTEGER UNIQUE,
        shop_number TEXT,
        store_id TEXT REFERENCES stores(store_id),
        id_sale_order INTEGER,
        id_customer INTEGER,
        number INTEGER,
        order_date TIMESTAMP,
        id_session INTEGER,
        payment_method TEXT,
        total DECIMAL(10,2),
        discount DECIMAL(10,2),
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_products (
        id SERIAL PRIMARY KEY,
        linisco_id INTEGER,
        store_id TEXT REFERENCES stores(store_id),
        id_sale_order INTEGER,
        name TEXT,
        fixed_name TEXT,
        quantity INTEGER,
        sale_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Esquema PostgreSQL creado');
    
    // Migrar tiendas
    console.log('🏪 Migrando tiendas...');
    const stores = sqliteDb.prepare('SELECT * FROM stores').all();
    
    for (const store of stores) {
      await client.query(`
        INSERT INTO stores (store_id, store_name, password) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (store_id) DO UPDATE SET 
          store_name = EXCLUDED.store_name,
          password = EXCLUDED.password,
          updated_at = CURRENT_TIMESTAMP
      `, [store.store_id, store.store_name, store.password || 'default123']);
    }
    console.log(`✅ ${stores.length} tiendas migradas`);
    
    // Migrar órdenes
    console.log('📦 Migrando órdenes...');
    const orders = sqliteDb.prepare('SELECT * FROM sale_orders').all();
    
    for (const order of orders) {
      await client.query(`
        INSERT INTO sale_orders (
          linisco_id, shop_number, store_id, id_sale_order, id_customer, 
          number, order_date, id_session, payment_method, total, discount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (linisco_id) DO UPDATE SET
          shop_number = EXCLUDED.shop_number,
          store_id = EXCLUDED.store_id,
          id_sale_order = EXCLUDED.id_sale_order,
          id_customer = EXCLUDED.id_customer,
          number = EXCLUDED.number,
          order_date = EXCLUDED.order_date,
          id_session = EXCLUDED.id_session,
          payment_method = EXCLUDED.payment_method,
          total = EXCLUDED.total,
          discount = EXCLUDED.discount,
          synced_at = CURRENT_TIMESTAMP
      `, [
        order.linisco_id,
        order.shop_number,
        order.store_id,
        order.id_sale_order,
        order.id_customer,
        order.number,
        order.order_date,
        order.id_session,
        order.payment_method,
        order.total,
        order.discount
      ]);
    }
    console.log(`✅ ${orders.length} órdenes migradas`);
    
    // Migrar productos
    console.log('🛍️ Migrando productos...');
    const products = sqliteDb.prepare('SELECT * FROM sale_products').all();
    
    for (const product of products) {
      await client.query(`
        INSERT INTO sale_products (
          linisco_id, store_id, id_sale_order, name, fixed_name, quantity, sale_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          linisco_id = EXCLUDED.linisco_id,
          store_id = EXCLUDED.store_id,
          id_sale_order = EXCLUDED.id_sale_order,
          name = EXCLUDED.name,
          fixed_name = EXCLUDED.fixed_name,
          quantity = EXCLUDED.quantity,
          sale_price = EXCLUDED.sale_price
      `, [
        product.linisco_id,
        product.store_id,
        product.id_sale_order,
        product.name,
        product.fixed_name,
        product.quantity,
        product.sale_price
      ]);
    }
    console.log(`✅ ${products.length} productos migrados`);
    
    // Crear índices
    console.log('🔍 Creando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id);
      CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_sale_orders_payment_method ON sale_orders(payment_method);
      CREATE INDEX IF NOT EXISTS idx_sale_products_store_id ON sale_products(store_id);
      CREATE INDEX IF NOT EXISTS idx_sale_products_id_sale_order ON sale_products(id_sale_order);
    `);
    console.log('✅ Índices creados');
    
    // Verificar migración
    console.log('🔍 Verificando migración...');
    const storeCount = await client.query('SELECT COUNT(*) FROM stores');
    const orderCount = await client.query('SELECT COUNT(*) FROM sale_orders');
    const productCount = await client.query('SELECT COUNT(*) FROM sale_products');
    
    console.log('📊 Resumen de migración:');
    console.log(`  - Tiendas: ${storeCount.rows[0].count}`);
    console.log(`  - Órdenes: ${orderCount.rows[0].count}`);
    console.log(`  - Productos: ${productCount.rows[0].count}`);
    
    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    client.release();
    sqliteDb.close();
    await pgPool.end();
  }
}

// Ejecutar migración
migrateData();
