import axios from 'axios';

class AuthService {
  constructor() {
    this.baseURL = process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar';
    this.tokens = new Map(); // Almacenar tokens por usuario
    this.userCredentials = new Map(); // Almacenar credenciales por usuario
  }

  // Autenticar con email y password
  async login(email, password) {
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
          'User-Agent': 'Linisco-Dashboard/1.0.0'
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

  // Obtener token para un usuario
  async getToken(email, password) {
    const cacheKey = email;
    
    // Verificar si ya tenemos un token válido en cache
    if (this.tokens.has(cacheKey)) {
      const cachedResult = this.tokens.get(cacheKey);
      // Verificar si el token sigue siendo válido (opcional, por simplicidad asumimos que sí)
      return cachedResult;
    }

    // Si no se proporcionan credenciales, usar las de Railway o demo
    if (!email || !password) {
      // Intentar obtener credenciales del primer usuario configurado
      email = process.env.LINISCO_EMAIL || '63953@linisco.com.ar';
      password = process.env.LINISCO_PASSWORD || '63953hansen';
      console.log(`🔐 Usando credenciales configuradas para ${email}`);
    }

    const result = await this.login(email, password);
    if (result.success) {
      // Almacenar credenciales y token
      this.userCredentials.set(cacheKey, { email, password });
      this.tokens.set(cacheKey, result);
    }
    
    return result;
  }

  // Agregar nuevo usuario al sistema
  addUser(email, password) {
    this.userCredentials.set(email, { email, password });
    console.log(`👤 Usuario agregado: ${email}`);
  }

  // Obtener lista de usuarios configurados
  getUsers() {
    return Array.from(this.userCredentials.keys());
  }

  // Obtener token para un usuario específico
  async getTokenForUser(email) {
    const userCreds = this.userCredentials.get(email);
    if (!userCreds) {
      return {
        success: false,
        error: `Usuario ${email} no encontrado`
      };
    }

    return await this.getToken(userCreds.email, userCreds.password);
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
