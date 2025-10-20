import { GoogleGenerativeAI } from '@google/generative-ai';

class AiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-pro' }) : null;
  }

  isConfigured() {
    return !!this.apiKey && !!this.genAI;
  }

  async generateResponse(message, context = null) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'API de Gemini no configurada. Agrega GEMINI_API_KEY a las variables de entorno.'
      };
    }

    try {
      let prompt = `Eres un asistente de análisis de ventas. Responde en español de manera profesional y útil.

Mensaje del usuario: ${message}`;

      if (context) {
        prompt += `\n\nContexto de datos de ventas:
- Total de órdenes: ${context.totalOrders || 0}
- Ingresos totales: $${context.totalRevenue || 0}
- Valor promedio por orden: $${context.averageOrderValue || 0}
- Tiendas activas: ${context.storeBreakdown?.length || 0}`;

        if (context.storeBreakdown) {
          prompt += `\n\nDesglose por tienda:`;
          context.storeBreakdown.forEach(store => {
            prompt += `\n- ${store.store_id}: ${store.order_count} órdenes, $${store.total_amount}`;
          });
        }

        if (context.topProducts) {
          prompt += `\n\nTop productos:`;
          context.topProducts.forEach(product => {
            prompt += `\n- ${product.name}: $${product.total_revenue}`;
          });
        }
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text
      };
    } catch (error) {
      console.error('❌ Error generando respuesta IA:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'API de Gemini no configurada'
      };
    }

    try {
      const result = await this.model.generateContent('Hola, ¿puedes responder con "OK"?');
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        response: text
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AiService;
