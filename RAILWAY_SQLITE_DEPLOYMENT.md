# Guía de Despliegue en Railway con SQLite

Esta guía te ayudará a desplegar el dashboard de Linisco en Railway usando SQLite como base de datos local.

## Ventajas de SQLite en Railway

- ✅ **Sin costos adicionales** - No necesitas servicios de base de datos
- ✅ **Configuración simple** - Solo conectar y desplegar
- ✅ **Datos persistentes** - Se mantienen entre reinicios
- ✅ **Rápido** - Acceso directo a archivos

## Pasos para Desplegar

### 1. Preparar el Repositorio

Asegúrate de que tu repositorio tenga:
- ✅ `package.json` con las dependencias de SQLite
- ✅ `src/server-sqlite.js` (servidor con SQLite)
- ✅ `src/services/sqliteService.js` (servicio de base de datos)
- ✅ `src/services/sqliteSyncService.js` (servicio de sincronización)
- ✅ `railway-sqlite.toml` (configuración de Railway)

### 2. Conectar a Railway

1. **Ir a Railway.app**
   - Crear cuenta o iniciar sesión
   - Hacer clic en "New Project"

2. **Conectar Repositorio**
   - Seleccionar "Deploy from GitHub repo"
   - Elegir tu repositorio
   - Railway detectará automáticamente el proyecto

### 3. Configurar Variables de Entorno

En Railway, ir a la pestaña "Variables" y agregar:

```bash
# Opcional - URL de la API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar

# Opcional - Credenciales por defecto
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen

# Entorno
NODE_ENV=production
```

### 4. Configurar Comando de Inicio

1. **Ir a la pestaña "Settings"**
2. **En "Deploy" cambiar:**
   - **Start Command**: `npm run start:sqlite`
   - **Health Check Path**: `/api/health`

### 5. Desplegar

1. **Hacer clic en "Deploy"**
2. **Esperar a que termine el despliegue**
3. **Railway te dará una URL pública**

### 6. Verificar el Despliegue

1. **Ir a la URL proporcionada**
2. **Probar el endpoint de salud**: `https://tu-app.railway.app/api/health`
3. **Verificar que responde correctamente**

## Estructura de Archivos en Railway

```
/
├── src/
│   ├── server-sqlite.js          # Servidor principal con SQLite
│   ├── services/
│   │   ├── sqliteService.js      # Servicio de base de datos SQLite
│   │   ├── sqliteSyncService.js  # Servicio de sincronización
│   │   └── apiService.js         # Servicio de API
│   └── config/
│       └── users.js              # Configuración de usuarios
├── data/                         # Directorio de base de datos (se crea automáticamente)
│   └── linisco_dashboard.db      # Base de datos SQLite
├── package.json                  # Dependencias y scripts
├── railway-sqlite.toml          # Configuración de Railway
└── README_SQLITE.md             # Documentación
```

## Comandos Disponibles

```bash
# Desarrollo local con SQLite
npm run dev:sqlite

# Producción con SQLite
npm run start:sqlite

# Probar SQLite localmente
npm run test:sqlite

# Desarrollo con MySQL (versión original)
npm run dev

# Producción con MySQL (versión original)
npm start
```

## Monitoreo y Logs

### Ver Logs en Railway

1. **Ir a tu proyecto en Railway**
2. **Hacer clic en "Deployments"**
3. **Seleccionar el deployment más reciente**
4. **Ver logs en tiempo real**

### Endpoints de Monitoreo

- `GET /api/health` - Estado del servidor
- `GET /api/sync/status` - Estado de sincronización
- `GET /api/test-api` - Test de conectividad con API

## Solución de Problemas

### Error: "Cannot find module 'sqlite3'"

**Solución:**
1. Verificar que `sqlite3` está en `package.json`
2. Hacer redeploy del proyecto
3. Verificar que Railway está usando Node.js 18+

### Error: "Database is locked"

**Solución:**
1. Verificar que no hay múltiples instancias ejecutándose
2. Reiniciar el servicio en Railway
3. Verificar permisos de escritura

### Error: "API not accessible"

**Solución:**
1. Verificar que `LINISCO_API_URL` está configurada
2. Verificar conectividad de red
3. Revisar logs para errores específicos

### Datos no se sincronizan

**Solución:**
1. Verificar credenciales de API
2. Revisar logs de sincronización
3. Probar endpoint `/api/sync/status`

## Backup de Datos

### Descargar Base de Datos

1. **Conectar por SSH a Railway** (si está disponible)
2. **Descargar archivo**: `data/linisco_dashboard.db`
3. **Guardar localmente para backup**

### Restaurar Base de Datos

1. **Subir archivo `.db` al proyecto**
2. **Reiniciar el servicio**
3. **Verificar que los datos se cargan correctamente**

## Escalabilidad

### Limitaciones de SQLite

- **Concurrencia limitada** - Máximo ~1000 conexiones simultáneas
- **Tamaño de archivo** - Máximo ~281 TB (prácticamente ilimitado)
- **Solo lectura simultánea** - Una escritura a la vez

### Cuándo Migrar a PostgreSQL

- Más de 1000 usuarios concurrentes
- Necesidad de replicación
- Requerimientos de alta disponibilidad

## Costos

### Plan Gratuito de Railway

- ✅ **$5 de crédito mensual**
- ✅ **512 MB RAM**
- ✅ **1 GB de almacenamiento**
- ✅ **Dominio personalizado**
- ✅ **SSL automático**

### Plan Pro ($20/mes)

- ✅ **Más recursos**
- ✅ **Soporte prioritario**
- ✅ **Métricas avanzadas**

## Conclusión

SQLite es perfecto para:
- ✅ Aplicaciones pequeñas a medianas
- ✅ Prototipos y MVPs
- ✅ Aplicaciones con pocos usuarios concurrentes
- ✅ Despliegues simples sin configuración de base de datos

Para aplicaciones más grandes, considera migrar a PostgreSQL o MySQL.
