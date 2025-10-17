# Migración a PostgreSQL

Este branch contiene la migración completa de SQLite a PostgreSQL para mejorar la compatibilidad con Railway.

## 🚀 Características

- **PostgreSQL nativo**: Usa PostgreSQL como base de datos principal
- **Compatibilidad con Railway**: Funciona perfectamente en Railway
- **Migración automática**: Script para migrar datos de SQLite a PostgreSQL
- **Detección de columnas**: Detecta automáticamente `payment_method` vs `paymentmethod`
- **Misma funcionalidad**: Mantiene todas las características del sistema SQLite

## 📋 Archivos principales

- `web/server-postgresql.js` - Servidor principal con PostgreSQL
- `services/multiStoreSyncService-postgresql.js` - Servicio de sincronización
- `scripts/migrate-sqlite-to-postgresql.js` - Script de migración
- `postgresql.env.example` - Configuración de ejemplo

## 🔧 Configuración local

### 1. Instalar PostgreSQL

**Windows:**
```bash
# Descargar desde https://www.postgresql.org/download/windows/
# O usar Chocolatey
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Crear base de datos

```bash
# Conectar como usuario postgres
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE linisco_db;
CREATE USER linisco_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE linisco_db TO linisco_user;
\q
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp postgresql.env.example .env

# Editar .env con tus credenciales
DATABASE_URL=postgresql://linisco_user:password@localhost:5432/linisco_db
```

### 4. Migrar datos de SQLite

```bash
# Migrar datos existentes
npm run migrate-to-postgresql
```

### 5. Iniciar servidor PostgreSQL

```bash
# Iniciar servidor con PostgreSQL
npm run start:postgresql
```

## 🚀 Despliegue en Railway

### 1. Configurar variables de entorno en Railway

```bash
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
GEMINI_API_KEY=your_api_key
```

### 2. Actualizar railway.toml

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:postgresql"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "on_failure"

[env]
NODE_ENV = "production"
```

### 3. Desplegar

```bash
git add .
git commit -m "feat: Migración a PostgreSQL"
git push origin feature/postgresql-migration
```

## 🔄 Migración de datos

El script de migración (`scripts/migrate-sqlite-to-postgresql.js`) migra automáticamente:

- ✅ **Tiendas** - Todas las tiendas con sus credenciales
- ✅ **Órdenes** - Todas las órdenes de venta
- ✅ **Productos** - Todos los productos vendidos
- ✅ **Índices** - Índices para optimizar consultas
- ✅ **Verificación** - Valida que la migración fue exitosa

## 🎯 Ventajas de PostgreSQL

1. **Compatibilidad con Railway**: Funciona nativamente en Railway
2. **Mejor rendimiento**: Para consultas complejas y grandes volúmenes
3. **Escalabilidad**: Mejor para aplicaciones en producción
4. **Características avanzadas**: JSON, arrays, funciones avanzadas
5. **Concurrencia**: Mejor manejo de múltiples usuarios

## 🔍 Diferencias con SQLite

| Característica | SQLite | PostgreSQL |
|----------------|--------|------------|
| **Tipo** | Archivo local | Servidor de base de datos |
| **Concurrencia** | Limitada | Excelente |
| **Escalabilidad** | Limitada | Alta |
| **Railway** | Requiere configuración especial | Nativo |
| **Consultas complejas** | Básicas | Avanzadas |

## 🛠️ Comandos útiles

```bash
# Iniciar servidor PostgreSQL local
npm run start:postgresql

# Migrar datos de SQLite
npm run migrate-to-postgresql

# Iniciar servidor SQLite (fallback)
npm run start:sqlite

# Verificar estado de la base de datos
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sale_orders;"
```

## 🐛 Solución de problemas

### Error de conexión a PostgreSQL

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar conexión
psql $DATABASE_URL -c "SELECT version();"
```

### Error de migración

```bash
# Verificar que SQLite tenga datos
sqlite3 data/linisco.db "SELECT COUNT(*) FROM sale_orders;"

# Verificar permisos de PostgreSQL
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE linisco_db TO linisco_user;"
```

## 📊 Monitoreo

El servidor PostgreSQL incluye logs detallados:

- 🔍 Detección de columnas de payment method
- 📊 Estadísticas de consultas
- 🔄 Estado de sincronización
- ❌ Errores y debugging

## 🎉 Próximos pasos

1. **Probar localmente** con PostgreSQL
2. **Migrar datos** existentes
3. **Desplegar a Railway** con PostgreSQL
4. **Monitorear rendimiento** en producción
5. **Optimizar consultas** según sea necesario
