# 🚂 Guía de Deployment en Railway

## 📋 Requisitos Previos

1. **Cuenta en Railway**: [railway.app](https://railway.app)
2. **Código en GitHub**: Tu proyecto debe estar en un repositorio de GitHub
3. **Variables de entorno**: Tener listas tus API keys

## 🚀 Pasos para Deploy

### Paso 1: Preparar el Repositorio

1. **Subir a GitHub** (si no lo has hecho):
   ```bash
   git add .
   git commit -m "Preparado para Railway deployment"
   git push origin main
   ```

### Paso 2: Crear Proyecto en Railway

1. Ve a [railway.app](https://railway.app) y haz login
2. Haz clic en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Conecta tu cuenta de GitHub
5. Selecciona tu repositorio `Supa`
6. Railway detectará automáticamente que es una aplicación Node.js

### Paso 3: Configurar Base de Datos

1. En tu proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Database"** → **"PostgreSQL"**
3. Railway creará automáticamente una base de datos PostgreSQL
4. La variable `DATABASE_URL` se configurará automáticamente

### Paso 4: Configurar Variables de Entorno

En el dashboard de Railway, ve a **"Variables"** y agrega:

```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=tu_api_key_de_gemini
LINISCO_API_KEY=tu_api_key_de_linisco
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### Paso 5: Configurar el Deploy

1. Railway detectará automáticamente tu `package.json`
2. Usará el script `start:prod` que configuramos
3. El deploy comenzará automáticamente

### Paso 6: Verificar el Deploy

1. Una vez completado el deploy, Railway te dará una URL
2. Visita la URL para verificar que todo funciona
3. La URL será algo como: `https://tu-proyecto.railway.app`

## 🔧 Configuración Adicional

### Dominio Personalizado (Opcional)

1. En Railway, ve a **"Settings"** → **"Domains"**
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones de Railway

### Monitoreo

- Railway proporciona logs en tiempo real
- Métricas de CPU y memoria
- Alertas automáticas

## 🐛 Solución de Problemas

### Error de Base de Datos
```bash
# Si hay problemas con PostgreSQL, verifica:
# 1. Que DATABASE_URL esté configurada
# 2. Que las tablas se crearon correctamente
```

### Error de Variables de Entorno
```bash
# Verifica que todas las variables estén configuradas:
# - GEMINI_API_KEY
# - LINISCO_API_KEY
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
```

### Error de CORS
```bash
# Si hay problemas de CORS, configura:
CORS_ORIGIN=https://tu-dominio.railway.app
```

## 📊 Migración de Datos

Si tienes datos en SQLite que quieres migrar:

1. **Exportar datos de SQLite**:
   ```bash
   # Crear script de migración
   node scripts/migrate-to-postgres.js
   ```

2. **Importar a PostgreSQL**:
   - Los datos se migrarán automáticamente al primer deploy
   - O puedes usar el script de migración manual

## 💰 Costos

- **Plan Gratuito**: $5 de crédito mensual
- **Plan Pro**: $20/mes (recomendado para producción)
- **Base de datos**: Incluida en ambos planes

## 🔄 Actualizaciones Automáticas

Railway se conecta a tu repositorio de GitHub y:
- Deploya automáticamente en cada push a `main`
- Mantiene tu aplicación siempre actualizada
- Rollback automático si hay errores

## 📱 Acceso Móvil

Tu aplicación será accesible desde cualquier dispositivo:
- ✅ Responsive design incluido
- ✅ HTTPS automático
- ✅ CDN global

## 🎉 ¡Listo!

Una vez completados estos pasos, tu aplicación estará:
- ✅ Hosteada en la nube
- ✅ Con base de datos PostgreSQL
- ✅ Con dominio personalizado
- ✅ Con actualizaciones automáticas
- ✅ Con monitoreo incluido

**URL de tu aplicación**: `https://tu-proyecto.railway.app`
