// Script para probar con fechas reales y encontrar datos
import axios from 'axios';

async function testRealDates() {
  console.log('📅 Probando fechas reales para encontrar datos...\n');

  try {
    // Probar con diferentes rangos de fechas
    const dateRanges = [
      { from: '2025-10-01', to: '2025-10-19', name: 'Octubre 2025' },
      { from: '2025-09-01', to: '2025-09-30', name: 'Septiembre 2025' },
      { from: '2025-08-01', to: '2025-08-31', name: 'Agosto 2025' },
      { from: '2025-07-01', to: '2025-07-31', name: 'Julio 2025' },
      { from: '2025-06-01', to: '2025-06-30', name: 'Junio 2025' },
      { from: '2025-05-01', to: '2025-05-31', name: 'Mayo 2025' },
      { from: '2025-04-01', to: '2025-04-30', name: 'Abril 2025' },
      { from: '2025-03-01', to: '2025-03-31', name: 'Marzo 2025' },
      { from: '2025-02-01', to: '2025-02-28', name: 'Febrero 2025' },
      { from: '2025-01-01', to: '2025-01-31', name: 'Enero 2025' },
      { from: '2024-12-01', to: '2024-12-31', name: 'Diciembre 2024' },
      { from: '2024-11-01', to: '2024-11-30', name: 'Noviembre 2024' },
      { from: '2024-10-01', to: '2024-10-31', name: 'Octubre 2024' }
    ];

    for (const range of dateRanges) {
      console.log(`🔍 Probando ${range.name} (${range.from} a ${range.to})...`);
      
      try {
        const response = await axios.get('https://pos.linisco.com.ar/sale_orders', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-User-Email': '63953@linisco.com.ar',
            'X-User-Token': 'BzvprAnMA8ckJ_G9Y7uz', // Token del test anterior
            'User-Agent': 'vscode-restclient'
          },
          data: {
            fromDate: range.from,
            toDate: range.to
          },
          timeout: 15000
        });

        if (response.data && response.data.length > 0) {
          console.log(`✅ ¡Datos encontrados en ${range.name}!`);
          console.log(`   - Órdenes: ${response.data.length}`);
          console.log(`   - Primera orden:`, JSON.stringify(response.data[0], null, 2));
          console.log(`   - Última orden:`, JSON.stringify(response.data[response.data.length - 1], null, 2));
          
          // Calcular totales
          const totalRevenue = response.data.reduce((sum, order) => sum + (order.total || 0), 0);
          console.log(`   - Ingresos totales: $${totalRevenue.toLocaleString()}`);
          
          console.log(`\n🎯 Fechas con datos reales: ${range.from} a ${range.to}`);
          return range;
        } else {
          console.log(`   - Sin datos para ${range.name}`);
        }
      } catch (error) {
        console.log(`   - Error en ${range.name}: ${error.message}`);
      }
      
      // Pausa entre requests para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n❌ No se encontraron datos en ningún rango de fechas probado');
    console.log('💡 Posibles causas:');
    console.log('   - Las fechas están en formato incorrecto');
    console.log('   - No hay datos en el sistema de Linisco');
    console.log('   - Las credenciales no tienen acceso a datos históricos');
    console.log('   - El endpoint requiere un formato de fecha diferente');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

testRealDates();

