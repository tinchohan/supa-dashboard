import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  // Generar análisis de ventas
  async generateSalesAnalysis(stats) {
    try {
      const prompt = `
        Analiza los siguientes datos de ventas y proporciona insights clave:
        
        Estadísticas Generales:
        - Total de órdenes: ${stats.totalOrders}
        - Total de ingresos: $${stats.totalRevenue}
        - Promedio por orden: $${stats.averageOrderValue}
        
        Desglose por Método de Pago:
        ${stats.paymentBreakdown.map(p => `- ${p.payment_category}: ${p.order_count} órdenes, $${p.total_amount}`).join('\n')}
        
        Top 5 Productos:
        ${stats.topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.times_sold} vendidos, $${p.total_revenue}`).join('\n')}
        
        Desglose por Tienda:
        ${stats.storeBreakdown.map(s => `- ${s.store_name}: ${s.order_count} órdenes, $${s.total_amount}`).join('\n')}
        
        Proporciona:
        1. Resumen ejecutivo (2-3 oraciones)
        2. Insights clave (3-4 puntos)
        3. Recomendaciones (2-3 sugerencias)
        4. Tendencias observadas
        
        Responde en español y sé conciso pero informativo.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('❌ Error generando análisis de IA:', error);
      return 'Error generando análisis. Por favor, inténtalo de nuevo.';
    }
  }

  // Generar gráfico de datos
  async generateChartData(stats, chartType) {
    try {
      let prompt = '';
      
      switch (chartType) {
        case 'payment':
          prompt = `
            Crea datos para un gráfico de métodos de pago basado en:
            ${stats.paymentBreakdown.map(p => `${p.payment_category}: ${p.total_amount}`).join(', ')}
            
            Responde solo con un JSON válido con esta estructura:
            {
              "labels": ["Efectivo", "Apps", "Otros"],
              "data": [valor1, valor2, valor3],
              "backgroundColor": ["#FF6384", "#36A2EB", "#FFCE56"]
            }
          `;
          break;
          
        case 'products':
          prompt = `
            Crea datos para un gráfico de barras de productos basado en:
            ${stats.topProducts.map(p => `${p.name}: ${p.total_revenue}`).join(', ')}
            
            Responde solo con un JSON válido con esta estructura:
            {
              "labels": ["Producto1", "Producto2", "Producto3", "Producto4", "Producto5"],
              "data": [valor1, valor2, valor3, valor4, valor5]
            }
          `;
          break;
          
        case 'stores':
          prompt = `
            Crea datos para un gráfico de tiendas basado en:
            ${stats.storeBreakdown.map(s => `${s.store_name}: ${s.total_amount}`).join(', ')}
            
            Responde solo con un JSON válido con esta estructura:
            {
              "labels": ["Tienda1", "Tienda2", "Tienda3"],
              "data": [valor1, valor2, valor3]
            }
          `;
          break;
          
        default:
          throw new Error('Tipo de gráfico no válido');
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const jsonText = response.text().trim();
      
      // Limpiar la respuesta para obtener solo el JSON
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se pudo extraer JSON válido');
      }
    } catch (error) {
      console.error('❌ Error generando datos de gráfico:', error);
      return null;
    }
  }

  // Chat con IA
  async chat(message, context = {}) {
    try {
      const prompt = `
        Eres un asistente de análisis de ventas para el dashboard de Linisco.
        
        Contexto actual:
        - Usuario pregunta: "${message}"
        - Datos disponibles: ${JSON.stringify(context, null, 2)}
        
        Responde de manera útil y profesional en español.
        Si la pregunta es sobre datos específicos, usa la información del contexto.
        Si no tienes la información necesaria, sugiere cómo obtenerla.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('❌ Error en chat de IA:', error);
      return 'Lo siento, no pude procesar tu consulta. Por favor, inténtalo de nuevo.';
    }
  }
}

export default AIService;
