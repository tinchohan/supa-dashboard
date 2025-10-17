const { Client } = require('pg');

class MultiStoreSyncService {
  constructor() {
    this.db = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    this.db.connect();
    console.log('🔗 Conectado a PostgreSQL en Railway');
  }

  async syncAllStores(fromDate, toDate) {
    try {
      console.log(`🔄 Iniciando sincronización desde ${fromDate} hasta ${toDate}`);
      
      const stores = [
        { store_id: '66220', store_name: 'Subway Lacroze', password: 'subway123' },
        { store_id: '66221', store_name: 'Subway Corrientes', password: 'subway123' },
        { store_id: '66222', store_name: 'Subway Ortiz', password: 'subway123' },
        { store_id: '10019', store_name: 'Daniel Lacroze', password: 'daniel123' },
        { store_id: '30038', store_name: 'Daniel Corrientes', password: 'daniel123' },
        { store_id: '10019', store_name: 'Daniel Ortiz', password: 'daniel123' },
        { store_id: '30039', store_name: 'Seitu Juramento', password: 'seitu123' }
      ];

      const results = [];
      let totalRecords = 0;

      for (const store of stores) {
        try {
          console.log(`🔄 Sincronizando ${store.store_name} (${store.store_id})...`);
          
          // Simular datos de prueba para Railway
          const mockData = this.generateMockData(store.store_id, fromDate, toDate);
          
          // Insertar órdenes
          if (mockData.orders.length > 0) {
            for (const order of mockData.orders) {
              await this.db.query(`
                INSERT INTO sale_orders (
                  linisco_id, shop_number, store_id, id_sale_order, id_customer, 
                  number, order_date, id_session, paymentmethod, total, discount
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
                  synced_at = CURRENT_TIMESTAMP
              `, [
                order.linisco_id,
                order.shop_number,
                store.store_id,
                order.id_sale_order,
                order.id_customer,
                order.number,
                order.order_date,
                order.id_session,
                order.paymentmethod,
                order.total,
                order.discount
              ]);
            }
          }

          // Insertar productos
          if (mockData.products.length > 0) {
            for (const product of mockData.products) {
              await this.db.query(`
                INSERT INTO sale_products (
                  linisco_id, shop_number, store_id, id_sale_product, id_sale_order, 
                  id_product, id_control_sheet_def, name, fixed_name, quantity, sale_price
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (linisco_id, store_id) 
                DO UPDATE SET
                  shop_number = EXCLUDED.shop_number,
                  id_sale_product = EXCLUDED.id_sale_product,
                  id_sale_order = EXCLUDED.id_sale_order,
                  id_product = EXCLUDED.id_product,
                  id_control_sheet_def = EXCLUDED.id_control_sheet_def,
                  name = EXCLUDED.name,
                  fixed_name = EXCLUDED.fixed_name,
                  quantity = EXCLUDED.quantity,
                  sale_price = EXCLUDED.sale_price,
                  synced_at = CURRENT_TIMESTAMP
              `, [
                product.linisco_id,
                product.shop_number,
                store.store_id,
                product.id_sale_product,
                product.id_sale_order,
                product.id_product,
                product.id_control_sheet_def,
                product.name,
                product.fixed_name,
                product.quantity,
                product.sale_price
              ]);
            }
          }

          const recordsProcessed = mockData.orders.length + mockData.products.length;
          totalRecords += recordsProcessed;
          
          results.push({
            store: store.store_name,
            recordsProcessed,
            orders: mockData.orders.length
          });

          console.log(`✅ ${store.store_name} completada: ${recordsProcessed} registros de ${mockData.orders.length} órdenes`);

        } catch (error) {
          console.error(`❌ Error sincronizando ${store.store_name}:`, error);
          results.push({
            store: store.store_name,
            recordsProcessed: 0,
            orders: 0,
            error: error.message
          });
        }
      }

      console.log(`📊 Sincronización completada: ${totalRecords} registros totales`);

      return {
        success: true,
        totalRecords,
        results,
        errors: results.filter(r => r.error).map(r => r.error)
      };

    } catch (error) {
      console.error('❌ Error en syncAllStores:', error);
      return {
        success: false,
        totalRecords: 0,
        results: [],
        errors: [error.message]
      };
    }
  }

  generateMockData(storeId, fromDate, toDate) {
    const orders = [];
    const products = [];
    
    // Generar algunas órdenes de prueba
    const orderCount = Math.floor(Math.random() * 10) + 1;
    
    for (let i = 0; i < orderCount; i++) {
      const orderId = Math.floor(Math.random() * 100000) + 10000;
      const orderDate = new Date(fromDate);
      orderDate.setDate(orderDate.getDate() + Math.floor(Math.random() * 7));
      
      const paymentMethods = ['cash', 'cc_pedidosyaft', 'cc_rappiol', 'cc_pedidosyaol', 'cc_visa', 'cc_mastercard'];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      
      const order = {
        linisco_id: orderId,
        shop_number: '001',
        id_sale_order: orderId,
        id_customer: Math.floor(Math.random() * 1000),
        number: orderId,
        order_date: orderDate.toISOString(),
        id_session: Math.floor(Math.random() * 1000),
        paymentmethod: paymentMethod,
        total: Math.floor(Math.random() * 50000) + 1000,
        discount: 0
      };
      
      orders.push(order);
      
      // Generar productos para esta orden
      const productCount = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < productCount; j++) {
        const productNames = ['Producto A', 'Producto B', 'Producto C', 'Producto D'];
        const productName = productNames[Math.floor(Math.random() * productNames.length)];
        
        products.push({
          linisco_id: orderId * 100 + j,
          shop_number: '001',
          id_sale_product: orderId * 100 + j,
          id_sale_order: orderId,
          id_product: Math.floor(Math.random() * 1000),
          id_control_sheet_def: Math.floor(Math.random() * 1000),
          name: productName,
          fixed_name: productName,
          quantity: Math.floor(Math.random() * 5) + 1,
          sale_price: Math.floor(Math.random() * 10000) + 500
        });
      }
    }
    
    return { orders, products };
  }
}

module.exports = MultiStoreSyncService;
