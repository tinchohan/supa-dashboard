# Ejemplos de Uso de la API de Linisco

## Configuración

La API está configurada para manejar múltiples usuarios de Linisco. Por defecto, se usa el usuario `63953@linisco.com.ar` con la contraseña `63953hansen`.

### Variables de Entorno

Crea un archivo `.env` con las siguientes variables:

```env
# URL base de la API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar

# Credenciales del usuario principal
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen

# Puerto del servidor
PORT=3000
```

## Endpoints Disponibles

### 1. Obtener Usuarios Configurados
```bash
GET /api/users
```

### 2. Obtener Tiendas
```bash
GET /api/stores
```

### 3. Obtener Estadísticas de un Usuario
```bash
POST /api/stats
Content-Type: application/json

{
  "fromDate": "09/11/2021",
  "toDate": "09/11/2021",
  "email": "63953@linisco.com.ar",
  "password": "63953hansen"
}
```

### 4. Obtener Estadísticas Consolidadas (Todos los Usuarios)
```bash
POST /api/stats/consolidated
Content-Type: application/json

{
  "fromDate": "09/11/2021",
  "toDate": "09/11/2021",
  "userIds": [1, 2, 3] // Opcional: filtrar usuarios específicos
}
```

### 5. Obtener Órdenes de Venta
```bash
POST /api/sale-orders
Content-Type: application/json

{
  "fromDate": "09/11/2021",
  "toDate": "09/11/2021",
  "email": "63953@linisco.com.ar",
  "password": "63953hansen"
}
```

### 6. Obtener Productos de Venta
```bash
POST /api/sale-products
Content-Type: application/json

{
  "fromDate": "09/11/2021",
  "toDate": "09/11/2021",
  "email": "63953@linisco.com.ar",
  "password": "63953hansen"
}
```

### 7. Obtener Sesiones
```bash
POST /api/sessions
Content-Type: application/json

{
  "fromDate": "09/11/2021",
  "toDate": "09/11/2021",
  "email": "63953@linisco.com.ar",
  "password": "63953hansen"
}
```

### 8. Test de Conectividad
```bash
GET /api/test-api
```

## Ejemplos con cURL

### Login y Obtener Token
```bash
curl --request POST \
  --url https://pos.linisco.com.ar/users/sign_in \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'user-agent: vscode-restclient' \
  --data '{"user": {"email": "63953@linisco.com.ar","password": "63953hansen"}}'
```

### Obtener Órdenes de Venta
```bash
curl --request GET \
  --url http://pos.linisco.com.ar/sale_orders \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'user-agent: vscode-restclient' \
  --header 'x-user-email: 63953@linisco.com.ar' \
  --header 'x-user-token: icceRKYSKXpoZUHfss2G' \
  --data '{"fromDate" : "09/11/2021","toDate" : "09/11/2021"}'
```

## Configuración de Múltiples Usuarios

Para agregar más usuarios, edita el archivo `src/config/users.js`:

```javascript
export const USERS_CONFIG = [
  {
    id: 1,
    email: "63953@linisco.com.ar",
    password: "63953hansen",
    storeName: "Subway Lacroze",
    storeId: "63953",
    active: true
  },
  // Agregar más usuarios aquí...
];
```

## Modo Demo

Si la API de Linisco no está disponible, el sistema automáticamente usará datos de muestra para permitir el desarrollo y testing.

## Iniciar el Servidor

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`
