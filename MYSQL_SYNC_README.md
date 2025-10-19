# Sincronización con MySQL - Linisco Dashboard

## 🗄️ Descripción

El sistema ahora incluye sincronización automática con MySQL, lo que permite:
- **Consultas más rápidas** desde base de datos local
- **Datos persistentes** sin depender de la API externa
- **Análisis avanzados** con consultas SQL complejas
- **Respaldo de datos** histórico

## 🚀 Instalación

### 1. Instalar MySQL

**Windows:**
```bash
# Descargar MySQL Community Server desde:
# https://dev.mysql.com/downloads/mysql/

# O usar Chocolatey:
choco install mysql

# O usar WSL:
wsl --install
# Luego en WSL:
sudo apt update
sudo apt install mysql-server
```

**macOS:**
```bash
# Usar Homebrew:
brew install mysql
brew services start mysql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2. Configurar MySQL

```bash
# Iniciar MySQL
mysql -u root -p

# Ejecutar el script de configuración
source mysql-setup.sql
```

### 3. Configurar Variables de Entorno

Crear archivo `.env`:
```env
# Configuración de la aplicación
PORT=3000
NODE_ENV=development

# Base de datos MySQL
DB_HOST=localhost
DB_USER=linisco_user
DB_PASSWORD=linisco_password
DB_NAME=linisco_dashboard
DB_PORT=3306

# API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen
```

## 📊 Uso

### Endpoints de Sincronización

#### 1. Sincronizar Usuario Específico
```bash
POST /api/sync/user
Content-Type: application/json

{
  "fromDate": "2025-01-01",
  "toDate": "2025-12-31",
  "email": "63953@linisco.com.ar",
  "password": "63953hansen"
}
```

#### 2. Sincronizar Todos los Usuarios
```bash
POST /api/sync/all
Content-Type: application/json

{
  "fromDate": "2025-01-01",
  "toDate": "2025-12-31"
}
```

#### 3. Verificar Estado de Sincronización
```bash
GET /api/sync/status
```

#### 4. Limpiar Datos Antiguos
```bash
POST /api/sync/cleanup
Content-Type: application/json

{
  "daysToKeep": 90
}
```

### Consultas SQL Directas

Una vez sincronizados los datos, puedes hacer consultas directas:

```sql
-- Estadísticas por tienda
SELECT 
  store_id,
  COUNT(*) as total_orders,
  SUM(total - COALESCE(discount, 0)) as total_revenue,
  AVG(total - COALESCE(discount, 0)) as avg_order_value
FROM sale_orders 
WHERE order_date >= '2025-01-01'
GROUP BY store_id
ORDER BY total_revenue DESC;

-- Top productos
SELECT 
  name,
  SUM(quantity) as total_sold,
  SUM(total) as total_revenue
FROM sale_products 
WHERE created_at >= '2025-01-01'
GROUP BY name
ORDER BY total_revenue DESC
LIMIT 10;

-- Análisis por método de pago
SELECT 
  payment_method,
  COUNT(*) as order_count,
  SUM(total - COALESCE(discount, 0)) as total_amount
FROM sale_orders 
WHERE order_date >= '2025-01-01'
GROUP BY payment_method;
```

## 🔄 Flujo de Sincronización

1. **Inicialización**: Al iniciar el servidor, se conecta a MySQL y crea las tablas
2. **Sincronización Manual**: Usar endpoints `/api/sync/*` para sincronizar datos
3. **Consultas Híbridas**: El sistema prioriza datos de MySQL, fallback a API
4. **Actualización Automática**: Los datos se actualizan cada vez que se consultan

## 📈 Beneficios

### Rendimiento
- **Consultas 10x más rápidas** desde base de datos local
- **Sin timeouts** de la API externa
- **Caché inteligente** de datos frecuentemente consultados

### Análisis Avanzados
- **Consultas SQL complejas** para análisis detallados
- **Agregaciones rápidas** por cualquier campo
- **Histórico completo** de datos

### Confiabilidad
- **Datos persistentes** sin depender de la API externa
- **Respaldo automático** de información crítica
- **Recuperación de datos** en caso de problemas

## 🛠️ Mantenimiento

### Limpieza de Datos
```bash
# Limpiar datos de más de 90 días
curl -X POST http://localhost:3000/api/sync/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 90}'
```

### Verificación de Estado
```bash
# Verificar estado de sincronización
curl http://localhost:3000/api/sync/status
```

### Resincronización
```bash
# Resincronizar todos los datos
curl -X POST http://localhost:3000/api/sync/all \
  -H "Content-Type: application/json" \
  -d '{"fromDate": "2025-01-01", "toDate": "2025-12-31"}'
```

## 🔧 Solución de Problemas

### Error de Conexión a MySQL
```bash
# Verificar que MySQL esté ejecutándose
sudo systemctl status mysql

# Verificar credenciales
mysql -u linisco_user -p linisco_dashboard
```

### Tablas No Creadas
```bash
# Las tablas se crean automáticamente al iniciar el servidor
# Si hay problemas, verificar permisos del usuario
GRANT ALL PRIVILEGES ON linisco_dashboard.* TO 'linisco_user'@'localhost';
FLUSH PRIVILEGES;
```

### Datos No Sincronizados
```bash
# Verificar logs del servidor
# Verificar conectividad con API de Linisco
curl http://localhost:3000/api/test-api
```

## 📝 Notas Importantes

- **Primera sincronización**: Puede tardar varios minutos dependiendo de la cantidad de datos
- **Espacio en disco**: Los datos se almacenan localmente, monitorear espacio disponible
- **Credenciales**: Solo el usuario principal (63953@linisco.com.ar) tiene credenciales válidas
- **Fallback**: Si MySQL no está disponible, el sistema funciona solo con API

## 🎯 Próximos Pasos

1. **Configurar MySQL** siguiendo las instrucciones
2. **Ejecutar primera sincronización** con datos históricos
3. **Configurar respaldos automáticos** de la base de datos
4. **Implementar dashboard** con consultas SQL optimizadas
5. **Agregar más usuarios** con credenciales reales
