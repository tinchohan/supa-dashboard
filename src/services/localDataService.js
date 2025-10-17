import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LocalDataService {
  constructor() {
    this.dataPath = path.join(__dirname, '../data/sample-data.json');
    this.data = this.loadData();
  }

  loadData() {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error cargando datos locales:', error);
      return { stores: [], sample_orders: [], sample_products: [] };
    }
  }

  // Obtener tiendas
  getStores() {
    return this.data.stores;
  }

  // Obtener estadísticas generales
  getStats(fromDate, toDate, storeId = null) {
    const orders = this.filterOrdersByDateAndStore(fromDate, toDate, storeId);
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total - order.discount), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Desglose por método de pago
    const paymentBreakdown = this.getPaymentBreakdown(orders);

    // Top 5 productos
    const topProducts = this.getTopProducts(orders);

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

  // Filtrar órdenes por fecha y tienda
  filterOrdersByDateAndStore(fromDate, toDate, storeId) {
    return this.data.sample_orders.filter(order => {
      const orderDate = new Date(order.order_date);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      
      const dateMatch = orderDate >= from && orderDate <= to;
      const storeMatch = !storeId || storeId.length === 0 || storeId.includes(order.store_id);
      
      return dateMatch && storeMatch;
    });
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
      breakdown[category].total_amount += (order.total - order.discount);
    });

    return Object.entries(breakdown).map(([category, data]) => ({
      payment_category: category,
      order_count: data.order_count,
      total_amount: data.total_amount
    }));
  }

  // Top productos
  getTopProducts(orders) {
    const productStats = {};
    
    orders.forEach(order => {
      order.products.forEach(product => {
        const key = `${product.name}_${order.store_id}`;
        if (!productStats[key]) {
          productStats[key] = {
            name: product.name,
            times_sold: 0,
            total_revenue: 0,
            store_id: order.store_id
          };
        }
        
        productStats[key].times_sold += product.quantity;
        productStats[key].total_revenue += product.sale_price * product.quantity;
      });
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
        const store = this.data.stores.find(s => s.store_id === order.store_id);
        storeStats[order.store_id] = {
          store_name: store ? store.store_name : `Tienda ${order.store_id}`,
          order_count: 0,
          total_amount: 0
        };
      }
      
      storeStats[order.store_id].order_count++;
      storeStats[order.store_id].total_amount += (order.total - order.discount);
    });

    return Object.values(storeStats)
      .sort((a, b) => b.total_amount - a.total_amount);
  }

  // Sincronizar datos locales con PostgreSQL
  async syncToPostgreSQL(db) {
    try {
      console.log('🔄 Sincronizando datos locales a PostgreSQL...');
      
      // Insertar órdenes
      for (const order of this.data.sample_orders) {
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
          '001',
          order.store_id,
          order.id_sale_order,
          null,
          order.id_sale_order,
          order.order_date,
          null,
          order.paymentmethod,
          order.total,
          order.discount,
          null
        ]);

        // Insertar productos
        for (const product of order.products) {
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
            order.linisco_id,
            '001',
            order.store_id,
            order.linisco_id,
            order.id_sale_order,
            product.name,
            product.name,
            product.quantity,
            product.sale_price
          ]);
        }
      }

      console.log('✅ Datos locales sincronizados a PostgreSQL');
      return { success: true, message: 'Datos locales sincronizados correctamente' };
      
    } catch (error) {
      console.error('❌ Error sincronizando datos locales:', error);
      throw error;
    }
  }
}

export default LocalDataService;
