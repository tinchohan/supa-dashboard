// Railway Startup Script
// Este script se ejecuta al iniciar la aplicación en Railway

import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('🚀 Iniciando aplicación en Railway...');
console.log('====================================');

// Verificar variables críticas
const criticalVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'PORT': process.env.PORT,
  'DATABASE_URL': process.env.DATABASE_URL
};

console.log('\n📋 Variables Críticas:');
Object.entries(criticalVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? (key === 'DATABASE_URL' ? 'Configurada' : value) : 'No configurada';
  console.log(`${status} ${key}: ${displayValue}`);
});

// Detectar entorno Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                  process.env.RAILWAY_PROJECT_ID || 
                  process.env.RAILWAY_PUBLIC_DOMAIN ||
                  process.env.DATABASE_URL?.includes('railway') ||
                  process.env.DATABASE_URL?.includes('postgres') ||
                  process.env.DATABASE_URL?.includes('postgresql');

console.log('\n🎯 Configuración de Entorno:');
console.log('- Es Railway:', isRailway);
console.log('- Es producción:', process.env.NODE_ENV === 'production');

// Configurar variables por defecto si es necesario
if (isRailway) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('✅ NODE_ENV configurado como production');
  }
  
  if (!process.env.PORT) {
    process.env.PORT = '3000';
    console.log('✅ PORT configurado como 3000');
  }
  
  console.log('🎉 Configuración de Railway completada');
} else {
  console.log('ℹ️  No es entorno Railway - usando configuración local');
}

console.log('\n✅ Railway startup completado');
console.log('🚀 Aplicación lista para funcionar');

export default {};
