import { Pool } from 'pg';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de PostgreSQL
const pgPool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'linisco_db',
  password: process.env.PGPASSWORD || 'password',
  port: process.env.PGPORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Configuración de SQLite
const sqliteDb = new Database(path.join(__dirname, '../data/linisco.db'));

async function migrateToPostgreSQL() {
  const client = await pgPool.connect();
  
  try {
    console.log('🚀 Iniciando migración de SQLite a PostgreSQL...');
    
    // 1. Crear schema en PostgreSQL
    console.log('📋 Creando schema en PostgreSQL...');
    const schemaPath = path.join(__dirname, '../schemas/postgresql-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('✅ Schema creado correctamente');
    
    // 2. Migrar datos de stores
    console.log('🏪 Migrando tiendas...');
    const stores = sqliteDb.prepare('SELECT * FROM stores').all();
    
    for (const store of stores) {
      await client.query(`
        INSERT INTO stores (store_id, store_name, email, password, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (store_id) DO UPDATE SET
          store_name = EXCLUDED.store_name,
          email = EXCLUDED.email,
          password = EXCLUDED.password,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
      `, [
        store.store_id,
        store.store_name,
        store.email || `${store.store_id}@linisco.com.ar`,
        store.password,
        store.is_active || true,
        store.created_at || new Date(),
        store.updated_at || new Date()
      ]);
    }
    console.log(`✅ ${stores.length} tiendas migradas`);
    
    // 3. Migrar datos de sale_orders
    console.log('📦 Migrando órdenes de venta...');
    const orders = sqliteDb.prepare('SELECT * FROM sale_orders').all();
    
    for (const order of orders) {
      await client.query(`
        INSERT INTO sale_orders (
          linisco_id, shop_number, store_id, id_sale_order, id_customer, 
          number, order_date, id_session, paymentmethod, total, discount, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (linisco_id, store_id) DO UPDATE SET
          shop_number = EXCLUDED.shop_number,
          id_sale_order = EXCLUDED.id_sale_order,
          id_customer = EXCLUDED.id_customer,
          number = EXCLUDED.number,
          order_date = EXCLUDED.order_date,
          id_session = EXCLUDED.id_session,
          paymentmethod = EXCLUDED.paymentmethod,
          total = EXCLUDED.total,
          discount = EXCLUDED.discount,
          synced_at = EXCLUDED.synced_at
      `, [
        order.linisco_id,
        order.shop_number,
        order.store_id,
        order.id_sale_order,
        order.id_customer || 0,
        order.number || 0,
        order.order_date,
        order.id_session,
        order.payment_method || order.paymentmethod, // Manejar ambos nombres
        order.total,
        order.discount || 0.0,
        order.synced_at || new Date()
      ]);
    }
    console.log(`✅ ${orders.length} órdenes migradas`);
    
    // 4. Migrar datos de sale_products
    console.log('🛍️ Migrando productos vendidos...');
    const products = sqliteDb.prepare('SELECT * FROM sale_products').all();
    
    for (const product of products) {
      await client.query(`
        INSERT INTO sale_products (
          linisco_id, shop_number, store_id, id_sale_product, id_sale_order, 
          id_product, id_control_sheet_def, name, fixed_name, quantity, sale_price, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (linisco_id, store_id) DO UPDATE SET
          shop_number = EXCLUDED.shop_number,
          id_sale_product = EXCLUDED.id_sale_product,
          id_sale_order = EXCLUDED.id_sale_order,
          id_product = EXCLUDED.id_product,
          id_control_sheet_def = EXCLUDED.id_control_sheet_def,
          name = EXCLUDED.name,
          fixed_name = EXCLUDED.fixed_name,
          quantity = EXCLUDED.quantity,
          sale_price = EXCLUDED.sale_price,
          synced_at = EXCLUDED.synced_at
      `, [
        product.linisco_id,
        product.shop_number,
        product.store_id,
        product.id_sale_product,
        product.id_sale_order,
        product.id_product,
        product.id_control_sheet_def,
        product.name,
        product.fixed_name,
        product.quantity,
        product.sale_price,
        product.synced_at || new Date()
      ]);
    }
    console.log(`✅ ${products.length} productos migrados`);
    
    // 5. Verificar migración
    console.log('🔍 Verificando migración...');
    const statsResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM stores) as stores_count,
        (SELECT COUNT(*) FROM sale_orders) as orders_count,
        (SELECT COUNT(*) FROM sale_products) as products_count
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Estadísticas de migración:');
    console.log(`  - Tiendas: ${stats.stores_count}`);
    console.log(`  - Órdenes: ${stats.orders_count}`);
    console.log(`  - Productos: ${stats.products_count}`);
    
    console.log('🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
    sqliteDb.close();
    await pgPool.end();
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToPostgreSQL()
    .then(() => {
      console.log('✅ Migración finalizada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}

export default migrateToPostgreSQL;
