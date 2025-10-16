# Linisco Multi-Store Data Sync + AI Dashboard

Sistema de sincronización masiva de datos desde la API REST de Linisco hacia una base de datos SQLite local para **múltiples puntos de venta** con **inteligencia artificial integrada**.

## 🚀 Características

- **Sincronización masiva** de múltiples tiendas simultáneamente
- **Base de datos SQLite local** para fácil manipulación
- **Gestión de múltiples puntos de venta** con configuración centralizada
- **Sincronización paralela** para optimizar rendimiento
- **Herramientas de análisis** y consultas avanzadas por tienda
- **Exportación a CSV** para reportes
- **CLI interactivo** para operaciones comunes
- **Sincronización programada** con cron jobs
- **🤖 Inteligencia Artificial** para análisis automático
- **💬 Chat con IA** para consultas en lenguaje natural
- **🔮 Predicciones** basadas en datos históricos
- **🎯 Recomendaciones** inteligentes para optimizar ventas
- **📊 Visualizaciones** automáticas con gráficos inteligentes

## 📋 Datos Sincronizados

- **Usuarios**: Información de autenticación y roles
- **Sesiones**: Sesiones de punto de venta con detalles de caja
- **Órdenes de Venta**: Todas las órdenes con métodos de pago
- **Productos Vendidos**: Detalle de productos en cada orden
- **Combos Vendidos**: Combos y promociones aplicadas

## 🛠️ Instalación

1. **Clonar el repositorio**:
```bash
git clone <tu-repositorio>
cd linisco-sync
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Configurar variables de entorno**:
```bash
cp env.example .env
```

Editar `.env` con tus credenciales de **todas las tiendas**:
```env
# Database Configuration
DATABASE_PATH=./data/linisco.db

# Linisco API Configuration
LINISCO_API_URL=https://pos.linisco.com.ar

# Multiple Store Configuration (JSON format)
STORES_CONFIG=[
  {
    "email": "20003@linisco.com.ar",
    "password": "password1",
    "store_name": "Tienda Centro",
    "store_id": "20003"
  },
  {
    "email": "20004@linisco.com.ar", 
    "password": "password2",
    "store_name": "Tienda Norte",
    "store_id": "20004"
  }
  // ... agregar las 7 tiendas
]

# Sync Configuration
SYNC_INTERVAL_MINUTES=60
BATCH_SIZE=100
PARALLEL_STORES=3
```

## 🚀 Uso

### Configuración Inicial

```bash
# Configurar tiendas en la base de datos
npm run setup-stores

# Probar conexiones a las tiendas
npm run test-stores

# Ver configuración actual
npm run config-stores
```

### Dashboard Web con IA

```bash
# Iniciar servidor web con funcionalidades de IA
npm run web
```

Luego visita: `http://localhost:3000`

**Funcionalidades del Dashboard:**
- 📊 **Estadísticas en tiempo real** de todas las tiendas
- 🤖 **Chat con IA** para consultas en lenguaje natural
- 💡 **Insights automáticos** con recomendaciones
- 🔮 **Predicciones** de ventas futuras
- 🎯 **Recomendaciones** para optimizar el negocio
- 📈 **Gráficos inteligentes** de patrones de ventas

**Ejemplos de consultas al chat:**
- "¿Cuáles son mis productos más vendidos?"
- "¿Cómo van mis ventas comparado con el mes pasado?"
- "¿Qué días de la semana vendo más?"
- "Muéstrame el análisis de métodos de pago"

### Sincronización Manual

```bash
# Sincronizar TODAS las tiendas del día anterior
npm start

# Sincronizar rango específico de todas las tiendas
node index.js 2024-01-01 2024-01-31
```

### Sincronización Automática

```bash
# Iniciar sincronización programada de todas las tiendas
npm run sync
```

### Herramienta CLI

```bash
# Ver ayuda
node cli.js help

# Sincronizar TODAS las tiendas
node cli.js sync 2024-01-01 2024-01-31

# Sincronizar tienda específica
node cli.js sync-store 20003 2024-01-01 2024-01-31

# Listar tiendas configuradas
node cli.js stores list

# Resumen por tienda
node cli.js stores summary 2024-01-01 2024-01-31

# Consultar top productos
node cli.js query top-products 2024-01-01 2024-01-31 10

# Análisis completo
node cli.js analyze 2024-01-01 2024-01-31

# Exportar datos
node cli.js export products 2024-01-01 2024-01-31 productos.csv
```

## 📊 Consultas Disponibles

### Top Productos
```bash
node cli.js query top-products [fecha_inicio] [fecha_fin] [limite]
```

### Ventas por Método de Pago
```bash
node cli.js query payment-methods [fecha_inicio] [fecha_fin]
```

### Ventas Diarias
```bash
node cli.js query daily-sales [fecha_inicio] [fecha_fin]
```

### Resumen de Sesiones
```bash
node cli.js query sessions [fecha_inicio] [fecha_fin]
```

## 🔍 Análisis Avanzado

### Análisis Completo
```bash
node cli.js analyze 2024-01-01 2024-01-31
```

### Análisis de Producto Específico
```bash
node cli.js analyze 2024-01-01 2024-01-31 "Sub 15"
```

## 📤 Exportación de Datos

### Exportar Productos
```bash
node cli.js export products 2024-01-01 2024-01-31 productos.csv
```

### Exportar Órdenes
```bash
node cli.js export orders 2024-01-01 2024-01-31 ordenes.csv
```

### Exportar Sesiones
```bash
node cli.js export sessions 2024-01-01 2024-01-31 sesiones.csv
```

## 🗄️ Estructura de Base de Datos

### Tablas Principales

- **users**: Usuarios autenticados
- **sessions**: Sesiones de punto de venta
- **sale_orders**: Órdenes de venta
- **sale_products**: Productos vendidos
- **sale_combos**: Combos vendidos
- **sync_log**: Log de sincronizaciones

### Consultas SQL Personalizadas

Puedes ejecutar consultas SQL directamente usando el QueryTool:

```javascript
import QueryTool from './tools/query.js';

const queryTool = new QueryTool();

// Consulta personalizada
const results = queryTool.executeCustomQuery(`
  SELECT 
    DATE(order_date) as fecha,
    COUNT(*) as ordenes,
    SUM(total) as ingresos
  FROM sale_orders 
  WHERE DATE(order_date) BETWEEN ? AND ?
  GROUP BY DATE(order_date)
  ORDER BY fecha DESC
`, ['2024-01-01', '2024-01-31']);

console.log(results);
```

## 📁 Estructura del Proyecto

```
linisco-sync/
├── config/
│   ├── database.js      # Configuración SQLite
│   └── linisco.js       # Cliente API Linisco
├── services/
│   ├── syncService.js   # Servicio de sincronización
│   ├── aiAnalysisService.js  # 🤖 Análisis inteligente de datos
│   └── aiChatService.js      # 💬 Chat con IA
├── tools/
│   ├── query.js        # Herramientas de consulta
│   └── analyzer.js     # Análisis de datos
├── web/
│   ├── server.js       # Servidor web con APIs de IA
│   └── public/
│       └── index.html  # Dashboard con funcionalidades de IA
├── examples/
│   └── ai-usage-examples.js  # Ejemplos de uso de IA
├── database/
│   └── schema.sql      # Esquema de base de datos
├── data/               # Base de datos SQLite
├── exports/           # Archivos CSV exportados
├── index.js           # Script principal
├── sync.js            # Sincronización programada
├── cli.js             # Herramienta CLI
├── AI_FEATURES.md     # Documentación de funcionalidades de IA
└── package.json
```

## 🔧 Configuración Avanzada

### Variables de Entorno

- `DATABASE_PATH`: Ruta de la base de datos SQLite
- `LINISCO_API_URL`: URL de la API de Linisco
- `LINISCO_EMAIL`: Email de autenticación
- `LINISCO_PASSWORD`: Contraseña de autenticación
- `SYNC_INTERVAL_MINUTES`: Intervalo de sincronización automática
- `BATCH_SIZE`: Tamaño de lote para procesamiento

### Personalización

Puedes extender el sistema agregando nuevos métodos de análisis o consultas personalizadas en los archivos correspondientes.

## 🚨 Solución de Problemas

### Error de Autenticación
- Verifica las credenciales en el archivo `.env`
- Asegúrate de que la API esté disponible

### Error de Base de Datos
- Verifica que el directorio `data/` tenga permisos de escritura
- Revisa que no haya otro proceso usando la base de datos

### Error de Sincronización
- Revisa los logs en la tabla `sync_log`
- Verifica la conectividad con la API

## 📝 Logs

Los logs de sincronización se guardan en la tabla `sync_log` con información detallada sobre cada proceso de sincronización.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 🤖 Funcionalidades de Inteligencia Artificial

### APIs de IA Disponibles

- `GET /api/ai/patterns` - Análisis de patrones de ventas
- `GET /api/ai/predictions` - Predicciones basadas en datos históricos  
- `GET /api/ai/recommendations` - Recomendaciones inteligentes
- `POST /api/ai/chat` - Chat con IA para consultas en lenguaje natural

### Ejemplos de Uso de IA

```javascript
// Análisis de patrones
const patterns = await fetch('/api/ai/patterns?fromDate=2025-01-01&toDate=2025-01-31');

// Predicciones
const predictions = await fetch('/api/ai/predictions?fromDate=2025-01-01&toDate=2025-01-31');

// Chat con IA
const chatResponse = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        query: '¿Cuáles son mis productos más vendidos?',
        fromDate: '2025-01-01',
        toDate: '2025-01-31'
    })
});
```

### Características de IA

- **Análisis Automático**: Identifica patrones, tendencias y oportunidades
- **Chat Inteligente**: Consultas en lenguaje natural sobre los datos
- **Predicciones**: Proyecciones de ventas basadas en datos históricos
- **Recomendaciones**: Sugerencias para optimizar el negocio
- **Visualizaciones**: Gráficos automáticos de patrones de datos

Para más detalles, consulta [AI_FEATURES.md](AI_FEATURES.md)

## 📄 Licencia

MIT License
