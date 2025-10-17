# 🏪 Linisco Dashboard

Dashboard moderno de análisis de ventas con PostgreSQL y IA para el sistema Linisco.

## ✨ Características

- **📊 Estadísticas en tiempo real**: Total de órdenes, ingresos, promedio por orden
- **🏪 Desglose por tienda**: Análisis detallado por cada ubicación
- **🏆 Top 5 productos**: Productos más vendidos con ingresos
- **💳 Métodos de pago**: Efectivo, Apps, Otros
- **🤖 Chat con IA**: Análisis inteligente con Google Gemini
- **📈 Gráficos interactivos**: Visualizaciones dinámicas con Chart.js
- **🔄 Sincronización automática**: Con API de Linisco
- **🗄️ PostgreSQL**: Base de datos robusta y escalable

## 🚀 Instalación

### Requisitos
- Node.js 18+
- PostgreSQL 12+
- Cuenta de Google Gemini API

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

3. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con tus credenciales
```

4. **Configurar PostgreSQL**
```bash
# Crear base de datos
createdb linisco_dashboard

# Configurar DATABASE_URL en .env
DATABASE_URL=postgresql://username:password@localhost:5432/linisco_dashboard
```

5. **Inicializar base de datos**
```bash
# Iniciar servidor
npm start

# En otra terminal, inicializar DB
curl -X POST http://localhost:3000/api/init-db
```

6. **Sincronizar datos**
```bash
# Sincronizar con Linisco
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2025-01-01", "toDate": "2025-12-31"}'
```

## 🌐 Despliegue en Railway

### 1. Conectar con Railway
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Conectar proyecto
railway link
```

### 2. Configurar PostgreSQL
```bash
# Agregar PostgreSQL
railway add postgresql

# Obtener DATABASE_URL
railway variables
```

### 3. Configurar variables de entorno
```bash
# Configurar variables
railway variables set GEMINI_API_KEY=your_api_key
railway variables set NODE_ENV=production
```

### 4. Desplegar
```bash
# Desplegar
railway up
```

## 📁 Estructura del proyecto

```
src/
├── config/
│   └── stores.json          # Configuración de tiendas
├── database/
│   ├── connection.js        # Conexión a PostgreSQL
│   └── schema.sql          # Esquema de base de datos
├── services/
│   ├── liniscoSync.js      # Sincronización con Linisco
│   └── aiService.js        # Servicio de IA
└── server.js               # Servidor principal

public/
└── index.html              # Frontend del dashboard
```

## 🔧 API Endpoints

### Inicialización
- `POST /api/init-db` - Inicializar base de datos

### Sincronización
- `POST /api/sync` - Sincronizar datos con Linisco
  ```json
  {
    "fromDate": "2025-01-01",
    "toDate": "2025-12-31"
  }
  ```

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

### IA
- `POST /api/chat` - Chat con IA
- `POST /api/ai/analysis` - Análisis de ventas
- `POST /api/ai/charts` - Datos para gráficos

### Salud
- `GET /api/health` - Health check

## 🎯 Uso

1. **Acceder al dashboard**: `http://localhost:3000`
2. **Seleccionar fechas**: Usar los controles de fecha
3. **Filtrar por tienda**: Seleccionar tiendas específicas
4. **Cargar datos**: Hacer clic en "Cargar Datos"
5. **Sincronizar**: Hacer clic en "Sincronizar" para obtener datos frescos
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

## 🛠️ Desarrollo

### Scripts disponibles
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con watch
```

### Estructura de base de datos
- `stores`: Información de tiendas
- `sale_orders`: Órdenes de venta
- `sale_products`: Productos vendidos
- `psessions`: Sesiones de trabajo

## 📝 Licencia

MIT License

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

---

**¡Disfruta analizando tus ventas con IA! 🚀**