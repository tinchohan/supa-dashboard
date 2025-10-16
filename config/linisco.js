import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const LINISCO_API_URL = process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar';

class LiniscoAPI {
  constructor(storeConfig = null) {
    this.baseURL = LINISCO_API_URL;
    this.storeConfig = storeConfig;
    this.authToken = null;
    this.userId = null;
    this.storeId = null;
  }

  async authenticate() {
    if (!this.storeConfig) {
      throw new Error('Configuración de tienda no proporcionada');
    }

    try {
      const response = await axios.post(`${this.baseURL}/users/sign_in`, {
        user: {
          email: this.storeConfig.email,
          password: this.storeConfig.password
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      this.authToken = response.data.authentication_token;
      this.userId = response.data.id;
      this.storeId = this.storeConfig.store_id;
      
      console.log(`✅ Autenticación exitosa para ${this.storeConfig.store_name} (${this.storeConfig.store_id})`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error en autenticación para ${this.storeConfig.store_name}:`, error.response?.data || error.message);
      throw error;
    }
  }

  getAuthHeaders() {
    if (!this.authToken) {
      throw new Error('No hay token de autenticación. Ejecuta authenticate() primero.');
    }
    
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-User-Email': this.storeConfig.email,
      'X-User-Token': this.authToken
    };
  }

  async getSaleOrders(fromDate, toDate) {
    try {
      const response = await axios.get(`${this.baseURL}/sale_orders`, {
        headers: this.getAuthHeaders(),
        params: {
          fromDate,
          toDate
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo órdenes de venta:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSaleProducts(fromDate, toDate) {
    try {
      const response = await axios.get(`${this.baseURL}/sale_products`, {
        headers: this.getAuthHeaders(),
        params: {
          fromDate,
          toDate
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo productos vendidos:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSaleCombos(orderId) {
    try {
      const response = await axios.get(`${this.baseURL}/sale_combos`, {
        headers: this.getAuthHeaders(),
        params: {
          order: orderId
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo combos vendidos:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSessions(fromDate, toDate) {
    try {
      const response = await axios.get(`${this.baseURL}/psessions`, {
        headers: this.getAuthHeaders(),
        params: {
          fromDate,
          toDate
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo sesiones:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSessionProducts(sessionId) {
    try {
      const response = await axios.get(`${this.baseURL}/psessions/${sessionId}/products`, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ Error obteniendo productos de sesión ${sessionId}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

export default LiniscoAPI;
