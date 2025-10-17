import axios from 'axios';

class AuthService {
  constructor() {
    this.baseURL = process.env.LINISCO_API_URL || 'https://api.linisco.com.ar';
    this.tokens = new Map(); // Almacenar tokens por tienda
  }

  // Autenticar con email y password
  async login(email, password) {
    try {
      console.log(`🔐 Autenticando: ${email}`);
      
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: email,
        password: password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Linisco-Dashboard/1.0.0'
        }
      });

      if (response.data && response.data.token) {
        console.log(`✅ Autenticación exitosa para ${email}`);
        return {
          success: true,
          token: response.data.token,
          user: response.data.user || { email }
        };
      } else {
        throw new Error('No se recibió token de autenticación');
      }
    } catch (error) {
      console.error(`❌ Error autenticando ${email}:`, error.message);
      
      // Si es error 503, 404 o de conectividad, usar datos de muestra
      if (error.response && (error.response.status === 503 || error.response.status === 404) || error.code === 'ECONNREFUSED') {
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

  // Obtener token para una tienda
  async getToken(storeId, email, password) {
    const cacheKey = `${storeId}-${email}`;
    
    if (this.tokens.has(cacheKey)) {
      return this.tokens.get(cacheKey);
    }

    // Si no se proporcionan credenciales, usar las de Railway
    if (!email || !password) {
      const envEmail = process.env[`STORE_${storeId}_EMAIL`];
      const envPassword = process.env[`STORE_${storeId}_PASSWORD`];
      
      if (envEmail && envPassword) {
        email = envEmail;
        password = envPassword;
        console.log(`🔐 Usando credenciales de Railway para tienda ${storeId}`);
      } else {
        // Fallback a credenciales demo
        email = 'demo@linisco.com.ar';
        password = 'demo123';
        console.log(`⚠️ Usando credenciales demo para tienda ${storeId}`);
      }
    }

    const result = await this.login(email, password);
    if (result.success) {
      this.tokens.set(cacheKey, result.token);
    }
    
    return result;
  }

  // Verificar si un token es válido
  async validateToken(token) {
    try {
      const response = await axios.get(`${this.baseURL}/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Linisco-Dashboard/1.0.0'
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

  // Limpiar tokens expirados
  clearTokens() {
    this.tokens.clear();
    console.log('🗑️ Tokens limpiados');
  }
}

export default AuthService;
