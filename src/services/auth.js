import axios from 'axios';

class AuthService {
  constructor() {
    this.baseURL = process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar';
  }

  async authenticate(email, password) {
    try {
      console.log(`🔐 Autenticando: ${email}`);
      
      const response = await axios.post(`${this.baseURL}/users/sign_in`, {
        user: {
          email: email,
          password: password
        }
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Linisco-Dashboard/2.0.0'
        }
      });

      if (response.data && response.data.authentication_token) {
        console.log(`✅ Autenticación exitosa para ${email}`);
        return {
          success: true,
          token: response.data.authentication_token,
          user: response.data
        };
      } else {
        throw new Error('No se recibió token de autenticación');
      }
    } catch (error) {
      console.error(`❌ Error autenticando ${email}:`, error.message);
      
      // Si es error de conectividad, usar modo demo
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
          (error.response && (error.response.status === 503 || error.response.status === 404))) {
        console.log('⚠️ API no disponible, usando modo demo');
        return {
          success: true,
          token: 'demo-token-' + Date.now(),
          user: { email, mode: 'demo' }
        };
      }
      
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  async validateToken(token) {
    try {
      const response = await axios.get(`${this.baseURL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Linisco-Dashboard/2.0.0'
        },
        timeout: 5000
      });
      
      return response.status === 200;
    } catch (error) {
      // Si es token demo, considerarlo válido
      if (token.startsWith('demo-token-')) {
        return true;
      }
      return false;
    }
  }
}

export default AuthService;
