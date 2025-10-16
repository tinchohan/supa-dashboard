# 🚀 Configuración SQLite en Railway

## 📋 Pasos para Configurar SQLite en Railway

### **1. Crear Nuevo Proyecto en Railway**

1. **Ir a Railway Dashboard**: https://railway.app/dashboard
2. **Crear Nuevo Proyecto**: "New Project"
3. **Conectar GitHub**: Seleccionar tu repositorio
4. **NO agregar servicio de base de datos** (SQLite no lo necesita)

### **2. Configurar Variables de Entorno**

En Railway, agregar estas variables:

```bash
NODE_ENV=production
USE_SQLITE=true
PORT=3000
LINISCO_API_URL=https://pos.linisco.com.ar
STORES_JSON=[{"store_id":"63953","store_name":"Subway Lacroze","email":"63953@linisco.com.ar","password":"tu_password"}]
```

### **3. Configurar Comando de Inicio**

En Railway, cambiar el comando de inicio a:
```bash
npm run start:sqlite
```

### **4. Configurar Volumen Persistente (Opcional)**

Para que los datos persistan entre deployments:

1. **Agregar servicio "Volume"** en Railway
2. **Montar en**: `/app/data`
3. **SQLite se guardará** en el volumen persistente

## 🔧 Ventajas de SQLite vs PostgreSQL

| Aspecto | SQLite | PostgreSQL |
|---------|--------|------------|
| **Configuración** | ✅ Simple | ❌ Compleja |
| **Tipos de datos** | ✅ Flexible | ❌ Estricto |
| **Casting** | ✅ No necesario | ❌ Requerido |
| **Esquema** | ✅ Automático | ❌ Manual |
| **Costos** | ✅ Gratis | 💰 Pago |
| **Mantenimiento** | ✅ Mínimo | ❌ Alto |

## 🚀 Comandos de Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login en Railway
railway login

# Conectar proyecto
railway link

# Deploy
railway up

# Ver logs
railway logs

# Ver variables de entorno
railway variables
```

## 📊 Estructura del Proyecto

```
├── web/
│   ├── server-clean.js      # Versión PostgreSQL
│   └── server-sqlite.js     # Versión SQLite ✅
├── services/
│   ├── multiStoreSyncService-clean.js    # PostgreSQL
│   └── multiStoreSyncService-sqlite.js   # SQLite ✅
├── railway.toml             # Configuración SQLite ✅
└── package.json
    └── "start:sqlite"       # Script SQLite ✅
```

## 🎯 Resultado Esperado

Con SQLite deberías ver:
```
🌐 Servidor SQLite ejecutándose en http://localhost:3000
📊 Dashboard disponible en http://localhost:3000
✅ Server ready (SQLite version)
🔄 Sincronización completada: X registros
```

**Sin errores de tipos de datos** 🎉

## 🔧 Troubleshooting

### **Error: "Cannot find module"**
```bash
# Verificar que el comando sea correcto
npm run start:sqlite
```

### **Error: "Database locked"**
```bash
# SQLite es thread-safe, pero si hay problemas:
# Reiniciar el servicio en Railway
```

### **Datos no persisten**
```bash
# Agregar volumen persistente en Railway
# Montar en /app/data
```

## ✅ Checklist de Configuración

- [ ] Proyecto Railway creado
- [ ] GitHub conectado
- [ ] Variables de entorno configuradas
- [ ] Comando de inicio: `npm run start:sqlite`
- [ ] Sin servicio de base de datos agregado
- [ ] Volumen persistente (opcional)
- [ ] Deploy exitoso
- [ ] Sincronización funcionando

¡SQLite es la solución perfecta para evitar la complejidad de PostgreSQL! 🚀
