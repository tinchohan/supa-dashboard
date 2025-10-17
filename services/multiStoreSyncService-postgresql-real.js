import { Pool } from 'pg';

class MultiStoreSyncService {
  constructor(pool) {
    this.pool = pool;
  }

  async syncStoreData(storeId, password, data) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verificar credenciales de la tienda
      const storeResult = await client.query(
        'SELECT store_id, store_name FROM stores WHERE store_id = $1 AND password = $2',
        [storeId, password]
      );
      
      if (storeResult.rows.length === 0) {
        return { success: false, error: 'Credenciales inválidas' };
      }
      
      const store = storeResult.rows[0];
      console.log(`🔄 Sincronizando datos para ${store.store_name} (${storeId})`);
      
      let ordersProcessed = 0;
      let productsProcessed = 0;
      
      // Procesar órdenes
      if (data.orders && data.orders.length > 0) {
        console.log(`📦 Procesando ${data.orders.length} órdenes`);
        
        for (const order of data.orders) {
          await client.query(`
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
            order.shop_number || order.shopNumber,
            storeId,
            order.id_sale_order || order.idSaleOrder,
            order.id_customer || order.idCustomer || 0,
            order.number || 0,
            order.order_date || order.orderDate,
            order.id_session || order.idSession,
            order.paymentmethod || order.paymentMethod,
            order.total,
            order.discount || 0.0
          ]);
        }
        ordersProcessed = data.orders.length;
      }
      
      // Procesar productos
      if (data.products && data.products.length > 0) {
        console.log(`🛍️ Procesando ${data.products.length} productos`);
        
        for (const product of data.products) {
          await client.query(`
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
            product.shop_number || product.shopNumber,
            storeId,
            product.id_sale_product || product.idSaleProduct,
            product.id_sale_order || product.idSaleOrder,
            product.id_product || product.idProduct,
            product.id_control_sheet_def || product.idControlSheetDef,
            product.name,
            product.fixed_name,
            product.quantity,
            product.sale_price || product.salePrice
          ]);
        }
        productsProcessed = data.products.length;
      }
      
      await client.query('COMMIT');
      console.log(`✅ Sincronización completada para ${store.store_name}`);
      
      return {
        success: true,
        message: `Datos sincronizados correctamente para ${store.store_name}`,
        orders_processed: ordersProcessed,
        products_processed: productsProcessed
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error en sincronización:', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  async getStoreStats(storeId) {
    try {
      // Estadísticas de la tienda
      const statsResult = await this.pool.query(`
        SELECT 
          COUNT(DISTINCT so.id_sale_order) as total_orders,
          SUM(so.total - so.discount) as total_revenue,
          AVG(so.total - so.discount) as avg_order_value,
          COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
        FROM sale_orders so
        WHERE so.store_id = $1
      `, [storeId]);
      
      // Productos más vendidos
      const productsResult = await this.pool.query(`
        SELECT 
          sp.name,
          sp.fixed_name,
          COUNT(*) as times_sold,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue,
          AVG(sp.sale_price) as avg_price
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order AND sp.store_id = so.store_id
        WHERE sp.store_id = $1
        GROUP BY sp.name, sp.fixed_name
        ORDER BY total_revenue DESC
        LIMIT 10
      `, [storeId]);
      
      return {
        success: true,
        data: {
          stats: statsResult.rows[0],
          products: productsResult.rows
        }
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { success: false, error: error.message };
    }
  }
}

export default MultiStoreSyncService;
