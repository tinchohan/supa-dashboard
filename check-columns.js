import { db } from './config/database.js';

console.log('🔍 Verificando columnas en sale_orders...\n');

const result = db.prepare('PRAGMA table_info(sale_orders)').all();
console.log('Columnas disponibles en sale_orders:');
result.forEach(col => {
  console.log(`- ${col.name} (${col.type})`);
});

console.log('\n🔍 Verificando datos de ejemplo...');
const sample = db.prepare('SELECT * FROM sale_orders LIMIT 3').all();
if (sample.length > 0) {
  console.log('\nDatos de ejemplo:');
  console.log(JSON.stringify(sample[0], null, 2));
}

db.close();
