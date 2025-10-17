import pkg from 'pg';
const { Pool } = pkg;

class MultiStoreSyncService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/linisco_db',
      ssl: process.env.RAILWAY_ENVIRONMENT === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async syncStoreData(storeId, password, data) {
    const client = await this.pool.connect();
    
    try {
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
      
      // Procesar órdenes
      if (data.orders && data.orders.length > 0) {
        console.log(`📦 Procesando ${data.orders.length} órdenes`);
        
        for (const order of data.orders) {
          await client.query(`
            INSERT INTO sale_orders (
              linisco_id, shop_number, store_id, id_sale_order, id_customer, 
              number, order_date, id_session, payment_method, total, discount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (linisco_id) DO UPDATE SET
              shop_number = EXCLUDED.shop_number,
              store_id = EXCLUDED.store_id,
              id_sale_order = EXCLUDED.id_sale_order,
              id_customer = EXCLUDED.id_customer,
              number = EXCLUDED.number,
              order_date = EXCLUDED.order_date,
              id_session = EXCLUDED.id_session,
              payment_method = EXCLUDED.payment_method,
              total = EXCLUDED.total,
              discount = EXCLUDED.discount,
              synced_at = CURRENT_TIMESTAMP
          `, [
            order.linisco_id,
            order.shop_number,
            storeId,
            order.id_sale_order,
            order.id_customer,
            order.number,
            order.order_date,
            order.id_session,
            order.payment_method,
            order.total,
            order.discount
          ]);
        }
      }
      
      // Procesar productos
      if (data.products && data.products.length > 0) {
        console.log(`🛍️ Procesando ${data.products.length} productos`);
        
        // Eliminar productos existentes de esta tienda para evitar duplicados
        await client.query('DELETE FROM sale_products WHERE store_id = $1', [storeId]);
        
        for (const product of data.products) {
          await client.query(`
            INSERT INTO sale_products (
              linisco_id, store_id, id_sale_order, name, fixed_name, quantity, sale_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            product.linisco_id,
            storeId,
            product.id_sale_order,
            product.name,
            product.fixed_name,
            product.quantity,
            product.sale_price
          ]);
        }
      }
      
      console.log(`✅ Sincronización completada para ${store.store_name}`);
      
      return {
        success: true,
        message: `Datos sincronizados correctamente para ${store.store_name}`,
        orders_processed: data.orders ? data.orders.length : 0,
        products_processed: data.products ? data.products.length : 0
      };
      
    } catch (error) {
      console.error('Error en sincronización:', error);
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }

  async getStoreStats(storeId) {
    const client = await this.pool.connect();
    
    try {
      // Estadísticas de la tienda
      const statsResult = await client.query(`
        SELECT 
          COUNT(DISTINCT so.linisco_id) as total_orders,
          SUM(so.total - so.discount) as total_revenue,
          AVG(so.total - so.discount) as avg_order_value,
          COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
        FROM sale_orders so
        WHERE so.store_id = $1
      `, [storeId]);
      
      // Productos más vendidos
      const productsResult = await client.query(`
        SELECT 
          sp.name,
          sp.fixed_name,
          COUNT(*) as times_sold,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue,
          AVG(sp.sale_price) as avg_price
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
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
    } finally {
      client.release();
    }
  }
}

export default MultiStoreSyncService;
