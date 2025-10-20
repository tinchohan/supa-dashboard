# 🏪 Linisco Dashboard v2.0

Dashboard moderno de análisis de ventas con IA integrada, base de datos SQLite y sincronización automática.

## ✨ Características

- **📊 Estadísticas en tiempo real**: Total de órdenes, ingresos, promedio por orden
- **🏪 Gestión por tienda**: Autenticación individual y sincronización selectiva
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

### Autenticación
- `GET /api/auth/status` - Estado de autenticación
- `POST /api/auth/authenticate-all` - Autenticar todas las tiendas

### IA
- `POST /api/chat` - Chat con IA
- `GET /api/test-ai` - Test de conectividad IA

### Salud
- `GET /api/health` - Estado del servidor

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

## 📁 Estructura del Proyecto

```
src/
├── config/
│   └── users.js                    # Configuración de usuarios
├── services/
│   ├── database.js                 # Servicio de SQLite
│   ├── auth.js                     # Servicio de autenticación
│   ├── api.js                      # Servicio de API
│   ├── sync.js                     # Servicio de sincronización
│   └── ai.js                       # Servicio de IA
└── server.js                       # Servidor principal

public/
└── index.html                      # Dashboard frontend

data/                               # Base de datos SQLite
└── dashboard.db                    # Archivo de base de datos
```

## 🛠️ Desarrollo

### Scripts disponibles
```bash
npm start          # Iniciar servidor
npm run dev        # Modo desarrollo con watch
npm test           # Probar sistema
```

## 📝 Licencia

MIT License

---

**¡Disfruta analizando tus ventas con IA en tiempo real! 🚀**
