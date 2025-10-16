import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

console.log('🔧 Configurando entorno para Railway...');

// Verificar si estamos en Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;

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
