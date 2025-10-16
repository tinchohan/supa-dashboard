// Script para inicializar la base de datos en Railway
import fetch from 'node-fetch';

const RAILWAY_URL = process.env.RAILWAY_PUBLIC_DOMAIN || 'https://supa-dashboard-production.up.railway.app';

async function initializeRailwayDatabase() {
  try {
    console.log('🔧 Inicializando base de datos en Railway...');
    console.log('🌐 URL de Railway:', RAILWAY_URL);
    
    // Hacer POST a /api/init-db
    const response = await fetch(`${RAILWAY_URL}/api/init-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Base de datos inicializada correctamente');
      console.log('📊 Tiendas insertadas:', result.stores);
      console.log('🎉 Railway está listo para usar');
    } else {
      console.error('❌ Error inicializando base de datos:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error conectando con Railway:', error.message);
    console.log('💡 Asegúrate de que Railway esté desplegado y funcionando');
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeRailwayDatabase();
}

export default initializeRailwayDatabase;
