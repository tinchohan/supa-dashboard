import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Función para convertir queries de SQLite a PostgreSQL
function convertQuery(query, params) {
  let convertedQuery = query;
  let paramIndex = 1;
  
  // Reemplazar ? con $1, $2, $3, etc.
  convertedQuery = convertedQuery.replace(/\?/g, () => `$${paramIndex++}`);
  
  return { query: convertedQuery, params };
}

// Wrapper compatible con better-sqlite3
export const db = {
  prepare: (query) => {
    return {
      all: async (...params) => {
        const client = await pool.connect();
        try {
          const { query: convertedQuery, params: convertedParams } = convertQuery(query, params);
          const result = await client.query(convertedQuery, convertedParams);
          return result.rows;
        } finally {
          client.release();
        }
      },
      get: async (...params) => {
        const client = await pool.connect();
        try {
          const { query: convertedQuery, params: convertedParams } = convertQuery(query, params);
          const result = await client.query(convertedQuery, convertedParams);
          return result.rows[0] || null;
        } finally {
          client.release();
        }
      },
      run: async (...params) => {
        const client = await pool.connect();
        try {
          const { query: convertedQuery, params: convertedParams } = convertQuery(query, params);
          const result = await client.query(convertedQuery, convertedParams);
          return { changes: result.rowCount || 0 };
        } finally {
          client.release();
        }
      }
    };
  }
};

// Inicializar base de datos
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Inicializando PostgreSQL...');
    
    // Crear tablas
    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        store_id TEXT UNIQUE NOT NULL,
        store_name TEXT NOT NULL,
        email TEXT,
        password TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        order_date TIMESTAMP NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        payment_method TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(store_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_products (
        id SERIAL PRIMARY KEY,
        id_sale_order TEXT NOT NULL,
        store_id TEXT NOT NULL,
        name TEXT NOT NULL,
        fixed_name TEXT,
        quantity INTEGER NOT NULL,
        sale_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_sale_order) REFERENCES sale_orders(id),
        FOREIGN KEY (store_id) REFERENCES stores(store_id),
        UNIQUE(id_sale_order, store_id, name)
      );
    `);

    // Verificar tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stores', 'sale_orders', 'sale_products')
    `);
    
    console.log('✅ Tablas creadas:', result.rows.map(row => row.table_name));
    console.log('✅ PostgreSQL inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default db;
