// Script para inicializar SQLite en Railway
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

console.log('🔧 Inicializando SQLite en Railway...');

// Crear directorio para la base de datos si no existe
const dbDir = '/app/data';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('✅ Directorio /app/data creado');
}

// Ruta de la base de datos SQLite
const dbPath = path.join(dbDir, 'linisco.db');
console.log('📁 Ruta de base de datos:', dbPath);

// Crear conexión a SQLite
const db = new Database(dbPath);

// Configurar pragmas para mejor rendimiento
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 1000');
db.pragma('temp_store = memory');

console.log('✅ Conexión a SQLite establecida');

// Crear tablas
try {
  // Tabla de tiendas
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      store_id TEXT PRIMARY KEY,
      store_name TEXT NOT NULL,
      email TEXT NOT NULL,
      password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Tabla stores creada');

  // Tabla de órdenes de venta
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_orders (
      linisco_id INTEGER PRIMARY KEY,
      shop_number TEXT,
      store_id TEXT NOT NULL,
      id_sale_order INTEGER,
      order_date TIMESTAMP NOT NULL,
      id_session INTEGER,
      payment_method TEXT,
      total DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(store_id)
    )
  `);
  console.log('✅ Tabla sale_orders creada');

  // Tabla de productos vendidos
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_products (
      linisco_id INTEGER PRIMARY KEY,
      shop_number TEXT,
      store_id TEXT NOT NULL,
      id_sale_product INTEGER,
      id_sale_order INTEGER,
      name TEXT NOT NULL,
      fixed_name TEXT,
      quantity INTEGER NOT NULL,
      sale_price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(store_id),
      FOREIGN KEY (id_sale_order) REFERENCES sale_orders(linisco_id)
    )
  `);
  console.log('✅ Tabla sale_products creada');

  // Crear índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sale_orders_date ON sale_orders(order_date);
    CREATE INDEX IF NOT EXISTS idx_sale_orders_store ON sale_orders(store_id);
    CREATE INDEX IF NOT EXISTS idx_sale_products_order ON sale_products(id_sale_order);
    CREATE INDEX IF NOT EXISTS idx_sale_products_store ON sale_products(store_id);
  `);
  console.log('✅ Índices creados');

  // Insertar tiendas desde variables de entorno
  const stores = [
    { id: '63953', name: 'Subway Lacroze', email: '63953@linisco.com.ar', password: '63953hansen' },
    { id: '66220', name: 'Subway Corrientes', email: '66220@linisco.com.ar', password: '66220hansen' },
    { id: '72267', name: 'Subway Ortiz', email: '72267@linisco.com.ar', password: '72267hansen' },
    { id: '30036', name: 'Daniel Lacroze', email: '30036@linisco.com.ar', password: '30036hansen' },
    { id: '30038', name: 'Daniel Corrientes', email: '30038@linisco.com.ar', password: '30038hansen' },
    { id: '10019', name: 'Daniel Ortiz', email: '10019@linisco.com.ar', password: '10019hansen' },
    { id: '10020', name: 'Seitu Juramento', email: '10020@linisco.com.ar', password: '10020hansen' }
  ];

  const insertStore = db.prepare(`
    INSERT OR REPLACE INTO stores (store_id, store_name, email, password)
    VALUES (?, ?, ?, ?)
  `);

  for (const store of stores) {
    insertStore.run(store.id, store.name, store.email, store.password);
    console.log(`✅ Tienda insertada: ${store.name}`);
  }

  console.log('🎉 Inicialización de SQLite completada');
  console.log('📊 Base de datos lista para usar');

} catch (error) {
  console.error('❌ Error inicializando SQLite:', error);
  throw error;
} finally {
  db.close();
}

export default {};
