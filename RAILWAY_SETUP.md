# 🚀 Configuración de Railway con PostgreSQL

Este documento explica cómo configurar y desplegar el sistema de sincronización de Linisco en Railway con PostgreSQL.

## 📋 Requisitos Previos

- Cuenta en [Railway](https://railway.app)
- Repositorio en GitHub
- Node.js 18+ (para desarrollo local)

## 🚀 Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Asegúrate de estar en el branch correcto
git add .
git commit -m "feat: Configurar Railway con PostgreSQL"
git push origin main
```

### 2. Crear Proyecto en Railway

1. Ir a [railway.app](https://railway.app)
2. Click en "New Project"
3. Seleccionar "Deploy from GitHub repo"
4. Conectar tu repositorio de GitHub
5. Seleccionar el branch `main`

### 3. Configurar PostgreSQL

Railway creará automáticamente una base de datos PostgreSQL y configurará las variables de entorno:

- `DATABASE_URL` - URL completa de conexión
- `PGHOST` - Host de PostgreSQL
- `PGDATABASE` - Nombre de la base de datos
- `PGPASSWORD` - Contraseña
- `PGPORT` - Puerto (5432)
- `PGUSER` - Usuario

### 4. Configurar Variables de Entorno

En el dashboard de Railway, agregar estas variables:

```env
NODE_ENV=production
PORT=3000
RAILWAY_ENVIRONMENT=production
```

### 5. Configurar el Script de Inicio

Railway usará automáticamente el archivo `railway.toml` que configuramos para:

- Usar PostgreSQL como base de datos
- Ejecutar `npm run start:railway`
- Configurar health checks

### 6. Desplegar

Railway desplegará automáticamente cuando hagas push al branch. El proceso incluye:

1. **Instalación de dependencias**: `npm install`
2. **Migración de base de datos**: Se ejecuta automáticamente el schema
3. **Inicio del servidor**: Usa el servidor híbrido que detecta PostgreSQL

## 🔧 Configuración del Servidor Híbrido

El servidor `web/server-railway.js` detecta automáticamente:

- **En Railway**: Usa PostgreSQL con la URL de `DATABASE_URL`
- **Localmente**: Usa SQLite para desarrollo

### Características del Servidor Híbrido:

- ✅ **Detección automática** de entorno
- ✅ **PostgreSQL en Railway** con schema correcto
- ✅ **SQLite local** para desarrollo
- ✅ **Misma API REST** en ambos entornos
- ✅ **Categorías de pago** funcionando correctamente
- ✅ **Sincronización** compatible con la API de Linisco

## 📊 Verificación del Despliegue

### 1. Verificar Base de Datos

```bash
# Conectar a PostgreSQL en Railway
psql $DATABASE_URL

# Verificar tablas
\dt

# Verificar datos
SELECT COUNT(*) FROM sale_orders;
SELECT COUNT(*) FROM sale_products;
SELECT COUNT(*) FROM stores;
```

### 2. Probar Endpoints

```bash
# Estadísticas generales
curl -X POST https://tu-app.railway.app/api/stats \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2025-10-01", "toDate": "2025-10-31"}'

# Listar tiendas
curl https://tu-app.railway.app/api/stores

# Sincronización
curl -X POST https://tu-app.railway.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{"storeId": "66220", "password": "subway123", "data": {...}}'
```

### 3. Verificar en el Navegador

1. Ir a `https://tu-app.railway.app`
2. Navegar a "Estadísticas Generales"
3. Seleccionar fechas y verificar que aparecen las 3 categorías:
   - **Efectivo** (cash + cc_pedidosyaft)
   - **Apps** (cc_rappiol + cc_pedidosyaol)
   - **Otros** (resto de métodos)

## 🔄 Migración de Datos

Si tienes datos existentes en SQLite, puedes migrarlos:

```bash
# Localmente, antes de desplegar
npm run start:sqlite
# Sincronizar datos existentes
# Luego desplegar a Railway
```

## 📈 Monitoreo

Railway proporciona:

- **Logs en tiempo real** del servidor
- **Métricas de rendimiento** de la base de datos
- **Health checks** automáticos
- **Backups automáticos** de PostgreSQL

## 🐛 Solución de Problemas

### Error de Conexión a Base de Datos

```bash
# Verificar variables de entorno
railway variables

# Verificar logs
railway logs
```

### Error de Schema

```bash
# Recrear schema manualmente
railway run psql $DATABASE_URL -c "CREATE TABLE IF NOT EXISTS stores (...)"
```

### Error de Sincronización

1. Verificar que las credenciales de tienda sean correctas
2. Verificar que el formato de datos coincida con la API de Linisco
3. Revisar logs del servidor

## 🎯 Ventajas del Despliegue en Railway

- ✅ **PostgreSQL nativo** - Mejor rendimiento que SQLite
- ✅ **Escalabilidad automática** - Se adapta al tráfico
- ✅ **Backups automáticos** - Datos seguros
- ✅ **SSL automático** - Conexiones seguras
- ✅ **Deploy automático** - Con cada push a GitHub
- ✅ **Monitoreo integrado** - Logs y métricas
- ✅ **Variables de entorno** - Configuración segura

## 📞 Soporte

Si tienes problemas:

1. Revisar logs en Railway dashboard
2. Verificar variables de entorno
3. Comprobar conectividad a PostgreSQL
4. Verificar que el schema se creó correctamente

## 🎉 ¡Listo!

Una vez desplegado, tendrás:

- **API REST** funcionando en Railway
- **PostgreSQL** como base de datos
- **Categorías de pago** correctamente separadas
- **Sincronización** compatible con Linisco
- **Dashboard** accesible desde cualquier lugar

¡El sistema está listo para producción! 🚀