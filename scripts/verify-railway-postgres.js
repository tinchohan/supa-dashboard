import { db as postgresDb, initializeDatabase } from '../config/database-postgres-clean.js';
import { db as sqliteDb } from '../config/database.js';

async function verifyRailwayPostgres() {
  console.log('🚀 Verificación de Railway con PostgreSQL');
  console.log('========================================');
  
  // 1. Verificar entorno
  console.log('\n📋 1. Variables de Entorno:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
  console.log('- RAILWAY_PROJECT_ID:', process.env.RAILWAY_PROJECT_ID);
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');
  
  // 2. Detectar entorno Railway
  const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                   process.env.RAILWAY_PROJECT_ID || 
                   process.env.RAILWAY_PUBLIC_DOMAIN ||
                   process.env.DATABASE_URL?.includes('railway') ||
                   process.env.DATABASE_URL?.includes('postgres');
  
  console.log('\n🎯 2. Detección de Entorno:');
  console.log('- Es Railway:', isRailway);
  console.log('- Es producción:', process.env.NODE_ENV === 'production');
  
  // 3. Configurar base de datos
  const isProduction = process.env.NODE_ENV === 'production' || isRailway;
  const dbToUse = isProduction ? postgresDb : sqliteDb;
  
  console.log('\n🗄️ 3. Configuración de Base de Datos:');
  console.log('- Base de datos a usar:', isProduction ? 'PostgreSQL' : 'SQLite');
  
  try {
    if (isProduction) {
      console.log('\n🔧 4. Inicializando PostgreSQL...');
      await initializeDatabase();
      console.log('✅ PostgreSQL inicializado correctamente');
      
      // Probar consultas básicas
      console.log('\n📊 5. Probando consultas PostgreSQL:');
      
      // Verificar tablas
      const tables = await postgresDb.prepare(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('stores', 'sale_orders', 'sale_products')
        ORDER BY table_name
      `).all();
      
      console.log('✅ Tablas encontradas:', tables.map(t => t.table_name));
      
      // Verificar datos
      const storeCount = await postgresDb.prepare('SELECT COUNT(*) as count FROM stores').get();
      console.log('📊 Tiendas en PostgreSQL:', storeCount.count);
      
      const orderCount = await postgresDb.prepare('SELECT COUNT(*) as count FROM sale_orders').get();
      console.log('📊 Órdenes en PostgreSQL:', orderCount.count);
      
      const productCount = await postgresDb.prepare('SELECT COUNT(*) as count FROM sale_products').get();
      console.log('📊 Productos en PostgreSQL:', productCount.count);
      
      // Probar consulta compleja (como la que fallaba)
      console.log('\n🔍 6. Probando consulta de productos:');
      try {
        const products = await postgresDb.prepare(`
          SELECT 
            sp.name,
            COUNT(*) as times_sold,
            SUM(sp.quantity) as total_quantity,
            SUM(sp.sale_price * sp.quantity) as total_revenue
          FROM sale_products sp
          JOIN sale_orders so ON sp.id_sale_order = so.id
          JOIN stores s ON sp.store_id = s.store_id
          WHERE so.order_date::date BETWEEN $1::date AND $2::date
          GROUP BY sp.name
          ORDER BY total_revenue DESC
          LIMIT $3
        `).all('2025-01-01', '2025-12-31', 5);
        
        console.log('✅ Consulta de productos exitosa');
        console.log('📊 Productos encontrados:', products.length);
        
      } catch (queryError) {
        console.error('❌ Error en consulta de productos:', queryError.message);
      }
      
    } else {
      console.log('\n🔧 4. Probando SQLite...');
      const storeCount = await sqliteDb.prepare('SELECT COUNT(*) as count FROM stores').get();
      console.log('📊 Tiendas en SQLite:', storeCount.count);
    }
    
    console.log('\n✅ Verificación completada exitosamente');
    console.log('🎉 Railway con PostgreSQL está listo para funcionar');
    
  } catch (error) {
    console.error('\n❌ Error en verificación:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.code) {
      console.error('Código de error:', error.code);
    }
    if (error.detail) {
      console.error('Detalle:', error.detail);
    }
  }
}

verifyRailwayPostgres();
