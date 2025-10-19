import axios from 'axios';

class AiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-1.5-flash';
  }

  // Verificar si la API está configurada
  isConfigured() {
    return !!this.apiKey;
  }

  // Generar respuesta con Gemini
  async generateResponse(message, context = null) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'API de Gemini no configurada. Por favor configura GEMINI_API_KEY en las variables de entorno.'
        };
      }

      // Construir prompt con contexto
      let prompt = this.buildPrompt(message, context);

      const response = await axios.post(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const generatedText = response.data.candidates[0].content.parts[0].text;
        
        return {
          success: true,
          response: generatedText.trim()
        };
      } else {
        return {
          success: false,
          error: 'No se pudo generar respuesta del modelo'
        };
      }

    } catch (error) {
      console.error('Error generando respuesta con Gemini:', error.message);
      
      if (error.response?.status === 400) {
        return {
          success: false,
          error: 'Error en la configuración de la API de Gemini. Verifica tu API key.'
        };
      } else if (error.response?.status === 429) {
        return {
          success: false,
          error: 'Límite de solicitudes excedido. Inténtalo más tarde.'
        };
      } else {
        return {
          success: false,
          error: 'Error de conexión con Gemini: ' + error.message
        };
      }
    }
  }

  // Construir prompt con contexto de ventas
  buildPrompt(message, context) {
    let prompt = `Eres un asistente especializado en análisis de ventas para el dashboard de Linisco. 
    
Tu función es ayudar a interpretar datos de ventas, identificar tendencias, y proporcionar insights útiles para el negocio.

INSTRUCCIONES:
- Responde en español
- Sé conciso pero informativo
- Usa emojis cuando sea apropiado
- Si no tienes datos específicos, explica qué información necesitarías
- Sugiere acciones concretas cuando sea posible
- Mantén un tono profesional pero amigable

`;

    if (context) {
      prompt += `
DATOS ACTUALES DEL DASHBOARD:
- Total de órdenes: ${context.totalOrders?.toLocaleString() || 'N/A'}
- Ingresos totales: $${context.totalRevenue?.toLocaleString() || 'N/A'}
- Promedio por orden: $${Math.round(context.averageOrderValue || 0).toLocaleString()}
- Tiendas activas: ${context.storeBreakdown?.length || 0}

DESGLOSE POR MÉTODO DE PAGO:
${context.paymentBreakdown?.map(p => `- ${p.payment_category}: $${p.total_amount.toLocaleString()} (${p.order_count} órdenes)`).join('\n') || 'No disponible'}

TOP PRODUCTOS:
${context.topProducts?.slice(0, 5).map((p, i) => `${i + 1}. ${p.name}: $${p.total_revenue.toLocaleString()}`).join('\n') || 'No disponible'}

DESGLOSE POR TIENDA:
${context.storeBreakdown?.map(s => `- Tienda ${s.store_id}: $${s.total_amount.toLocaleString()} (${s.order_count} órdenes)`).join('\n') || 'No disponible'}

`;
    }

    prompt += `
PREGUNTA DEL USUARIO: ${message}

Responde de manera útil y específica basándote en los datos disponibles:`;

    return prompt;
  }

  // Análisis de tendencias
  async analyzeTrends(context) {
    if (!context) {
      return {
        success: false,
        error: 'No hay datos para analizar'
      };
    }

    const prompt = `Analiza las siguientes tendencias de ventas y proporciona insights:

DATOS:
- Total órdenes: ${context.totalOrders}
- Ingresos: $${context.totalRevenue}
- Promedio por orden: $${Math.round(context.averageOrderValue)}
- Métodos de pago: ${JSON.stringify(context.paymentBreakdown)}
- Top productos: ${JSON.stringify(context.topProducts?.slice(0, 3))}
- Tiendas: ${JSON.stringify(context.storeBreakdown?.slice(0, 3))}

Proporciona:
1. 3 insights clave
2. 2 recomendaciones de acción
3. 1 área de oportunidad

Responde en formato JSON con las claves: insights, recomendaciones, oportunidades`;

    return await this.generateResponse(prompt, context);
  }

  // Generar resumen ejecutivo
  async generateExecutiveSummary(context) {
    if (!context) {
      return {
        success: false,
        error: 'No hay datos para generar resumen'
      };
    }

    const prompt = `Genera un resumen ejecutivo de 3 párrafos para estos datos de ventas:

DATOS:
- Total órdenes: ${context.totalOrders}
- Ingresos: $${context.totalRevenue}
- Promedio por orden: $${Math.round(context.averageOrderValue)}
- Métodos de pago: ${JSON.stringify(context.paymentBreakdown)}
- Top productos: ${JSON.stringify(context.topProducts?.slice(0, 3))}
- Tiendas: ${JSON.stringify(context.storeBreakdown?.slice(0, 3))}

Incluye:
1. Párrafo 1: Resumen de rendimiento general
2. Párrafo 2: Análisis de métodos de pago y productos
3. Párrafo 3: Recomendaciones estratégicas

Formato: Texto directo, sin JSON`;

    return await this.generateResponse(prompt, context);
  }

  // Test de conectividad
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'API key no configurada'
        };
      }

      const response = await this.generateResponse('Hola, ¿puedes confirmar que estás funcionando?');
      
      return {
        success: response.success,
        message: response.success ? 'Conexión exitosa con Gemini' : response.error
      };
    } catch (error) {
      return {
        success: false,
        error: 'Error de conexión: ' + error.message
      };
    }
  }
}

export default AiService;
