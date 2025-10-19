# Linisco Dashboard - Versión SQLite

Esta es la versión del dashboard de Linisco que usa SQLite como base de datos local, ideal para despliegues en Railway sin necesidad de servicios de base de datos externos.

## Características

- ✅ **SQLite como base de datos local** - No requiere servicios externos
- ✅ **Compatible con Railway** - Funciona sin configuración adicional
- ✅ **Sincronización automática** - Datos se almacenan localmente
- ✅ **Fallback a API** - Si la API no está disponible, usa datos de muestra
- ✅ **Múltiples usuarios** - Soporte para 7 tiendas configuradas

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd Supa
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno** (opcional)
   ```bash
   cp env.example .env
   ```

## Uso

### Desarrollo Local

```bash
# Usar SQLite (recomendado para Railway)
npm run dev:sqlite

# O usar MySQL (versión original)
npm run dev
```

### Producción

```bash
# Usar SQLite (recomendado para Railway)
npm run start:sqlite

# O usar MySQL (versión original)
npm start
```

## Estructura de Base de Datos SQLite

La base de datos SQLite se crea automáticamente en `data/linisco_dashboard.db` con las siguientes tablas:

- **sale_orders** - Órdenes de venta
- **sale_products** - Productos vendidos
- **sessions** - Sesiones de trabajo
- **users** - Usuarios configurados

## Despliegue en Railway

1. **Conectar repositorio a Railway**
   - Conectar tu repositorio de GitHub a Railway
   - Railway detectará automáticamente el proyecto Node.js

2. **Configurar variables de entorno** (opcional)
   - `LINISCO_API_URL` - URL de la API de Linisco
   - `LINISCO_EMAIL` - Email por defecto
   - `LINISCO_PASSWORD` - Password por defecto

3. **Configurar comando de inicio**
   - En Railway, cambiar el comando de inicio a: `npm run start:sqlite`

4. **Desplegar**
   - Railway desplegará automáticamente la aplicación
   - La base de datos SQLite se creará automáticamente

## API Endpoints

### Información General
- `GET /api/health` - Estado del servidor
- `GET /api/stores` - Lista de tiendas
- `GET /api/users` - Lista de usuarios

### Estadísticas
- `POST /api/stats` - Estadísticas de un usuario
- `POST /api/stats/consolidated` - Estadísticas consolidadas

### Datos
- `POST /api/sale-orders` - Órdenes de venta
- `POST /api/sale-products` - Productos vendidos
- `POST /api/sessions` - Sesiones de trabajo

### Sincronización
- `POST /api/sync/user` - Sincronizar usuario específico
- `POST /api/sync/all` - Sincronizar todos los usuarios
- `GET /api/sync/status` - Estado de sincronización
- `POST /api/sync/cleanup` - Limpiar datos antiguos

## Ventajas de SQLite

1. **Sin configuración externa** - No necesita servicios de base de datos
2. **Portable** - La base de datos es un archivo local
3. **Rápido** - Acceso directo a archivos
4. **Compatible con Railway** - Funciona en el plan gratuito
5. **Fácil backup** - Solo copiar el archivo .db

## Migración desde MySQL

Si tienes datos en MySQL y quieres migrar a SQLite:

1. **Exportar datos de MySQL**
   ```sql
   -- Exportar órdenes
   SELECT * FROM sale_orders INTO OUTFILE 'sale_orders.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
   
   -- Exportar productos
   SELECT * FROM sale_products INTO OUTFILE 'sale_products.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
   
   -- Exportar sesiones
   SELECT * FROM sessions INTO OUTFILE 'sessions.csv' FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
   ```

2. **Importar a SQLite**
   ```bash
   # Usar herramientas como sqlite3 para importar CSV
   sqlite3 data/linisco_dashboard.db
   .mode csv
   .import sale_orders.csv sale_orders
   .import sale_products.csv sale_products
   .import sessions.csv sessions
   ```

## Solución de Problemas

### Error de conexión a SQLite
- Verificar que el directorio `data/` existe
- Verificar permisos de escritura en el directorio

### Datos no se sincronizan
- Verificar que la API de Linisco esté accesible
- Revisar logs del servidor para errores

### Base de datos corrupta
- Eliminar el archivo `data/linisco_dashboard.db`
- Reiniciar el servidor para recrear la base de datos

## Licencia

MIT License - Ver archivo LICENSE para más detalles.
