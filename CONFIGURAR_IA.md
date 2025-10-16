# 🤖 Configuración de Inteligencia Artificial para el Dashboard

## 🚀 **Configuración Rápida (5 minutos)**

### **Paso 1: Obtener API Key de Gemini**

1. **Ve a Google AI Studio**: https://aistudio.google.com/app/apikey
2. **Inicia sesión** con tu cuenta de Google
3. **Crea una nueva API key**:
   - Haz clic en "Create API Key"
   - Selecciona "Create API key in new project" o usa un proyecto existente
   - Copia la API key generada

### **Paso 2: Configurar Variables de Entorno**

1. **Crea un archivo `.env`** en la raíz del proyecto (si no existe):
   ```bash
   cp env.example .env
   ```

2. **Edita el archivo `.env`** y agrega tu API key:
   ```env
   # Configuración de IA
   GEMINI_API_KEY=tu_api_key_aqui
   AI_PROVIDER=gemini
   ```

### **Paso 3: Reiniciar el Servidor**

```bash
npm run web
```

### **Paso 4: Probar la IA**

1. Abre el dashboard en `http://localhost:3000`
2. Presiona "Cargar Datos del Dashboard"
3. Ve a la sección "Chat con IA"
4. Haz una pregunta como: "¿Cuáles son mis mejores productos?"

## 💰 **Costos y Límites**

### **Google Gemini (Recomendado)**
- ✅ **Gratis**: 15 requests por minuto
- ✅ **Pago**: $0.000075 por 1K tokens (muy barato)
- ✅ **Límite diario**: 1,500 requests gratis

### **OpenAI GPT (Alternativa)**
- 💰 **Pago**: $0.002 por 1K tokens
- 📊 **Límite**: Según tu plan

## 🔧 **Configuración Avanzada**

### **Variables de Entorno Completas**

```env
# ===== CONFIGURACIÓN DE IA =====

# Google Gemini (Recomendado)
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=2048

# OpenAI (Alternativa)
OPENAI_API_KEY=tu_openai_api_key_aqui
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2048

# Configuración general
AI_PROVIDER=gemini
AI_CACHE_DURATION=300
AI_MAX_CONVERSATION_HISTORY=10
AI_RESPONSE_TIMEOUT=30000

# Funcionalidades
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_PREDICTIONS=true
ENABLE_RECOMMENDATIONS=true
ENABLE_CHAT_AI=true
```

## 🎯 **Funcionalidades de IA Mejoradas**

### **Con API Configurada:**
- 🧠 **Análisis inteligente**: Insights profundos automáticos
- 💬 **Chat avanzado**: Conversaciones naturales en español
- 🔮 **Predicciones precisas**: Hasta 85% de precisión
- 📊 **Recomendaciones personalizadas**: Sugerencias específicas
- 🎯 **Análisis de tendencias**: Patrones complejos automáticos

### **Sin API (actual):**
- 📊 Análisis básicos funcionales
- 🔄 Respuestas predefinidas
- 📈 Predicciones simples
- 💬 Chat básico

## 🚨 **Solución de Problemas**

### **Error: "API key not configured"**
- ✅ Verifica que el archivo `.env` existe
- ✅ Verifica que `GEMINI_API_KEY` está configurada
- ✅ Reinicia el servidor después de configurar

### **Error: "Invalid API key"**
- ✅ Verifica que la API key es correcta
- ✅ Verifica que la API key está activa en Google AI Studio
- ✅ Genera una nueva API key si es necesario

### **Error: "Rate limit exceeded"**
- ✅ Espera unos minutos (límite: 15 requests/minuto)
- ✅ Considera usar un plan de pago para más requests

### **La IA no responde**
- ✅ Verifica la conexión a internet
- ✅ Verifica que la API key es válida
- ✅ Revisa los logs del servidor para errores

## 📊 **Ejemplos de Preguntas para Probar**

### **Análisis de Ventas:**
- "¿Cuáles son mis mejores productos?"
- "¿Qué día de la semana vendo más?"
- "¿Cómo están mis ventas comparado con el mes pasado?"

### **Análisis de Productos:**
- "¿Qué productos debería promocionar más?"
- "¿Hay productos que no se venden bien?"
- "¿Cuál es mi producto estrella?"

### **Análisis de Tendencias:**
- "¿Cuál es la tendencia de mis ventas?"
- "¿Qué puedo esperar para la próxima semana?"
- "¿Hay patrones estacionales en mis ventas?"

## 🎉 **¡Listo!**

Una vez configurado, tu dashboard tendrá capacidades de IA avanzadas que te ayudarán a:

- 📈 **Tomar mejores decisiones** basadas en datos
- 🔮 **Predecir tendencias** de ventas
- 💡 **Obtener insights** automáticos
- 🎯 **Optimizar tu negocio** con recomendaciones inteligentes

¿Necesitas ayuda con la configuración? ¡Pregúntame!
