import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('🔧 Configurando entorno para Railway...');

// Verificar si estamos en Railway (múltiples indicadores)
const isRailway = process.env.RAILWAY_ENVIRONMENT || 
                  process.env.RAILWAY_PROJECT_ID || 
                  process.env.RAILWAY_PUBLIC_DOMAIN ||
                  process.env.DATABASE_URL?.includes('railway') ||
                  process.env.DATABASE_URL?.includes('postgres') ||
                  process.env.DATABASE_URL?.includes('postgresql');

console.log('🔍 Detectando entorno...');
console.log('- RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('- RAILWAY_PROJECT_ID:', process.env.RAILWAY_PROJECT_ID);
console.log('- RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
console.log('- DATABASE_URL contiene railway:', process.env.DATABASE_URL?.includes('railway'));
console.log('- DATABASE_URL contiene postgres:', process.env.DATABASE_URL?.includes('postgres'));
console.log('- DATABASE_URL contiene postgresql:', process.env.DATABASE_URL?.includes('postgresql'));
console.log('- NODE_ENV:', process.env.NODE_ENV);

if (isRailway) {
  console.log('✅ Detectado entorno Railway');
  
  // Configurar variables por defecto si no existen
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
    console.log('✅ NODE_ENV configurado como production');
  }
  
  if (!process.env.PORT) {
    process.env.PORT = '3000';
    console.log('✅ PORT configurado como 3000');
  }
  
  // Verificar DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('✅ DATABASE_URL encontrada');
    console.log('🔗 URL de base de datos:', process.env.DATABASE_URL.substring(0, 20) + '...');
  } else {
    console.log('⚠️  DATABASE_URL no encontrada');
    console.log('🔧 Variables disponibles:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')));
  }
  
  console.log('🎉 Configuración de Railway completada');
} else {
  console.log('ℹ️  No es entorno Railway - usando configuración local');
}

export default {};
