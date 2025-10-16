// Script para crear proyecto Railway con SQLite (sin servicio de DB)
import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Creando proyecto Railway con SQLite...');

// 1. Verificar que Railway CLI esté instalado
try {
  execSync('railway --version', { stdio: 'pipe' });
  console.log('✅ Railway CLI instalado');
} catch (error) {
  console.log('❌ Railway CLI no instalado. Instalando...');
  execSync('npm install -g @railway/cli', { stdio: 'inherit' });
}

// 2. Crear archivo de configuración específico para SQLite
const railwayConfig = `[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:sqlite"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

# Solo servicio web (sin base de datos)
[[services]]
name = "web"
source = "."

# Variables de entorno para SQLite
[services.web.environment]
NODE_ENV = "production"
PORT = "3000"
USE_SQLITE = "true"
`;

fs.writeFileSync('railway.toml', railwayConfig);
console.log('✅ railway.toml configurado para SQLite');

// 3. Crear script de inicio optimizado
const startScript = `#!/bin/bash
echo "🚀 Iniciando aplicación SQLite en Railway..."

# Crear directorio para SQLite si no existe
mkdir -p /app/data

# Verificar que el directorio existe
if [ -d "/app/data" ]; then
    echo "✅ Directorio /app/data creado"
else
    echo "❌ Error creando directorio /app/data"
    exit 1
fi

# Iniciar aplicación
echo "🔧 Iniciando servidor SQLite..."
npm run start:sqlite
`;

fs.writeFileSync('start-sqlite.sh', startScript);
fs.chmodSync('start-sqlite.sh', '755');
console.log('✅ Script de inicio creado');

// 4. Crear archivo .railwayignore
const railwayIgnore = `# Archivos a ignorar en Railway
node_modules/
.git/
.env
*.log
*.tmp
*.temp
.DS_Store
Thumbs.db
`;

fs.writeFileSync('.railwayignore', railwayIgnore);
console.log('✅ .railwayignore creado');

console.log(`
🎉 Configuración completada!

📋 Próximos pasos manuales:

1. 🔐 Login en Railway:
   railway login

2. 🆕 Crear nuevo proyecto:
   railway new

3. 🔗 Conectar con GitHub:
   - Seleccionar tu repositorio
   - NO agregar servicio de base de datos

4. ⚙️ Configurar variables de entorno en Railway:
   NODE_ENV=production
   USE_SQLITE=true
   PORT=3000
   LINISCO_API_URL=https://pos.linisco.com.ar
   STORES_JSON=[{"store_id":"63953","store_name":"Subway Lacroze","email":"63953@linisco.com.ar","password":"tu_password"}]

5. 🚀 Deploy:
   railway up

6. 📊 Ver logs:
   railway logs

🔧 Ventajas de esta configuración:
- Sin servicio de base de datos
- SQLite se crea automáticamente
- Sin problemas de tipos de datos
- Más simple y rápido
- Menos costos
`);

export default {};
