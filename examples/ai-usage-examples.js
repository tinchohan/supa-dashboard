/**
 * Ejemplos de uso de las funcionalidades de IA
 * Este archivo muestra cómo usar las nuevas APIs de IA
 */

// Ejemplo 1: Análisis de patrones
async function ejemploAnalisisPatrones() {
    console.log('🔍 Ejemplo: Análisis de Patrones');
    
    const response = await fetch('/api/ai/patterns?fromDate=2025-01-01&toDate=2025-01-31');
    const data = await response.json();
    
    if (data.success) {
        console.log('📊 Patrones encontrados:');
        console.log('- Mejor día:', data.data.insights[0]?.message);
        console.log('- Horario pico:', data.data.insights[1]?.message);
        console.log('- Producto estrella:', data.data.insights[2]?.message);
    }
}

// Ejemplo 2: Predicciones
async function ejemploPredicciones() {
    console.log('🔮 Ejemplo: Predicciones');
    
    const response = await fetch('/api/ai/predictions?fromDate=2025-01-01&toDate=2025-01-31');
    const data = await response.json();
    
    if (data.success) {
        console.log('📈 Predicciones:');
        console.log('- Tendencia:', data.data.message);
        console.log('- Confianza:', data.data.confidence + '%');
        console.log('- Próximos 3 días:');
        data.data.predictions.slice(0, 3).forEach(pred => {
            console.log(`  ${pred.date}: $${pred.predictedRevenue.toLocaleString()}`);
        });
    }
}

// Ejemplo 3: Recomendaciones
async function ejemploRecomendaciones() {
    console.log('🎯 Ejemplo: Recomendaciones');
    
    const response = await fetch('/api/ai/recommendations?fromDate=2025-01-01&toDate=2025-01-31');
    const data = await response.json();
    
    if (data.success) {
        console.log('💡 Recomendaciones:');
        data.data.forEach(rec => {
            console.log(`- ${rec.title}: ${rec.description}`);
            console.log(`  Acción: ${rec.action}`);
        });
    }
}

// Ejemplo 4: Chat con IA
async function ejemploChat() {
    console.log('💬 Ejemplo: Chat con IA');
    
    const consultas = [
        '¿Cuáles son mis productos más vendidos?',
        '¿Cómo van mis ventas comparado con el mes pasado?',
        '¿Qué días de la semana vendo más?',
        'Muéstrame el análisis de métodos de pago'
    ];
    
    for (const consulta of consultas) {
        console.log(`\n🤖 Consulta: "${consulta}"`);
        
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: consulta,
                fromDate: '2025-01-01',
                toDate: '2025-01-31',
                userId: 'ejemplo'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Respuesta: ${data.data.message.substring(0, 100)}...`);
        } else {
            console.log(`❌ Error: ${data.error}`);
        }
    }
}

// Ejemplo 5: Análisis completo
async function ejemploAnalisisCompleto() {
    console.log('🚀 Ejemplo: Análisis Completo con IA');
    
    try {
        // 1. Obtener patrones
        const patternsResponse = await fetch('/api/ai/patterns?fromDate=2025-01-01&toDate=2025-01-31');
        const patterns = await patternsResponse.json();
        
        // 2. Obtener predicciones
        const predictionsResponse = await fetch('/api/ai/predictions?fromDate=2025-01-01&toDate=2025-01-31');
        const predictions = await predictionsResponse.json();
        
        // 3. Obtener recomendaciones
        const recommendationsResponse = await fetch('/api/ai/recommendations?fromDate=2025-01-01&toDate=2025-01-31');
        const recommendations = await recommendationsResponse.json();
        
        // 4. Generar reporte
        console.log('\n📋 REPORTE INTELIGENTE DE VENTAS');
        console.log('================================');
        
        if (patterns.success) {
            console.log('\n🔍 INSIGHTS AUTOMÁTICOS:');
            patterns.data.insights.forEach(insight => {
                console.log(`• ${insight.title}: ${insight.message}`);
                console.log(`  💡 ${insight.recommendation}`);
            });
        }
        
        if (predictions.success) {
            console.log('\n🔮 PREDICCIONES:');
            console.log(`• Tendencia: ${predictions.data.message}`);
            console.log(`• Confianza: ${predictions.data.confidence}%`);
        }
        
        if (recommendations.success) {
            console.log('\n🎯 RECOMENDACIONES:');
            recommendations.data.forEach(rec => {
                console.log(`• ${rec.title}: ${rec.description}`);
                console.log(`  📝 ${rec.action}`);
            });
        }
        
        console.log('\n✨ Análisis completado con IA!');
        
    } catch (error) {
        console.error('❌ Error en análisis completo:', error);
    }
}

// Función principal para ejecutar todos los ejemplos
async function ejecutarEjemplos() {
    console.log('🤖 EJEMPLOS DE USO DE IA EN LINISCO DASHBOARD');
    console.log('===============================================\n');
    
    await ejemploAnalisisPatrones();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploPredicciones();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploRecomendaciones();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploChat();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await ejemploAnalisisCompleto();
}

// Exportar funciones para uso en otros archivos
export {
    ejemploAnalisisPatrones,
    ejemploPredicciones,
    ejemploRecomendaciones,
    ejemploChat,
    ejemploAnalisisCompleto,
    ejecutarEjemplos
};

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    ejecutarEjemplos();
}

