# 🚂 Configuración Automática de Railway

## 🎯 **Deploy Automático en Railway**

Este proyecto está configurado para deployarse automáticamente en Railway con PostgreSQL.

### **Archivos de Configuración Incluidos:**

- ✅ `railway.toml` - Configuración automática de Railway
- ✅ `railway.json` - Configuración de build y deploy
- ✅ `scripts/setup-railway.js` - Script de configuración automática
- ✅ `config/database-postgres.js` - Adaptador PostgreSQL
- ✅ `scripts/migrate-to-postgres.js` - Migración de datos

### **Variables de Entorno Configuradas Automáticamente:**

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://... (configurado automáticamente por Railway)
```

### **Variables Opcionales (solo si las usas):**

```env
GEMINI_API_KEY=tu_api_key_de_gemini
STORES_CONFIG=[{"email":"...","password":"...","store_name":"...","store_id":"..."}]
```

## 🚀 **Deploy en Railway:**

### **Opción 1: Deploy Automático (Recomendado)**

1. **Ve a [railway.app](https://railway.app)**
2. **"New Project"** → **"Deploy from GitHub repo"**
3. **Selecciona `tinchohan/supa-dashboard`**
4. **Railway detectará automáticamente:**
   - ✅ `railway.toml` (configuración de servicios)
   - ✅ `package.json` (dependencias Node.js)
   - ✅ PostgreSQL (base de datos)
   - ✅ Variables de entorno

### **Opción 2: Deploy Manual con Railway CLI**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y conectar proyecto
railway login
railway link

# Agregar PostgreSQL
railway add postgresql

# Configurar variables
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Deploy
railway deploy
```

## 🔧 **Configuración Post-Deploy:**

### **1. Verificar Servicios:**
- ✅ Servicio Node.js (tu aplicación)
- ✅ Servicio PostgreSQL (base de datos)

### **2. Verificar Variables:**
En tu servicio Node.js, deberías tener:
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=postgresql://...` (referencia automática)

### **3. Verificar Logs:**
Deberías ver en los logs:
```
✅ Base de datos PostgreSQL inicializada correctamente
🌐 Servidor web ejecutándose en http://localhost:3000
📊 Dashboard disponible en http://localhost:3000
```

## 🎉 **¡Listo!**

Tu aplicación estará disponible en:
- **URL**: `https://tu-proyecto.railway.app`
- **Login**: Usuario `H4`, Contraseña `SRL`
- **Dashboard**: Análisis de ventas con IA

## 🔄 **Migración de Datos (Opcional):**

Si tienes datos en SQLite que quieres migrar:

1. **Abre Railway Shell** en tu servicio Node.js
2. **Ejecuta migración**:
   ```bash
   node scripts/migrate-to-postgres.js
   ```

## 🆘 **Solución de Problemas:**

### **Error: "connect ECONNREFUSED"**
- Verifica que PostgreSQL esté creado
- Verifica que `DATABASE_URL` esté configurada
- Redeploy el servicio

### **Error: "Unexpected reserved word"**
- Ya corregido en el código
- Redeploy para aplicar cambios

### **Dashboard vacío**
- Normal con base de datos vacía
- Usa el botón "Sincronizar" para cargar datos
