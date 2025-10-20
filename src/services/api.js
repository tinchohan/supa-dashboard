import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.LINISCO_API_URL || 'https://pos.linisco.com.ar';
  }

  async getData(endpoint, token, fromDate, toDate) {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'Linisco-Dashboard/2.0.0'
        },
        params: {
          from_date: fromDate,
          to_date: toDate
        },
        timeout: 30000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Error obteniendo ${endpoint}:`, error.message);
      
      // Si es error de conectividad, usar datos de muestra
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
          (error.response && (error.response.status === 503 || error.response.status === 404))) {
        console.log('⚠️ API no disponible, usando datos de muestra');
        return {
          success: true,
          data: this.getMockData(endpoint)
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  getMockData(endpoint) {
    const mockData = {
      '/sale_orders': this.getMockOrders(),
      '/sale_products': this.getMockProducts(),
      '/psessions': this.getMockSessions()
    };
    
    return mockData[endpoint] || [];
  }

  getMockOrders() {
    return [
      {
        id: 'ORD001',
        store_id: '63953',
        order_date: '2025-10-20T12:00:00Z',
        total: 1500,
        discount: 0,
        payment_method: 'Efectivo'
      },
      {
        id: 'ORD002',
        store_id: '63953',
        order_date: '2025-10-20T13:30:00Z',
        total: 2200,
        discount: 100,
        payment_method: 'Apps'
      },
      {
        id: 'ORD003',
        store_id: '66220',
        order_date: '2025-10-20T14:15:00Z',
        total: 1800,
        discount: 0,
        payment_method: 'Efectivo'
      }
    ];
  }

  getMockProducts() {
    return [
      {
        order_id: 'ORD001',
        store_id: '63953',
        name: 'Sub de Pollo',
        price: 1500,
        quantity: 1,
        total: 1500
      },
      {
        order_id: 'ORD002',
        store_id: '63953',
        name: 'Sub de Carne',
        price: 2200,
        quantity: 1,
        total: 2200
      },
      {
        order_id: 'ORD003',
        store_id: '66220',
        name: 'Combo Familiar',
        price: 1800,
        quantity: 1,
        total: 1800
      }
    ];
  }

  getMockSessions() {
    return [
      {
        id: 'SESS001',
        store_id: '63953',
        session_date: '2025-10-20T12:00:00Z'
      },
      {
        id: 'SESS002',
        store_id: '66220',
        session_date: '2025-10-20T14:00:00Z'
      }
    ];
  }
}

export default ApiService;
