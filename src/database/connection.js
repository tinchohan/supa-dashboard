import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config();

let db = null;

export async function connectDatabase() {
  if (db) return db;
  
  try {
    // Configuración para Railway
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/linisco_dashboard';
    
    // Si estamos en Railway, usar configuración específica
    if (process.env.RAILWAY_ENVIRONMENT === 'production') {
      db = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        query_timeout: 20000
      });
    } else {
      // Configuración local
      db = new Client({
        connectionString: connectionString,
        ssl: false
      });
    }
    
    await db.connect();
    console.log('✅ Conectado a PostgreSQL');
    return db;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error);
    throw error;
  }
}

export async function getDatabase() {
  if (!db) {
    await connectDatabase();
  }
  
  // Verificar si la conexión está activa
  try {
    await db.query('SELECT 1');
  } catch (error) {
    console.log('🔄 Reconectando a PostgreSQL...');
    db = null;
    await connectDatabase();
  }
  
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.end();
    db = null;
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}
