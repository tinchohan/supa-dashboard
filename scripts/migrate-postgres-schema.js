import { db as postgresDb } from '../config/database-postgres-clean.js';

async function migratePostgresSchema() {
  try {
    console.log('🔄 Iniciando migración del esquema PostgreSQL...');
    
    // Verificar si la tabla sale_products existe y tiene la estructura correcta
    const tableInfo = await postgresDb.prepare(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sale_products' 
      AND table_schema = 'public'
    `).all();
    
    console.log('📊 Estructura actual de sale_products:', tableInfo);
    
    // Verificar si id_sale_order es TEXT
    const idSaleOrderColumn = tableInfo.find(col => col.column_name === 'id_sale_order');
    if (idSaleOrderColumn && idSaleOrderColumn.data_type !== 'text') {
      console.log('🔧 Actualizando id_sale_order a TEXT...');
      await postgresDb.prepare(`
        ALTER TABLE sale_products 
        ALTER COLUMN id_sale_order TYPE TEXT
      `).run();
      console.log('✅ id_sale_order actualizado a TEXT');
    } else {
      console.log('✅ id_sale_order ya es TEXT');
    }
    
    // Verificar si la tabla sale_orders tiene las columnas correctas
    const ordersTableInfo = await postgresDb.prepare(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sale_orders' 
      AND table_schema = 'public'
    `).all();
    
    console.log('📊 Estructura actual de sale_orders:', ordersTableInfo);
    
    // Eliminar columnas que no existen en el esquema simplificado
    const columnsToRemove = ['id_sale_order', 'id_session'];
    for (const column of columnsToRemove) {
      const columnExists = ordersTableInfo.find(col => col.column_name === column);
      if (columnExists) {
        console.log(`🔧 Eliminando columna ${column}...`);
        try {
          await postgresDb.prepare(`ALTER TABLE sale_orders DROP COLUMN ${column}`).run();
          console.log(`✅ Columna ${column} eliminada`);
        } catch (error) {
          console.log(`⚠️ No se pudo eliminar ${column}:`, error.message);
        }
      }
    }
    
    console.log('✅ Migración completada');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  }
}

// Ejecutar migración si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePostgresSchema()
    .then(() => {
      console.log('🎉 Migración exitosa');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

export default migratePostgresSchema;
