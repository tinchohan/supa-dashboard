// Script para probar la funcionalidad local
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Probando funcionalidad local...');

// 1. Verificar que la base de datos SQLite existe
const dbPath = './data/linisco.db';
if (fs.existsSync(dbPath)) {
  console.log('✅ Base de datos SQLite encontrada');
} else {
  console.log('❌ Base de datos SQLite no encontrada');
  console.log('🔧 Ejecutando inicialización...');
  try {
    execSync('node sync.js', { stdio: 'inherit' });
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
  }
}

// 2. Verificar archivos necesarios
const requiredFiles = [
  'web/server-local.js',
  'web/public/index.html',
  'web/public/login.html',
  'config/database.js',
  'services/multiStoreSyncService.js',
  'services/aiGeminiService.js'
];

console.log('🔍 Verificando archivos necesarios...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - FALTANTE`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('✅ Todos los archivos necesarios están presentes');
} else {
  console.log('❌ Faltan archivos necesarios');
}

// 3. Mostrar instrucciones
console.log(`
🎯 Para probar localmente:

1. 🔧 Iniciar servidor local:
   npm run start:local

2. 🌐 Abrir navegador:
   http://localhost:3000

3. 🔐 Login con cualquier tienda:
   - Email: 63953@linisco.com.ar
   - Password: 63953hansen

4. 📊 Probar funcionalidades:
   - Sincronización
   - Gráficos
   - Chat con IA
   - Estadísticas

5. 🚀 Para Railway (después de probar local):
   - Usar: npm run start:sqlite
   - Credenciales únicas: admin / linisco2025
`);

export default {};
