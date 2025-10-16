// Configuración para usar SQLite en Railway con volumen persistente
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Crear directorio para la base de datos si no existe
const dbDir = '/app/data';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ruta de la base de datos SQLite
const dbPath = path.join(dbDir, 'database.sqlite');

// Crear conexión a SQLite
const db = new Database(dbPath);

// Configurar pragmas para mejor rendimiento
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = 1000');
db.pragma('temp_store = memory');

console.log('🗄️ SQLite configurado en Railway:', dbPath);

export default db;
