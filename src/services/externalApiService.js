import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar configuración de tiendas
const storesPath = path.join(__dirname, '../config/stores.json');
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const LINISCO_BASE_URL = process.env.LINISCO_API_URL || 'https://api.linisco.com.ar';

class ExternalApiService {
  constructor() {
    this.sessionTokens = new Map();
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  // Autenticación con Linisco
  async authenticate(store) {
    try {
      console.log(`🔐 Autenticando ${store.store_name} (${store.store_id})...`);
      
      const response = await axios.post(`${LINISCO_BASE_URL}/auth/login`, {
        email: store.email,
        password: store.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Linisco-Dashboard/2.0.0'
        }
      });

      if (response.data && response.data.token) {
        this.sessionTokens.set(store.store_id, response.data.token);
        console.log(`✅ Autenticado: ${store.store_name}`);
        return response.data.token;
      } else {
        throw new Error('No se recibió token de autenticación');
      }
    } catch (error) {
      console.error(`❌ Error autenticando ${store.store_name}:`, error.message);
      throw error;
    }
  }

  // Obtener token de sesión
  async getSessionToken(store) {
    let token = this.sessionTokens.get(store.store_id);
    
    if (!token) {
      token = await this.authenticate(store);
    }
    
    return token;
  }

  // Obtener órdenes de venta
  async getSaleOrders(store, fromDate, toDate) {
    try {
      const token = await this.getSessionToken(store);
      
      const response = await axios.get(`${LINISCO_BASE_URL}/api/sale-orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          from_date: fromDate,
          to_date: toDate,
          store_id: store.store_id
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (error) {
      console.error(`❌ Error obteniendo órdenes para ${store.store_name}:`, error.message);
      return [];
    }
  }

  // Obtener productos de una orden
  async getSaleProducts(store, orderId) {
    try {
      const token = await this.getSessionToken(store);
      
      const response = await axios.get(`${LINISCO_BASE_URL}/api/sale-products`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          order_id: orderId,
          store_id: store.store_id
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (error) {
      console.error(`❌ Error obteniendo productos para orden ${orderId}:`, error.message);
      return [];
    }
  }

  // Obtener sesiones
  async getSessions(store, fromDate, toDate) {
    try {
      const token = await this.getSessionToken(store);
      
      const response = await axios.get(`${LINISCO_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          from_date: fromDate,
          to_date: toDate,
          store_id: store.store_id
        },
        timeout: 10000
      });

      return response.data || [];
    } catch (error) {
      console.error(`❌ Error obteniendo sesiones para ${store.store_name}:`, error.message);
      return [];
    }
  }

  // Obtener estadísticas generales
  async getStats(fromDate, toDate, storeId = null) {
    const cacheKey = `stats_${fromDate}_${toDate}_${storeId || 'all'}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📋 Usando datos en caché');
        return cached.data;
      }
    }

    try {
      console.log(`📊 Obteniendo estadísticas desde ${fromDate} hasta ${toDate}`);
      
      const filteredStores = storeId && storeId.length > 0 
        ? stores.filter(store => storeId.includes(store.store_id))
        : stores;

      let allOrders = [];
      let allProducts = [];
      let allSessions = [];

      // Obtener datos de todas las tiendas
      for (const store of filteredStores) {
        try {
          const orders = await this.getSaleOrders(store, fromDate, toDate);
          allOrders = allOrders.concat(orders.map(order => ({
            ...order,
            store_id: store.store_id,
            store_name: store.store_name
          })));

          // Obtener productos para cada orden
          for (const order of orders) {
            const products = await this.getSaleProducts(store, order.id_sale_order);
            allProducts = allProducts.concat(products.map(product => ({
              ...product,
              store_id: store.store_id,
              store_name: store.store_name,
              order_id: order.id_sale_order
            })));
          }

          // Obtener sesiones
          const sessions = await this.getSessions(store, fromDate, toDate);
          allSessions = allSessions.concat(sessions.map(session => ({
            ...session,
            store_id: store.store_id,
            store_name: store.store_name
          })));

        } catch (error) {
          console.error(`❌ Error procesando ${store.store_name}:`, error.message);
        }
      }

      // Calcular estadísticas
      const stats = this.calculateStats(allOrders, allProducts, allSessions);
      
      // Guardar en cache
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Calcular estadísticas
  calculateStats(orders, products, sessions) {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total - (order.discount || 0)), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Desglose por método de pago
    const paymentBreakdown = this.getPaymentBreakdown(orders);

    // Top 5 productos
    const topProducts = this.getTopProducts(products);

    // Desglose por tienda
    const storeBreakdown = this.getStoreBreakdown(orders);

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      paymentBreakdown,
      topProducts,
      storeBreakdown
    };
  }

  // Desglose por método de pago
  getPaymentBreakdown(orders) {
    const breakdown = {};
    
    orders.forEach(order => {
      let category;
      if (order.paymentmethod === 'cash' || order.paymentmethod === 'cc_pedidosyaft') {
        category = 'Efectivo';
      } else if (order.paymentmethod === 'cc_rappiol' || order.paymentmethod === 'cc_pedidosyaol') {
        category = 'Apps';
      } else {
        category = 'Otros';
      }

      if (!breakdown[category]) {
        breakdown[category] = { order_count: 0, total_amount: 0 };
      }
      
      breakdown[category].order_count++;
      breakdown[category].total_amount += (order.total - (order.discount || 0));
    });

    return Object.entries(breakdown).map(([category, data]) => ({
      payment_category: category,
      order_count: data.order_count,
      total_amount: data.total_amount
    }));
  }

  // Top productos
  getTopProducts(products) {
    const productStats = {};
    
    products.forEach(product => {
      const key = `${product.name}_${product.store_id}`;
      if (!productStats[key]) {
        productStats[key] = {
          name: product.name,
          times_sold: 0,
          total_revenue: 0,
          store_id: product.store_id,
          store_name: product.store_name
        };
      }
      
      productStats[key].times_sold += product.quantity || 1;
      productStats[key].total_revenue += (product.sale_price || 0) * (product.quantity || 1);
    });

    return Object.values(productStats)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);
  }

  // Desglose por tienda
  getStoreBreakdown(orders) {
    const storeStats = {};
    
    orders.forEach(order => {
      if (!storeStats[order.store_id]) {
        storeStats[order.store_id] = {
          store_name: order.store_name,
          order_count: 0,
          total_amount: 0
        };
      }
      
      storeStats[order.store_id].order_count++;
      storeStats[order.store_id].total_amount += (order.total - (order.discount || 0));
    });

    return Object.values(storeStats)
      .sort((a, b) => b.total_amount - a.total_amount);
  }

  // Obtener tiendas
  getStores() {
    return stores.map(store => ({
      store_id: store.store_id,
      store_name: store.store_name
    }));
  }

  // Limpiar cache
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache limpiado');
  }
}

export default ExternalApiService;
