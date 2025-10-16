// Script para configurar Railway con SQLite
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Configurando Railway con SQLite...');

// 1. Crear railway.toml para SQLite
const railwayToml = `[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start:sqlite"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
USE_SQLITE = "true"
`;

fs.writeFileSync('railway.toml', railwayToml);
console.log('✅ railway.toml creado para SQLite');

// 2. Crear script de inicio para Railway
const startScript = `#!/bin/bash
echo "🚀 Iniciando aplicación con SQLite..."

# Crear directorio para base de datos si no existe
mkdir -p /app/data

# Iniciar aplicación
npm run start:sqlite
`;

fs.writeFileSync('start-sqlite.sh', startScript);
fs.chmodSync('start-sqlite.sh', '755');
console.log('✅ Script de inicio creado');

// 3. Crear Dockerfile opcional para SQLite
const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio para SQLite
RUN mkdir -p /app/data

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start:sqlite"]
`;

fs.writeFileSync('Dockerfile.sqlite', dockerfile);
console.log('✅ Dockerfile para SQLite creado');

console.log(`
🎉 Configuración SQLite completada!

📋 Próximos pasos:
1. Subir cambios a GitHub: git push origin main
2. En Railway:
   - Crear nuevo proyecto
   - Conectar con GitHub
   - NO agregar servicio de base de datos
   - Usar comando: npm run start:sqlite
   - Agregar variables de entorno:
     - NODE_ENV=production
     - USE_SQLITE=true
     - LINISCO_API_URL=https://pos.linisco.com.ar
     - STORES_JSON=[...tus tiendas...]

🔧 Ventajas de SQLite:
- Sin configuración de base de datos
- Sin problemas de tipos
- Más simple y rápido
- Datos persisten en el contenedor
`);

export default {};
