import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MultiStoreSyncService {
  constructor() {
    // Usar SQLite pero con la interfaz de PostgreSQL
    this.db = new Database(path.join(__dirname, '../data/linisco.db'));
  }

  async syncStoreData(storeId, password, data) {
    try {
      // Verificar credenciales de la tienda
      const store = this.db.prepare(
        'SELECT store_id, store_name FROM stores WHERE store_id = ? AND password = ?'
      ).get(storeId, password);
      
      if (!store) {
        return { success: false, error: 'Credenciales inválidas' };
      }
      
      console.log(`🔄 Sincronizando datos para ${store.store_name} (${storeId})`);
      
      // Procesar órdenes
      if (data.orders && data.orders.length > 0) {
        console.log(`📦 Procesando ${data.orders.length} órdenes`);
        
        for (const order of data.orders) {
          this.db.prepare(`
            INSERT OR REPLACE INTO sale_orders (
              linisco_id, shop_number, store_id, id_sale_order, id_customer, 
              number, order_date, id_session, payment_method, total, discount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
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
          );
        }
      }
      
      // Procesar productos
      if (data.products && data.products.length > 0) {
        console.log(`🛍️ Procesando ${data.products.length} productos`);
        
        // Eliminar productos existentes de esta tienda para evitar duplicados
        this.db.prepare('DELETE FROM sale_products WHERE store_id = ?').run(storeId);
        
        for (const product of data.products) {
          this.db.prepare(`
            INSERT INTO sale_products (
              linisco_id, shop_number, store_id, id_sale_product, id_sale_order, name, fixed_name, quantity, sale_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            product.linisco_id,
            product.shop_number || '001', // Usar shop_number del producto o '001' por defecto
            storeId,
            product.id_sale_product || product.linisco_id, // Usar id_sale_product o linisco_id
            product.id_sale_order,
            product.name,
            product.fixed_name,
            product.quantity,
            product.sale_price
          );
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
    }
  }

  async getStoreStats(storeId) {
    try {
      // Estadísticas de la tienda
      const stats = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT so.linisco_id) as total_orders,
          SUM(so.total - so.discount) as total_revenue,
          AVG(so.total - so.discount) as avg_order_value,
          COUNT(DISTINCT DATE(so.order_date)) as days_with_sales
        FROM sale_orders so
        WHERE so.store_id = ?
      `).get(storeId);
      
      // Productos más vendidos
      const products = this.db.prepare(`
        SELECT 
          sp.name,
          sp.fixed_name,
          COUNT(*) as times_sold,
          SUM(sp.quantity) as total_quantity,
          SUM(sp.sale_price * sp.quantity) as total_revenue,
          AVG(sp.sale_price) as avg_price
        FROM sale_products sp
        JOIN sale_orders so ON sp.id_sale_order = so.linisco_id
        WHERE sp.store_id = ?
        GROUP BY sp.name, sp.fixed_name
        ORDER BY total_revenue DESC
        LIMIT 10
      `).all(storeId);
      
      return {
        success: true,
        data: {
          stats: stats,
          products: products
        }
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { success: false, error: error.message };
    }
  }
}

export default MultiStoreSyncService;
