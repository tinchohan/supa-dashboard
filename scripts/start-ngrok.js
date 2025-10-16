#!/usr/bin/env node

/**
 * Script para iniciar el dashboard con ngrok
 * Expone el servidor web a través de un túnel público
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('🚀 Iniciando Dashboard Linisco con IA + ngrok...\n');

// Función para iniciar el servidor web
function startWebServer() {
    console.log('📡 Iniciando servidor web en puerto 3000...');
    
    const webServer = spawn('node', ['web/server.js'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true
    });

    webServer.on('error', (error) => {
        console.error('❌ Error iniciando servidor web:', error);
    });

    return webServer;
}

// Función para iniciar ngrok
function startNgrok() {
    console.log('🌐 Iniciando túnel ngrok...');
    
    // Esperar un poco para que el servidor web se inicie
    setTimeout(() => {
        const ngrok = spawn('ngrok', ['http', '3000'], {
            stdio: 'inherit',
            shell: true
        });

        ngrok.on('error', (error) => {
            console.error('❌ Error iniciando ngrok:', error);
            console.log('💡 Asegúrate de que ngrok esté instalado: npm install -g ngrok');
        });

        ngrok.on('close', (code) => {
            console.log(`\n🔴 ngrok terminado con código: ${code}`);
        });

        return ngrok;
    }, 3000);
}

// Función para mostrar información útil
function showInfo() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DASHBOARD LINISCO CON IA EXPUESTO VÍA NGROK');
    console.log('='.repeat(60));
    console.log('📊 Dashboard: http://localhost:3000');
    console.log('🌐 Túnel público: Se mostrará en la consola de ngrok');
    console.log('🤖 Funcionalidades de IA disponibles:');
    console.log('   • Chat con IA para consultas en lenguaje natural');
    console.log('   • Análisis inteligente de patrones de ventas');
    console.log('   • Predicciones basadas en datos históricos');
    console.log('   • Recomendaciones para optimizar el negocio');
    console.log('   • Visualizaciones automáticas con gráficos');
    console.log('\n💡 Para detener: Ctrl+C');
    console.log('📱 Accede desde cualquier dispositivo usando la URL de ngrok');
    console.log('='.repeat(60) + '\n');
}

// Manejar señales de terminación
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor y ngrok...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo servidor y ngrok...');
    process.exit(0);
});

// Iniciar todo
try {
    showInfo();
    
    // Iniciar servidor web
    const webServer = startWebServer();
    
    // Iniciar ngrok después de un delay
    const ngrok = startNgrok();
    
    // Manejar errores
    process.on('uncaughtException', (error) => {
        console.error('❌ Error no manejado:', error);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Error iniciando el sistema:', error);
    process.exit(1);
}

