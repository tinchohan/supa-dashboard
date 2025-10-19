# 🚀 Despliegue en Railway con MySQL

## 📋 Prerrequisitos

- Cuenta de GitHub
- Cuenta de Railway
- Proyecto subido a GitHub

## 🔧 Configuración en Railway

### 1. Conectar con GitHub

1. Ve a [Railway](https://railway.app)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Conecta tu repositorio

### 2. Configurar Variables de Entorno

En Railway, ve a tu proyecto → Settings → Variables:

```env
# Base de datos MySQL (Railway lo proporciona automáticamente)
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_PORT=${{MySQL.MYSQL_PORT}}

# API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen

# Configuración de la aplicación
NODE_ENV=production
PORT=3000
```

### 3. Agregar MySQL

1. En tu proyecto de Railway
2. Haz clic en "New" → "Database" → "Add MySQL"
3. Railway creará automáticamente las variables de entorno
4. Las variables estarán disponibles como:
   - `${{MySQL.MYSQL_HOST}}`
   - `${{MySQL.MYSQL_USER}}`
   - `${{MySQL.MYSQL_PASSWORD}}`
   - `${{MySQL.MYSQL_DATABASE}}`
   - `${{MySQL.MYSQL_PORT}}`

### 4. Configurar Build Settings

Railway detectará automáticamente que es un proyecto Node.js, pero puedes verificar:

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Root Directory**: `/` (raíz del proyecto)

## 🗄️ Configuración de MySQL

### Crear Base de Datos

Una vez que Railway cree la instancia de MySQL, las tablas se crearán automáticamente cuando el servidor se inicie.

### Verificar Conexión

El servidor mostrará en los logs:
```
✅ Conectado a MySQL
✅ Tablas creadas/verificadas correctamente
✅ Servicio de sincronización con MySQL inicializado
```

## 📊 Endpoints Disponibles

Una vez desplegado, tendrás acceso a:

- **Dashboard**: `https://tu-app.railway.app`
- **API Health**: `https://tu-app.railway.app/api/health`
- **Estadísticas**: `https://tu-app.railway.app/api/stats`
- **Sincronización**: `https://tu-app.railway.app/api/sync/status`

## 🔄 Sincronización Inicial

### Opción 1: Automática
El sistema sincronizará automáticamente los datos cuando se haga la primera consulta.

### Opción 2: Manual
```bash
# Sincronizar todos los usuarios
curl -X POST https://tu-app.railway.app/api/sync/all \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2025-01-01", "toDate": "2025-12-31"}'
```

## 🎯 Beneficios en Railway

- **MySQL gestionado**: Sin configuración manual
- **Escalabilidad automática**: Se ajusta según el tráfico
- **SSL automático**: HTTPS habilitado por defecto
- **Logs centralizados**: Fácil monitoreo
- **Despliegue continuo**: Actualizaciones automáticas desde GitHub

## 🔧 Solución de Problemas

### Error de Conexión a MySQL
1. Verificar que las variables de entorno estén configuradas
2. Verificar que la instancia de MySQL esté ejecutándose
3. Revisar los logs del servidor

### Error de Autenticación
1. Verificar credenciales de Linisco en las variables de entorno
2. Verificar que la API de Linisco esté accesible

### Datos No Sincronizados
1. Verificar estado de sincronización: `/api/sync/status`
2. Ejecutar sincronización manual: `/api/sync/all`

## 📈 Monitoreo

### Logs en Railway
- Ve a tu proyecto → Deployments → Logs
- Busca mensajes como:
  - `✅ Conectado a MySQL`
  - `✅ Sincronizadas X órdenes`
  - `✅ Autenticación exitosa`

### Métricas
- Railway proporciona métricas de CPU, memoria y red
- Monitorea el uso de la base de datos MySQL

## 🚀 Próximos Pasos

1. **Subir código a GitHub**
2. **Conectar con Railway**
3. **Configurar variables de entorno**
4. **Agregar MySQL**
5. **Desplegar y probar**
6. **Configurar dominio personalizado** (opcional)

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Prueba los endpoints de salud
4. Consulta la documentación de Railway
