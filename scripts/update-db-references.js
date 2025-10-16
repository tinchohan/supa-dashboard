import fs from 'fs';
import path from 'path';

const serverPath = 'web/server.js';

// Leer el archivo
let content = fs.readFileSync(serverPath, 'utf8');

// Reemplazos necesarios
const replacements = [
  // Reemplazar db.prepare por dbToUse.prepare
  { from: /db\.prepare/g, to: 'dbToUse.prepare' },
  // Agregar await a las llamadas async
  { from: /dbToUse\.prepare\(([^)]+)\)\.all\(/g, to: 'await dbToUse.prepare($1).all(' },
  { from: /dbToUse\.prepare\(([^)]+)\)\.get\(/g, to: 'await dbToUse.prepare($1).get(' },
  { from: /dbToUse\.prepare\(([^)]+)\)\.run\(/g, to: 'await dbToUse.prepare($1).run(' }
];

// Aplicar reemplazos
replacements.forEach(({ from, to }) => {
  content = content.replace(from, to);
});

// Escribir el archivo actualizado
fs.writeFileSync(serverPath, content);

console.log('✅ Referencias de base de datos actualizadas para PostgreSQL');
