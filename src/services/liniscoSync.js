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

class LiniscoSyncService {
  constructor() {
    this.sessionTokens = new Map();
  }

  // Autenticación con Linisco
  async authenticate(store) {
    try {
      console.log(`🔐 Autenticando ${store.store_name} (${store.store_id})...`);
      console.log(`🌐 URL de API: ${LINISCO_BASE_URL}`);
      console.log(`📧 Email: ${store.email}`);
      
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
      if (error.response) {
        console.error(`📊 Status: ${error.response.status}`);
        console.error(`📋 Headers:`, error.response.headers);
        console.error(`📄 Data:`, error.response.data);
      } else if (error.request) {
        console.error(`🌐 Request error:`, error.request);
      }
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
        }
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
        }
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
        }
      });

      return response.data || [];
    } catch (error) {
      console.error(`❌ Error obteniendo sesiones para ${store.store_name}:`, error.message);
      return [];
    }
  }

  // Sincronizar datos de una tienda
  async syncStoreData(store, fromDate, toDate, db) {
    try {
      console.log(`🔄 Sincronizando ${store.store_name} (${store.store_id})...`);
      
      // Obtener órdenes
      const orders = await this.getSaleOrders(store, fromDate, toDate);
      console.log(`📦 ${orders.length} órdenes encontradas`);
      
      // Obtener productos para cada orden
      let allProducts = [];
      for (const order of orders) {
        const products = await this.getSaleProducts(store, order.id_sale_order);
        allProducts = allProducts.concat(products);
      }
      console.log(`🛍️ ${allProducts.length} productos encontrados`);
      
      // Obtener sesiones
      const sessions = await this.getSessions(store, fromDate, toDate);
      console.log(`📊 ${sessions.length} sesiones encontradas`);
      
      // Insertar datos en PostgreSQL
      await this.insertOrders(db, orders, store.store_id);
      await this.insertProducts(db, allProducts, store.store_id);
      await this.insertSessions(db, sessions, store.store_id);
      
      return {
        store: store.store_name,
        orders: orders.length,
        products: allProducts.length,
        sessions: sessions.length
      };
      
    } catch (error) {
      console.error(`❌ Error sincronizando ${store.store_name}:`, error.message);
      throw error;
    }
  }

  // Insertar órdenes en la base de datos
  async insertOrders(db, orders, storeId) {
    for (const order of orders) {
      try {
        await db.query(`
          INSERT INTO sale_orders (
            linisco_id, shop_number, store_id, id_sale_order, id_customer,
            number, order_date, id_session, paymentmethod, total, discount, url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (linisco_id, store_id) 
          DO UPDATE SET
            shop_number = EXCLUDED.shop_number,
            id_sale_order = EXCLUDED.id_sale_order,
            id_customer = EXCLUDED.id_customer,
            number = EXCLUDED.number,
            order_date = EXCLUDED.order_date,
            id_session = EXCLUDED.id_session,
            paymentmethod = EXCLUDED.paymentmethod,
            total = EXCLUDED.total,
            discount = EXCLUDED.discount,
            url = EXCLUDED.url,
            synced_at = CURRENT_TIMESTAMP
        `, [
          order.linisco_id,
          order.shop_number || '001',
          storeId,
          order.id_sale_order,
          order.id_customer,
          order.number,
          order.order_date,
          order.id_session,
          order.paymentmethod,
          order.total,
          order.discount,
          order.url
        ]);
      } catch (error) {
        console.error(`❌ Error insertando orden ${order.id_sale_order}:`, error.message);
      }
    }
  }

  // Insertar productos en la base de datos
  async insertProducts(db, products, storeId) {
    for (const product of products) {
      try {
        await db.query(`
          INSERT INTO sale_products (
            linisco_id, shop_number, store_id, id_sale_product, id_sale_order,
            name, fixed_name, quantity, sale_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (linisco_id, store_id) 
          DO UPDATE SET
            shop_number = EXCLUDED.shop_number,
            id_sale_product = EXCLUDED.id_sale_product,
            id_sale_order = EXCLUDED.id_sale_order,
            name = EXCLUDED.name,
            fixed_name = EXCLUDED.fixed_name,
            quantity = EXCLUDED.quantity,
            sale_price = EXCLUDED.sale_price,
            synced_at = CURRENT_TIMESTAMP
        `, [
          product.linisco_id,
          product.shop_number || '001',
          storeId,
          product.id_sale_product || product.linisco_id,
          product.id_sale_order,
          product.name,
          product.fixed_name,
          product.quantity,
          product.sale_price
        ]);
      } catch (error) {
        console.error(`❌ Error insertando producto ${product.name}:`, error.message);
      }
    }
  }

  // Insertar sesiones en la base de datos
  async insertSessions(db, sessions, storeId) {
    for (const session of sessions) {
      try {
        await db.query(`
          INSERT INTO psessions (
            linisco_id, shop_number, store_id, id_session, session_date
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (linisco_id) 
          DO UPDATE SET
            shop_number = EXCLUDED.shop_number,
            store_id = EXCLUDED.store_id,
            id_session = EXCLUDED.id_session,
            session_date = EXCLUDED.session_date,
            synced_at = CURRENT_TIMESTAMP
        `, [
          session.linisco_id,
          session.shop_number || '001',
          storeId,
          session.id_session,
          session.session_date
        ]);
      } catch (error) {
        console.error(`❌ Error insertando sesión ${session.id_session}:`, error.message);
      }
    }
  }

  // Sincronizar todas las tiendas
  async syncAllStores(fromDate, toDate, db) {
    console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
    
    const results = [];
    let totalRecords = 0;
    
    for (const store of stores) {
      try {
        const result = await this.syncStoreData(store, fromDate, toDate, db);
        results.push(result);
        totalRecords += result.orders + result.products + result.sessions;
        console.log(`✅ ${store.store_name}: ${result.orders} órdenes, ${result.products} productos, ${result.sessions} sesiones`);
      } catch (error) {
        console.error(`❌ Error en ${store.store_name}:`, error.message);
        results.push({
          store: store.store_name,
          error: error.message,
          orders: 0,
          products: 0,
          sessions: 0
        });
      }
    }
    
    return {
      success: true,
      totalRecords,
      results
    };
  }
}

export default LiniscoSyncService;
