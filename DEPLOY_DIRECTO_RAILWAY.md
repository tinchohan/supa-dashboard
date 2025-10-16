# 🚀 Deploy Directo en Railway (Sin Git)

## 📋 Método Alternativo: Deploy Manual

Si no tienes Git instalado o prefieres un método más directo, puedes hacer el deploy de estas maneras:

### **Método 1: Subir Archivos Directamente**

1. **Comprimir tu proyecto**:
   - Selecciona todos los archivos de tu proyecto (excepto `node_modules` y `data/`)
   - Crea un archivo ZIP con el nombre `supa-project.zip`

2. **Crear proyecto en Railway**:
   - Ve a [railway.app](https://railway.app)
   - Haz clic en "New Project"
   - Selecciona "Deploy from template" → "Empty Project"

3. **Subir archivos**:
   - En Railway, ve a "Settings" → "Source"
   - Haz clic en "Upload" y sube tu archivo ZIP

### **Método 2: Usar GitHub Desktop (Más Fácil)**

1. **Descargar GitHub Desktop**: [desktop.github.com](https://desktop.github.com)
2. **Crear repositorio**:
   - Abre GitHub Desktop
   - "Create a new repository"
   - Nombre: `supa-dashboard`
   - Local path: `C:\Users\tinch\Supa`
   - Haz clic en "Create repository"

3. **Subir a GitHub**:
   - En GitHub Desktop, haz clic en "Publish repository"
   - Esto subirá tu código a GitHub automáticamente

4. **Conectar con Railway**:
   - Ve a [railway.app](https://railway.app)
   - "New Project" → "Deploy from GitHub repo"
   - Selecciona tu repositorio `supa-dashboard`

## 🎯 **Pasos Detallados para Railway**

### **Paso 1: Crear Cuenta en Railway**
1. Ve a [railway.app](https://railway.app)
2. Haz clic en "Start a New Project"
3. Conecta con GitHub (o crea cuenta con email)

### **Paso 2: Crear Proyecto**
1. Haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Si no tienes repositorio, usa el Método 2 arriba
4. Selecciona tu repositorio `supa-dashboard`

### **Paso 3: Configurar Base de Datos**
1. En tu proyecto de Railway, haz clic en "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará automáticamente la base de datos
4. La variable `DATABASE_URL` se configurará automáticamente

### **Paso 4: Configurar Variables de Entorno**
En el dashboard de Railway, ve a "Variables" y agrega:

```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=tu_api_key_de_gemini
LINISCO_API_KEY=tu_api_key_de_linisco
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

### **Paso 5: Deploy Automático**
1. Railway detectará automáticamente tu `package.json`
2. Usará el script `start:prod` que configuramos
3. El deploy comenzará automáticamente
4. Verás el progreso en tiempo real

### **Paso 6: Obtener URL**
1. Una vez completado, Railway te dará una URL
2. Algo como: `https://supa-dashboard-production.railway.app`
3. ¡Tu aplicación estará online!

## 🔧 **Configuración Adicional**

### **Dominio Personalizado**
1. En Railway, ve a "Settings" → "Domains"
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones

### **Monitoreo**
- Railway proporciona logs en tiempo real
- Métricas de CPU y memoria
- Alertas automáticas

## 🎉 **¡Listo!**

Una vez completado, tu aplicación estará:
- ✅ Hosteada en la nube
- ✅ Con base de datos PostgreSQL
- ✅ Con HTTPS automático
- ✅ Con CDN global
- ✅ Con actualizaciones automáticas

**URL de tu aplicación**: `https://tu-proyecto.railway.app`
