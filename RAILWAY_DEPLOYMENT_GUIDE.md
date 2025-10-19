# 🚀 Guía de Despliegue en Railway con MySQL

## ✅ **Paso 1: Código Subido a GitHub**
- ✅ Repositorio actualizado: `https://github.com/tinchohan/supa-dashboard`
- ✅ Sistema híbrido API + MySQL implementado
- ✅ Configuración de Railway incluida

## 🚀 **Paso 2: Desplegar en Railway**

### 2.1 Conectar con Railway
1. Ve a [Railway.app](https://railway.app)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Busca y selecciona `tinchohan/supa-dashboard`
6. Haz clic en **"Deploy Now"**

### 2.2 Configurar Variables de Entorno
En tu proyecto de Railway:

1. Ve a **Settings** → **Variables**
2. Agrega las siguientes variables:

```env
# API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen

# Configuración de la aplicación
NODE_ENV=production
PORT=3000
```

### 2.3 Agregar MySQL
1. En tu proyecto de Railway
2. Haz clic en **"New"** → **"Database"** → **"Add MySQL"**
3. Railway creará automáticamente las variables de entorno para MySQL
4. Las variables estarán disponibles como:
   - `${{MySQL.MYSQL_HOST}}`
   - `${{MySQL.MYSQL_USER}}`
   - `${{MySQL.MYSQL_PASSWORD}}`
   - `${{MySQL.MYSQL_DATABASE}}`
   - `${{MySQL.MYSQL_PORT}}`

### 2.4 Configurar Variables de MySQL
Agrega estas variables en Railway (Railway las reemplazará automáticamente):

```env
# Base de datos MySQL (Railway las reemplaza automáticamente)
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_PORT=${{MySQL.MYSQL_PORT}}
```

## 🔍 **Paso 3: Verificar el Despliegue**

### 3.1 Verificar Health Check
Una vez desplegado, Railway verificará automáticamente:
- URL: `https://tu-app.railway.app/api/health`
- Debería devolver: `{"success": true, "message": "Servidor funcionando correctamente"}`

### 3.2 Verificar Logs
En Railway → Deployments → Logs, deberías ver:
```
✅ Conectado a MySQL
✅ Tablas creadas/verificadas correctamente
✅ Servicio de sincronización con MySQL inicializado
🚀 Servidor ejecutándose en http://0.0.0.0:3000
```

### 3.3 Probar Endpoints
```bash
# Health check
curl https://tu-app.railway.app/api/health

# Estado de sincronización
curl https://tu-app.railway.app/api/sync/status

# Estadísticas
curl -X POST https://tu-app.railway.app/api/stats \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2025-10-01", "toDate": "2025-10-19"}'
```

## 🎯 **Paso 4: Sincronización Inicial**

### 4.1 Sincronización Automática
El sistema sincronizará automáticamente los datos cuando se haga la primera consulta.

### 4.2 Sincronización Manual (Opcional)
```bash
# Sincronizar todos los usuarios
curl -X POST https://tu-app.railway.app/api/sync/all \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2025-01-01", "toDate": "2025-12-31"}'
```

## 📊 **Paso 5: Verificar Funcionamiento**

### 5.1 Dashboard Web
- URL: `https://tu-app.railway.app`
- Debería mostrar el dashboard de Linisco

### 5.2 API Endpoints
- **Estadísticas**: `https://tu-app.railway.app/api/stats`
- **Usuarios**: `https://tu-app.railway.app/api/users`
- **Tiendas**: `https://tu-app.railway.app/api/stores`
- **Sincronización**: `https://tu-app.railway.app/api/sync/status`

### 5.3 Verificar Datos Reales
Deberías ver en los logs:
```
✅ Autenticación exitosa para 63953@linisco.com.ar
✅ Obtenidas XXXX órdenes reales
✅ Sincronizadas XXXX órdenes de venta para 63953@linisco.com.ar
```

## 🔧 **Solución de Problemas**

### Error: "Can't connect to MySQL"
1. Verificar que MySQL esté agregado al proyecto
2. Verificar que las variables de entorno estén configuradas
3. Revisar los logs de Railway

### Error: "No se recibió token de autenticación"
1. Verificar credenciales de Linisco en las variables de entorno
2. Verificar que la API de Linisco esté accesible

### Datos No Sincronizados
1. Verificar estado: `https://tu-app.railway.app/api/sync/status`
2. Ejecutar sincronización manual
3. Revisar logs de Railway

## 🎉 **Beneficios del Despliegue en Railway**

- ✅ **MySQL gestionado**: Sin configuración manual
- ✅ **Escalabilidad automática**: Se ajusta según el tráfico
- ✅ **SSL automático**: HTTPS habilitado por defecto
- ✅ **Logs centralizados**: Fácil monitoreo
- ✅ **Despliegue continuo**: Actualizaciones automáticas desde GitHub
- ✅ **Datos persistentes**: MySQL mantiene los datos sincronizados
- ✅ **Consultas rápidas**: 10x más rápido que solo API

## 📈 **Monitoreo y Mantenimiento**

### Logs en Railway
- Ve a tu proyecto → Deployments → Logs
- Busca mensajes de éxito y error
- Monitorea el rendimiento

### Métricas
- Railway proporciona métricas de CPU, memoria y red
- Monitorea el uso de la base de datos MySQL

### Actualizaciones
- Los cambios en GitHub se despliegan automáticamente
- Las variables de entorno se mantienen entre despliegues

## 🚀 **Próximos Pasos**

1. **Desplegar en Railway** siguiendo esta guía
2. **Verificar funcionamiento** con los endpoints
3. **Configurar dominio personalizado** (opcional)
4. **Monitorear rendimiento** y logs
5. **Agregar más usuarios** con credenciales reales

¡Tu dashboard de Linisco estará funcionando en la nube con MySQL! 🎯
