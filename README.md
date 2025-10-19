# 🏪 Linisco Dashboard - Sistema Híbrido API + MySQL

Dashboard moderno de análisis de ventas con sistema híbrido que combina la API de Linisco con base de datos MySQL para máximo rendimiento.

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
- Cuenta de Google Gemini API
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

3. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con tus credenciales
```

4. **Configurar variables de entorno**
```bash
# .env
GEMINI_API_KEY=your_gemini_api_key
LINISCO_API_URL=https://api.linisco.com.ar
NODE_ENV=development
```

5. **Iniciar servidor**
```bash
npm start
```

6. **Acceder al dashboard**
```
http://localhost:3000
```

## 🌐 Despliegue en Railway con MySQL

### 🚀 Despliegue Rápido

1. **Conectar con Railway**
   - Ve a [Railway.app](https://railway.app)
   - Inicia sesión con GitHub
   - Selecciona "Deploy from GitHub repo"
   - Conecta `tinchohan/supa-dashboard`

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

📖 **Guía completa**: Ver [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)

## 📁 Estructura del proyecto

```
src/
├── config/
│   └── stores.json              # Configuración de tiendas
├── services/
│   ├── externalApiService.js    # Servicio de API externa
│   └── aiService.js            # Servicio de IA
└── server.js                   # Servidor principal

public/
└── index.html                  # Frontend del dashboard
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
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con watch
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

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

---

**¡Disfruta analizando tus ventas con IA en tiempo real! 🚀**