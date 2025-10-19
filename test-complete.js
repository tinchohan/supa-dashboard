import SqliteService from './src/services/sqliteService.js';
import SqliteSyncService from './src/services/sqliteSyncService.js';
import AiService from './src/services/aiService.js';
import { getActiveUsers } from './src/config/users.js';

async function testCompleteSystem() {
  console.log('🧪 Iniciando pruebas completas del sistema...\n');

  try {
    // Test 1: SQLite
    console.log('1️⃣ Probando SQLite...');
    const dbService = new SqliteService();
    const connected = await dbService.connect();
    
    if (connected) {
      console.log('✅ SQLite conectado');
      await dbService.createTables();
      console.log('✅ Tablas creadas');
    } else {
      console.log('❌ Error con SQLite');
      return;
    }

    // Test 2: Sincronización
    console.log('\n2️⃣ Probando sincronización...');
    const syncService = new SqliteSyncService();
    const syncInitialized = await syncService.initialize();
    
    if (syncInitialized) {
      console.log('✅ Servicio de sincronización inicializado');
    } else {
      console.log('❌ Error inicializando sincronización');
    }

    // Test 3: IA
    console.log('\n3️⃣ Probando IA...');
    const aiService = new AiService();
    
    if (aiService.isConfigured()) {
      console.log('✅ API de Gemini configurada');
      
      const testResult = await aiService.testConnection();
      if (testResult.success) {
        console.log('✅ Conexión con Gemini exitosa');
      } else {
        console.log('⚠️ Error con Gemini:', testResult.error);
      }
    } else {
      console.log('⚠️ API de Gemini no configurada (GEMINI_API_KEY)');
    }

    // Test 4: Datos de muestra
    console.log('\n4️⃣ Probando datos de muestra...');
    const mockStats = {
      totalOrders: 150,
      totalRevenue: 45000,
      averageOrderValue: 300,
      storeBreakdown: [
        { store_id: '63953', order_count: 50, total_amount: 15000 },
        { store_id: '66220', order_count: 40, total_amount: 12000 },
        { store_id: '72267', order_count: 60, total_amount: 18000 }
      ],
      paymentBreakdown: [
        { payment_category: 'Efectivo', order_count: 80, total_amount: 24000 },
        { payment_category: 'Apps', order_count: 70, total_amount: 21000 }
      ],
      topProducts: [
        { name: 'Sub de Pollo', total_revenue: 15000 },
        { name: 'Sub de Carne', total_revenue: 12000 },
        { name: 'Combo Familiar', total_revenue: 18000 }
      ]
    };

    // Test 5: Chat con IA (si está configurado)
    if (aiService.isConfigured()) {
      console.log('\n5️⃣ Probando chat con IA...');
      const chatResult = await aiService.generateResponse('¿Cuáles son los insights principales de estos datos?', mockStats);
      
      if (chatResult.success) {
        console.log('✅ Chat funcionando');
        console.log('Respuesta:', chatResult.response.substring(0, 100) + '...');
      } else {
        console.log('❌ Error en chat:', chatResult.error);
      }
    }

    // Test 6: Análisis de tendencias
    if (aiService.isConfigured()) {
      console.log('\n6️⃣ Probando análisis de tendencias...');
      const analysisResult = await aiService.analyzeTrends(mockStats);
      
      if (analysisResult.success) {
        console.log('✅ Análisis funcionando');
        console.log('Análisis:', analysisResult.response.substring(0, 100) + '...');
      } else {
        console.log('❌ Error en análisis:', analysisResult.error);
      }
    }

    // Cerrar conexiones
    await dbService.close();
    console.log('\n✅ Pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
}

// Ejecutar pruebas
testCompleteSystem();
