import SqliteService from './src/services/sqliteService.js';
import SqliteSyncService from './src/services/sqliteSyncService.js';
import { getActiveUsers } from './src/config/users.js';

async function testSqlite() {
  console.log('🧪 Iniciando pruebas de SQLite...\n');

  try {
    // Test 1: Conectar a SQLite
    console.log('1️⃣ Probando conexión a SQLite...');
    const dbService = new SqliteService();
    const connected = await dbService.connect();
    
    if (connected) {
      console.log('✅ Conexión a SQLite exitosa');
    } else {
      console.log('❌ Error conectando a SQLite');
      return;
    }

    // Test 2: Crear tablas
    console.log('\n2️⃣ Probando creación de tablas...');
    const tablesCreated = await dbService.createTables();
    
    if (tablesCreated) {
      console.log('✅ Tablas creadas correctamente');
    } else {
      console.log('❌ Error creando tablas');
      return;
    }

    // Test 3: Sincronizar usuarios
    console.log('\n3️⃣ Probando sincronización de usuarios...');
    const users = getActiveUsers();
    for (const user of users) {
      const result = await dbService.syncUser(user);
      if (result.success) {
        console.log(`✅ Usuario sincronizado: ${user.email}`);
      } else {
        console.log(`❌ Error sincronizando usuario ${user.email}: ${result.error}`);
      }
    }

    // Test 4: Probar datos de muestra
    console.log('\n4️⃣ Probando datos de muestra...');
    const mockOrders = [
      {
        id: 'TEST001',
        store_id: '63953',
        order_number: 'ORD001',
        order_date: '2025-01-17T10:30:00Z',
        payment_method: 'cash',
        total: 1500,
        discount: 0,
        customer_name: 'Cliente Test'
      }
    ];

    const ordersResult = await dbService.syncSaleOrders(mockOrders, 'test@linisco.com.ar');
    if (ordersResult.success) {
      console.log(`✅ Órdenes de prueba sincronizadas: ${ordersResult.synced}`);
    } else {
      console.log(`❌ Error sincronizando órdenes: ${ordersResult.error}`);
    }

    // Test 5: Obtener estadísticas
    console.log('\n5️⃣ Probando obtención de estadísticas...');
    const statsResult = await dbService.getStatsFromDB('2025-01-01', '2025-12-31');
    if (statsResult.success) {
      console.log('✅ Estadísticas obtenidas correctamente');
      console.log(`   - Total órdenes: ${statsResult.data.totalOrders}`);
      console.log(`   - Ingresos totales: $${statsResult.data.totalRevenue.toLocaleString()}`);
    } else {
      console.log(`❌ Error obteniendo estadísticas: ${statsResult.error}`);
    }

    // Test 6: Probar servicio de sincronización
    console.log('\n6️⃣ Probando servicio de sincronización...');
    const syncService = new SqliteSyncService();
    const syncInitialized = await syncService.initialize();
    
    if (syncInitialized) {
      console.log('✅ Servicio de sincronización inicializado');
    } else {
      console.log('❌ Error inicializando servicio de sincronización');
    }

    // Test 7: Estado de sincronización
    console.log('\n7️⃣ Probando estado de sincronización...');
    const statusResult = await syncService.getSyncStatus();
    if (statusResult.success) {
      console.log('✅ Estado de sincronización obtenido');
      console.log(`   - Usuarios configurados: ${statusResult.data.users.length}`);
    } else {
      console.log(`❌ Error obteniendo estado: ${statusResult.error}`);
    }

    // Cerrar conexión
    await dbService.close();
    console.log('\n✅ Pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar pruebas
testSqlite();
