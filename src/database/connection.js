import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config();

let db = null;

export async function connectDatabase() {
  if (db) return db;
  
  try {
    db = new Client({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/linisco_dashboard',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
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
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.end();
    db = null;
    console.log('🔌 Conexión a PostgreSQL cerrada');
  }
}
