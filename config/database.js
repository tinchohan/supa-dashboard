import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_PATH = process.env.DATABASE_PATH || './data/linisco.db';

// Crear directorio de datos si no existe
const dataDir = path.dirname(DATABASE_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Crear conexión a la base de datos
export const db = new Database(DATABASE_PATH);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

export default db;
