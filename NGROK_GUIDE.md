# 🌐 Guía para Exponer el Dashboard con ngrok

Esta guía te ayudará a exponer tu dashboard de Linisco con IA a través de ngrok para que puedas accederlo desde cualquier lugar.

## 🚀 Opción 1: Método Simple (Recomendado)

### 1. Ejecutar el script automático
```bash
# Opción A: Usar npm script
npm run ngrok-simple

# Opción B: Ejecutar directamente el archivo batch
start-ngrok.bat
```

### 2. ¿Qué hace este script?
- ✅ Inicia el servidor web en puerto 3000
- ✅ Espera 5 segundos para que se inicie
- ✅ Abre ngrok automáticamente
- ✅ Te muestra la URL pública

### 3. Obtener la URL pública
Después de ejecutar, verás algo como:
```
Session Status                online
Account                       tu-email@ejemplo.com
Version                       3.x.x
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

**Tu URL pública será:** `https://abc123.ngrok.io`

## 🛠️ Opción 2: Método Manual

### 1. Iniciar el servidor web
```bash
npm run web
```

### 2. En otra terminal, iniciar ngrok
```bash
ngrok http 3000
```

### 3. Copiar la URL pública
Busca la línea que dice `Forwarding` y copia la URL HTTPS.

## 📱 Acceder desde Dispositivos

### Desde tu teléfono:
1. Abre el navegador
2. Ve a la URL de ngrok (ej: `https://abc123.ngrok.io`)
3. ¡Disfruta del dashboard con IA!

### Desde otra computadora:
1. Comparte la URL de ngrok
2. Cualquiera puede acceder al dashboard
3. Todas las funcionalidades de IA están disponibles

## 🤖 Funcionalidades Disponibles en la URL Pública

- ✅ **Dashboard completo** con estadísticas en tiempo real
- ✅ **Chat con IA** para consultas en lenguaje natural
- ✅ **Análisis inteligente** de patrones de ventas
- ✅ **Predicciones** basadas en datos históricos
- ✅ **Recomendaciones** para optimizar el negocio
- ✅ **Gráficos automáticos** de tendencias

## 🔧 Configuración Avanzada

### ngrok con autenticación (Recomendado para producción)
```bash
# Configurar autenticación
ngrok config add-authtoken tu-token-aqui

# Iniciar con subdominio personalizado
ngrok http 3000 --subdomain=linisco-dashboard
```

### ngrok con región específica
```bash
# Para mejor latencia en tu región
ngrok http 3000 --region=us
ngrok http 3000 --region=eu
ngrok http 3000 --region=ap
```

## 🚨 Solución de Problemas

### Error: "ngrok not found"
```bash
# Instalar ngrok globalmente
npm install -g ngrok

# O descargar desde: https://ngrok.com/download
```

### Error: "Port 3000 already in use"
```bash
# Cambiar puerto en web/server.js
const PORT = process.env.PORT || 3001;

# Luego usar:
ngrok http 3001
```

### Error: "Tunnel failed"
- Verifica que el servidor web esté corriendo
- Asegúrate de que el puerto 3000 esté libre
- Revisa tu conexión a internet

## 🔒 Seguridad

### Para uso temporal (desarrollo):
- ✅ Perfecto para pruebas y demos
- ✅ No requiere configuración adicional

### Para uso prolongado:
- ⚠️ Considera usar autenticación
- ⚠️ Limita el acceso por IP si es necesario
- ⚠️ Usa HTTPS (ngrok lo proporciona automáticamente)

## 📊 Monitoreo

### Panel de ngrok
Accede a `http://127.0.0.1:4040` para ver:
- Estadísticas de tráfico
- Logs de requests
- Métricas de rendimiento

### Logs del servidor
```bash
# Ver logs en tiempo real
npm run web
```

## 🎯 Casos de Uso

### 1. Demo para clientes
- Comparte la URL de ngrok
- Muestra las funcionalidades de IA
- Acceso desde cualquier dispositivo

### 2. Trabajo remoto
- Accede desde casa
- Misma funcionalidad que local
- Sincronización automática

### 3. Colaboración
- Comparte con el equipo
- Acceso simultáneo
- Análisis colaborativo

## 🚀 Comandos Rápidos

```bash
# Inicio rápido
npm run ngrok-simple

# Solo servidor web
npm run web

# Solo ngrok (si ya tienes el servidor corriendo)
ngrok http 3000

# Con región específica
ngrok http 3000 --region=us
```

## 📝 Notas Importantes

- 🔄 La URL de ngrok cambia cada vez que reinicias (a menos que uses cuenta premium)
- 💰 Para URLs fijas, considera una cuenta premium de ngrok
- 🌐 ngrok es perfecto para desarrollo y demos
- 🔒 Para producción, considera usar un servidor en la nube

¡Tu dashboard con IA ahora está disponible globalmente! 🌍🤖

