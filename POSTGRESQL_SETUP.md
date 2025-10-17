# 🐘 Configuración de PostgreSQL

Este documento explica cómo configurar y usar PostgreSQL con el sistema de sincronización de Linisco.

## 📋 Requisitos

- PostgreSQL 12+ instalado localmente
- Node.js 18+
- npm o yarn

## 🚀 Configuración Local

### 1. Instalar PostgreSQL

#### Windows (con Chocolatey)
```bash
choco install postgresql -y
```

#### Windows (Instalador oficial)
1. Descargar desde [postgresql.org](https://www.postgresql.org/download/windows/)
2. Instalar con configuración por defecto
3. Recordar la contraseña del usuario `postgres`

#### macOS (con Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Configurar Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE linisco_db;

# Crear usuario (opcional)
CREATE USER linisco_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE linisco_db TO linisco_user;

# Salir
\q
```

### 3. Configurar Variables de Entorno

Copia el archivo de configuración:
```bash
cp postgresql.env .env
```

Edita `.env` con tus credenciales:
```env
PGUSER=postgres
PGHOST=localhost
PGDATABASE=linisco_db
PGPASSWORD=tu_password
PGPORT=5432
```

### 4. Instalar Dependencias

```bash
npm install
```

### 5. Migrar Datos de SQLite

```bash
# Migrar datos existentes de SQLite a PostgreSQL
npm run migrate-to-postgresql-real
```

### 6. Iniciar Servidor

```bash
# Servidor PostgreSQL real
npm run start:postgresql-real

# O servidor PostgreSQL simulado (usa SQLite)
npm run start:postgresql-sqlite
```

## 🌐 Configuración en Railway

### 1. Crear Proyecto en Railway

1. Ir a [railway.app](https://railway.app)
2. Crear nuevo proyecto
3. Conectar repositorio de GitHub

### 2. Agregar PostgreSQL

1. En el dashboard de Railway
2. Click en "New" → "Database" → "PostgreSQL"
3. Railway creará automáticamente las variables de entorno

### 3. Configurar Variables de Entorno

Railway debería crear automáticamente:
- `DATABASE_URL`
- `PGHOST`
- `PGDATABASE`
- `PGPASSWORD`
- `PGPORT`
- `PGUSER`

### 4. Desplegar

```bash
# Hacer commit y push
git add .
git commit -m "feat: Add PostgreSQL support"
git push origin main

# Railway desplegará automáticamente
```

## 📊 Schema de Base de Datos

El schema incluye las siguientes tablas:

### `users`
- Autenticación de usuarios
- Tokens de API

### `stores`
- Información de tiendas
- Credenciales de sincronización

### `sale_orders`
- Órdenes de venta
- Métodos de pago categorizados

### `sale_products`
- Productos vendidos
- Detalles de cada venta

### `psessions`
- Sesiones de trabajo
- Resúmenes de caja

## 🔧 Scripts Disponibles

```bash
# Servidores
npm run start:postgresql-real      # PostgreSQL real
npm run start:postgresql-sqlite    # PostgreSQL simulado

# Migración
npm run migrate-to-postgresql-real # Migrar a PostgreSQL real

# Desarrollo
npm run start:sqlite               # SQLite original
```

## 🐛 Solución de Problemas

### Error de Conexión
```bash
# Verificar que PostgreSQL esté corriendo
pg_ctl status

# En Windows
net start postgresql-x64-14
```

### Error de Permisos
```bash
# Verificar usuario y permisos
psql -U postgres -d linisco_db -c "\du"
```

### Error de Schema
```bash
# Recrear schema
psql -U postgres -d linisco_db -f schemas/postgresql-schema.sql
```

## 📈 Ventajas de PostgreSQL

- ✅ **Escalabilidad**: Mejor rendimiento con grandes volúmenes
- ✅ **Concurrencia**: Múltiples usuarios simultáneos
- ✅ **Integridad**: Mejor control de transacciones
- ✅ **Índices**: Optimización automática de consultas
- ✅ **Railway**: Despliegue nativo en Railway
- ✅ **Backup**: Respaldos automáticos en la nube

## 🔄 Migración desde SQLite

La migración es automática y preserva todos los datos:

1. **Datos**: Órdenes, productos, tiendas
2. **Relaciones**: Foreign keys y constraints
3. **Índices**: Optimización de consultas
4. **Compatibilidad**: Misma API REST

## 📞 Soporte

Si tienes problemas:

1. Verificar logs del servidor
2. Revisar configuración de variables de entorno
3. Comprobar conexión a PostgreSQL
4. Ejecutar migración nuevamente

¡PostgreSQL está listo para usar! 🎉
