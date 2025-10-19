# 🏪 Linisco Dashboard - Sistema Híbrido API + Base de Datos

Dashboard moderno de análisis de ventas con sistema híbrido que combina la API de Linisco con base de datos para máximo rendimiento.

## 🚀 Versiones Disponibles

### 📊 Versión SQLite (Recomendada para Railway)
- ✅ **Sin configuración externa** - No necesita servicios de base de datos
- ✅ **Compatible con Railway** - Funciona en el plan gratuito
- ✅ **Datos persistentes** - Se mantienen entre reinicios
- ✅ **Rápido y simple** - Solo archivo local

### 🗄️ Versión MySQL (Original)
- ✅ **Base de datos robusta** - Para aplicaciones grandes
- ✅ **Alta concurrencia** - Múltiples usuarios simultáneos
- ✅ **Escalable** - Fácil migración a PostgreSQL

## ✨ Características

- **📊 Estadísticas en tiempo real**: Total de órdenes, ingresos, promedio por orden
- **🏪 Desglose por tienda**: Análisis detallado por cada ubicación
- **🏆 Top 5 productos**: Productos más vendidos con ingresos
- **💳 Métodos de pago**: Efectivo, Apps, Otros
- **🗄️ Sistema híbrido**: API + MySQL con fallback inteligente
- **🔄 Sincronización automática**: Datos persistentes y consultas rápidas
- **📈 Gráficos interactivos**: Visualizaciones dinámicas con Chart.js
- **⚡ Consultas 10x más rápidas**: Con base de datos MySQL
- **🌐 Despliegue en Railway**: Con MySQL gestionado automáticamente

## 🚀 Instalación

### Requisitos
- Node.js 18+
- Acceso a API de Linisco

### Instalación local

1. **Clonar el repositorio**
```bash
git clone https://github.com/tinchohan/supa-dashboard.git
cd supa-dashboard
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno** (opcional)
```bash
cp env.example .env
# Editar .env con tus credenciales
```

4. **Ejecutar (Elegir una opción)**

#### Opción A: SQLite (Recomendado para Railway)
```bash
# Desarrollo
npm run dev:sqlite

# Producción
npm run start:sqlite
```

#### Opción B: MySQL (Versión original)
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

5. **Acceder al dashboard**
```
http://localhost:3000
```

## 🌐 Despliegue en Railway

### 🚀 Opción A: SQLite (Recomendado)

1. **Conectar con Railway**
   - Ve a [Railway.app](https://railway.app)
   - Inicia sesión con GitHub
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio

2. **Configurar comando de inicio**
   - Cambiar a: `npm run start:sqlite`
   - Health check: `/api/health`

3. **¡Listo!** Railway despliega automáticamente

### 🗄️ Opción B: MySQL (Para aplicaciones grandes)

1. **Conectar con Railway**
   - Ve a [Railway.app](https://railway.app)
   - Inicia sesión con GitHub
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio

2. **Agregar MySQL**
   - En tu proyecto: "New" → "Database" → "Add MySQL"
   - Railway crea automáticamente las variables de entorno

3. **Configurar Variables**
   ```env
   # API de Linisco
   LINISCO_API_URL=https://pos.linisco.com.ar
   LINISCO_EMAIL=63953@linisco.com.ar
   LINISCO_PASSWORD=63953hansen
   
   # MySQL (Railway las reemplaza automáticamente)
   DB_HOST=${{MySQL.MYSQL_HOST}}
   DB_USER=${{MySQL.MYSQL_USER}}
   DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
   DB_NAME=${{MySQL.MYSQL_DATABASE}}
   DB_PORT=${{MySQL.MYSQL_PORT}}
   
   # Configuración
   NODE_ENV=production
   PORT=3000
   ```

4. **¡Listo!** Railway despliega automáticamente

📖 **Guías completas**: 
- SQLite: [RAILWAY_SQLITE_DEPLOYMENT.md](RAILWAY_SQLITE_DEPLOYMENT.md)
- MySQL: [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)

## 📁 Estructura del proyecto

```
src/
├── config/
│   └── users.js                    # Configuración de usuarios
├── services/
│   ├── apiService.js               # Servicio de API
│   ├── authService.js              # Servicio de autenticación
│   ├── databaseService.js          # Servicio de MySQL
│   ├── sqliteService.js            # Servicio de SQLite
│   ├── syncService.js              # Servicio de sincronización MySQL
│   └── sqliteSyncService.js        # Servicio de sincronización SQLite
├── server.js                       # Servidor principal (MySQL)
└── server-sqlite.js                # Servidor principal (SQLite)

public/
├── index.html                      # Frontend del dashboard
└── login.html                      # Página de login

data/                               # Base de datos SQLite (se crea automáticamente)
└── linisco_dashboard.db            # Archivo de base de datos SQLite
```

## 🔧 API Endpoints

### Datos
- `GET /api/stores` - Obtener lista de tiendas
- `POST /api/stats` - Obtener estadísticas
  ```json
  {
    "fromDate": "2025-01-01",
    "toDate": "2025-12-31",
    "storeId": ["63953", "66220"]
  }
  ```
- `GET /api/top-products` - Top productos
  ```
  /api/top-products?fromDate=2025-01-01&toDate=2025-12-31&limit=5
  ```

### Sincronización
- `POST /api/sync` - Refrescar datos (limpiar cache)
  ```json
  {
    "fromDate": "2025-01-01",
    "toDate": "2025-12-31"
  }
  ```

### IA
- `POST /api/chat` - Chat con IA
- `POST /api/ai/analysis` - Análisis de ventas
- `POST /api/ai/charts` - Datos para gráficos

### Salud
- `GET /api/health` - Health check
- `GET /api/test-linisco` - Test conectividad API

## 🎯 Uso

1. **Acceder al dashboard**: `http://localhost:3000`
2. **Seleccionar fechas**: Usar los controles de fecha
3. **Filtrar por tienda**: Seleccionar tiendas específicas
4. **Cargar datos**: Hacer clic en "Cargar Datos"
5. **Refrescar**: Hacer clic en "Sincronizar" para obtener datos frescos
6. **Chat con IA**: Usar el chat para análisis inteligente

## 🔑 Configuración de tiendas

Editar `src/config/stores.json`:

```json
[
  {
    "email": "63953@linisco.com.ar",
    "password": "63953hansen",
    "store_name": "Subway Lacroze",
    "store_id": "63953"
  }
]
```

## 🤖 Configuración de IA

1. Obtener API key de Google Gemini
2. Configurar en `.env`:
```
GEMINI_API_KEY=your_api_key_here
```

## 📊 Características del Dashboard

### Estadísticas Generales
- Total de órdenes
- Ingresos totales
- Promedio por orden
- Tiendas activas

### Métodos de Pago
- **Efectivo**: cash + cc_pedidosyaft
- **Apps**: cc_rappiol + cc_pedidosyaol
- **Otros**: Resto de métodos

### Top 5 Productos
- Productos más vendidos
- Ingresos por producto
- Cantidad vendida

### Desglose por Tienda
- Ventas por ubicación
- Comparación entre tiendas
- Rendimiento individual

## 🏗️ Arquitectura

### Flujo de datos
1. **Frontend** → Solicita datos al servidor
2. **Servidor** → Consulta API externa de Linisco
3. **API Linisco** → Retorna datos en tiempo real
4. **Servidor** → Procesa y calcula estadísticas
5. **Frontend** → Muestra dashboard actualizado

### Ventajas
- ✅ **Sin base de datos local**: Menos complejidad
- ✅ **Datos en tiempo real**: Siempre actualizados
- ✅ **Arquitectura simple**: Fácil mantenimiento
- ✅ **Escalable**: Sin límites de almacenamiento local
- ✅ **Cache inteligente**: Mejora rendimiento

## 🛠️ Desarrollo

### Scripts disponibles

#### SQLite (Recomendado para Railway)
```bash
npm run dev:sqlite      # Desarrollo con SQLite
npm run start:sqlite    # Producción con SQLite
npm run test:sqlite     # Probar SQLite
```

#### MySQL (Versión original)
```bash
npm run dev             # Desarrollo con MySQL
npm start               # Producción con MySQL
```

### Cache
- Los datos se cachean por 5 minutos
- Usar `/api/sync` para forzar actualización
- Cache automático por fecha y tienda

## 📝 Licencia

MIT License

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📚 Documentación Adicional

- **SQLite**: Ver [README_SQLITE.md](README_SQLITE.md)
- **Despliegue Railway SQLite**: Ver [RAILWAY_SQLITE_DEPLOYMENT.md](RAILWAY_SQLITE_DEPLOYMENT.md)
- **Despliegue Railway MySQL**: Ver [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)
- **Resumen de migración**: Ver [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

## 🎉 ¡Listo para Usar!

Elige tu versión preferida y comienza a usar el dashboard de Linisco:

- **Para Railway**: Usa la versión SQLite (`npm run start:sqlite`)
- **Para aplicaciones grandes**: Usa la versión MySQL (`npm start`)
- **Para desarrollo**: Cualquiera de las dos funciona

---

**¡Disfruta analizando tus ventas con datos en tiempo real! 🚀**