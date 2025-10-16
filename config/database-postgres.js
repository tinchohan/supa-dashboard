import pkg from 'pg';
const { Pool } = pkg;

// Configuración de PostgreSQL para Railway
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
  
  console.log('🔧 Query original:', query);
  console.log('🔧 Query convertida:', convertedQuery);
  console.log('🔧 Parámetros:', params);
  
  return { query: convertedQuery, params };
}

// Función para ejecutar queries (compatible con better-sqlite3)
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

// Función para inicializar la base de datos
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Crear tablas si no existen
    await client.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        store_id TEXT UNIQUE NOT NULL,
        store_name TEXT NOT NULL,
        email TEXT NOT NULL,
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

    console.log('✅ Base de datos PostgreSQL inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default db;
