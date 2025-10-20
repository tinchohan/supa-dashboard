# 🏪 Linisco Dashboard

Dashboard moderno de análisis de ventas con IA integrada, base de datos SQLite y sincronización automática con la API de Linisco.

## ✨ Características

- **📊 Estadísticas en tiempo real**: Total de órdenes, ingresos, promedio por orden
- **🏪 Desglose por tienda**: Análisis detallado por cada ubicación
- **🏆 Top 5 productos**: Productos más vendidos con ingresos
- **💳 Métodos de pago**: Efectivo, Apps, Otros
- **🤖 Chat con IA**: Asistente inteligente con Gemini
- **🗄️ Base de datos SQLite**: Datos persistentes y sincronización automática
- **📈 Diseño responsivo**: Funciona en desktop y móvil

## 🚀 Instalación

### Requisitos
- Node.js 18+
- Acceso a API de Linisco
- API key de Google Gemini (opcional)

### Instalación local

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd Supa
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

4. **Ejecutar**
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

1. **Conectar repositorio a Railway**
2. **Configurar variables de entorno** (opcional)
3. **Desplegar automáticamente**

Railway detectará automáticamente la configuración y desplegará con SQLite.

## 🔧 API Endpoints

### Datos
- `GET /api/stores` - Lista de tiendas
- `POST /api/stats` - Estadísticas de ventas
- `POST /api/sync` - Sincronizar datos

### IA
- `POST /api/chat` - Chat con IA
- `POST /api/ai/analysis` - Análisis de tendencias
- `POST /api/ai/summary` - Resumen ejecutivo

### Salud
- `GET /api/health` - Estado del servidor
- `GET /api/test-ai` - Test de conectividad IA

## ⚙️ Configuración

### Variables de Entorno

```bash
# API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen

# IA - Google Gemini (opcional)
GEMINI_API_KEY=your_gemini_api_key_here

# Configuración
NODE_ENV=production
PORT=3000
```

### Usuarios Configurados

El sistema incluye 7 usuarios preconfigurados:

1. **Subway Lacroze** - 63953@linisco.com.ar
2. **Subway Corrientes** - 66220@linisco.com.ar
3. **Subway Ortiz** - 72267@linisco.com.ar
4. **Daniel Lacroze** - 30036@linisco.com.ar
5. **Daniel Corrientes** - 30038@linisco.com.ar
6. **Daniel Ortiz** - 10019@linisco.com.ar
7. **Seitu Juramento** - 10020@linisco.com.ar

## 📁 Estructura del Proyecto

```
src/
├── config/
│   └── users.js                    # Configuración de usuarios
├── services/
│   ├── apiService.js               # Servicio de API
│   ├── authService.js              # Servicio de autenticación
│   ├── sqliteService.js            # Servicio de SQLite
│   ├── sqliteSyncService.js        # Servicio de sincronización
│   └── aiService.js                # Servicio de IA
└── server.js                       # Servidor principal

public/
└── index.html                      # Dashboard frontend

data/                               # Base de datos SQLite
└── linisco_dashboard.db            # Archivo de base de datos
```

## 🛠️ Desarrollo

### Scripts disponibles
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con watch
npm test           # Probar sistema completo
```

### Funcionalidades

- **Sincronización automática**: Los datos se sincronizan con la API de Linisco
- **Base de datos local**: SQLite para almacenamiento persistente
- **Chat inteligente**: IA que conoce el contexto de tus datos
- **Diseño responsivo**: Funciona en todos los dispositivos

## 📝 Licencia

MIT License

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

---

**¡Disfruta analizando tus ventas con IA en tiempo real! 🚀**