import fs from 'fs';
import path from 'path';

console.log('🔧 Configurador de Gemini API');
console.log('================================');

// Verificar si existe .env
const envPath = '.env';
const envExists = fs.existsSync(envPath);

if (envExists) {
    console.log('✅ Archivo .env encontrado');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    // Verificar si ya tiene GEMINI_API_KEY
    if (envContent.includes('GEMINI_API_KEY=')) {
        console.log('🔑 GEMINI_API_KEY ya está configurado en .env');
        
        // Verificar si tiene valor real
        const keyMatch = envContent.match(/GEMINI_API_KEY=(.+)/);
        if (keyMatch && keyMatch[1] && keyMatch[1] !== 'your_gemini_api_key_here') {
            console.log('✅ API Key de Gemini configurada correctamente');
            console.log('🎉 ¡Gemini debería funcionar!');
        } else {
            console.log('⚠️  GEMINI_API_KEY está configurado pero sin valor real');
            console.log('📝 Necesitas editar .env y agregar tu API key real');
        }
    } else {
        console.log('❌ GEMINI_API_KEY no encontrado en .env');
        console.log('📝 Necesitas agregar la configuración de Gemini');
    }
} else {
    console.log('❌ Archivo .env no encontrado');
    console.log('📝 Necesitas crear el archivo .env con la configuración');
}

console.log('\n📋 Pasos para configurar Gemini:');
console.log('1. Obtén tu API key de Gemini: https://makersuite.google.com/app/apikey');
console.log('2. Crea/edita el archivo .env en la raíz del proyecto');
console.log('3. Agrega esta línea: GEMINI_API_KEY=tu_api_key_aqui');
console.log('4. Reinicia el servidor con: npm run web');
console.log('\n💡 Ejemplo de .env:');
console.log('GEMINI_API_KEY=AIzaSyC...tu_api_key_aqui');
console.log('GEMINI_MODEL=gemini-2.5-flash');
console.log('GEMINI_TEMPERATURE=0.7');
console.log('GEMINI_MAX_TOKENS=2048');
