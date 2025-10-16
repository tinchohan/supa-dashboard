# 🔒 Seguridad del Dashboard

## Credenciales de Acceso

### **Variables de Entorno Requeridas:**

Para Railway, configurar estas variables de entorno:

```bash
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_contraseña_segura
```

### **Configuración Local:**

1. **Crear archivo de credenciales:**
   ```bash
   cp config/auth-credentials.example.js config/auth-credentials.js
   ```

2. **Editar credenciales:**
   ```javascript
   export const AUTH_CREDENTIALS = {
     username: 'tu_usuario',
     password: 'tu_contraseña_segura'
   };
   ```

3. **El archivo `auth-credentials.js` está en `.gitignore`** - No se subirá a GitHub

## Mejores Prácticas de Seguridad

### **1. Credenciales Fuertes:**
- Usar contraseñas de al menos 12 caracteres
- Incluir mayúsculas, minúsculas, números y símbolos
- No usar credenciales predecibles

### **2. Variables de Entorno:**
- **Nunca** hardcodear credenciales en el código
- Usar variables de entorno para credenciales
- Mantener credenciales fuera del control de versiones

### **3. Acceso al Dashboard:**
- Solo personal autorizado debe tener acceso
- Cambiar credenciales regularmente
- Monitorear accesos al dashboard

### **4. Railway:**
- Configurar variables de entorno en Railway Dashboard
- No exponer credenciales en logs
- Usar HTTPS siempre

## Configuración en Railway

1. **Ir a Railway Dashboard**
2. **Seleccionar el proyecto**
3. **Variables de entorno**
4. **Agregar:**
   - `ADMIN_USERNAME`: Tu usuario admin
   - `ADMIN_PASSWORD`: Tu contraseña segura

## Configuración Local

1. **Crear archivo de credenciales:**
   ```bash
   cp config/auth-credentials.example.js config/auth-credentials.js
   ```

2. **Editar con tus credenciales**
3. **El archivo no se subirá a GitHub**

## ⚠️ Importante

- **Nunca** subir credenciales a GitHub
- **Siempre** usar variables de entorno en producción
- **Cambiar** credenciales por defecto inmediatamente
- **Monitorear** accesos al dashboard
