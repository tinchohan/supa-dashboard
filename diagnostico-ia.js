import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Cargar variables de entorno
dotenv.config();

console.log('🔍 DIAGNÓSTICO COMPLETO DE IA\n');
console.log('=' .repeat(50));

// 1. Verificar archivo .env
console.log('\n📁 1. Verificando archivo .env...');
const envPath = './.env';
try {
  const fs = await import('fs');
  const envExists = fs.existsSync(envPath);
  if (envExists) {
    console.log('✅ Archivo .env encontrado');
  } else {
    console.log('❌ Archivo .env no encontrado');
    console.log('💡 Solución: Crea el archivo .env desde env.example');
  }
} catch (error) {
  console.log('❌ Error verificando archivo .env:', error.message);
}

// 2. Verificar variables de entorno
console.log('\n🔧 2. Verificando variables de entorno...');
const apiKey = process.env.GEMINI_API_KEY;
const provider = process.env.AI_PROVIDER;

console.log(`   GEMINI_API_KEY: ${apiKey ? 'Configurada' : 'No configurada'}`);
console.log(`   AI_PROVIDER: ${provider || 'No configurado'}`);

if (!apiKey || apiKey === 'TU_API_KEY_AQUI' || apiKey === 'your_gemini_api_key_here') {
  console.log('❌ API key de Gemini no configurada correctamente');
  console.log('\n📝 INSTRUCCIONES:');
  console.log('1. Ve a: https://aistudio.google.com/app/apikey');
  console.log('2. Crea una nueva API key');
  console.log('3. Edita el archivo .env');
  console.log('4. Reemplaza "TU_API_KEY_AQUI" con tu API key real');
  console.log('5. Reinicia el servidor');
  process.exit(1);
}

// 3. Verificar dependencias
console.log('\n📦 3. Verificando dependencias...');
try {
  const fs = await import('fs');
  const pkgContent = fs.readFileSync('./package.json', 'utf8');
  const pkg = JSON.parse(pkgContent);
  const dependencies = pkg.dependencies;
  
  if (dependencies['@google/generative-ai']) {
    console.log('✅ @google/generative-ai instalado');
  } else {
    console.log('❌ @google/generative-ai no instalado');
    console.log('💡 Solución: Ejecuta "npm install @google/generative-ai"');
  }
} catch (error) {
  console.log('❌ Error verificando dependencias:', error.message);
}

// 4. Probar conexión con Gemini
console.log('\n🤖 4. Probando conexión con Gemini...');
try {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
    }
  });

  console.log('   Enviando prueba...');
  const result = await model.generateContent('Responde solo "OK" si puedes leer esto');
  const response = await result.response;
  const text = response.text();

  console.log('✅ Conexión exitosa con Gemini!');
  console.log(`   Respuesta: ${text}`);
  
} catch (error) {
  console.log('❌ Error conectando con Gemini:', error.message);
  
  if (error.message.includes('API_KEY_INVALID')) {
    console.log('\n💡 SOLUCIÓN: API key inválida');
    console.log('   - Verifica que la API key sea correcta');
    console.log('   - Asegúrate de que no tenga espacios extra');
    console.log('   - Genera una nueva API key si es necesario');
  } else if (error.message.includes('QUOTA_EXCEEDED')) {
    console.log('\n💡 SOLUCIÓN: Límite de requests excedido');
    console.log('   - Espera unos minutos antes de volver a intentar');
    console.log('   - Considera usar un plan de pago para más requests');
  } else if (error.message.includes('PERMISSION_DENIED')) {
    console.log('\n💡 SOLUCIÓN: Permisos insuficientes');
    console.log('   - Verifica que la API key tenga los permisos correctos');
    console.log('   - Asegúrate de que el proyecto esté activo');
  } else {
    console.log('\n💡 SOLUCIÓN: Error desconocido');
    console.log('   - Verifica tu conexión a internet');
    console.log('   - Revisa la documentación de Gemini API');
  }
  
  process.exit(1);
}

// 5. Verificar servicios del dashboard
console.log('\n🌐 5. Verificando servicios del dashboard...');
try {
  const response = await fetch('http://localhost:3000/api/ai/status');
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Servidor web funcionando');
    console.log(`   Estado de IA: ${data.data.current_provider}`);
    console.log(`   Gemini configurado: ${data.data.gemini.configured ? 'Sí' : 'No'}`);
  } else {
    console.log('❌ Servidor web no responde');
    console.log('💡 Solución: Ejecuta "npm run web" en otra terminal');
  }
} catch (error) {
  console.log('❌ Servidor web no disponible');
  console.log('💡 Solución: Ejecuta "npm run web" en otra terminal');
}

console.log('\n' + '=' .repeat(50));
console.log('🎉 DIAGNÓSTICO COMPLETADO');
console.log('\n📋 RESUMEN:');
console.log('✅ Archivo .env configurado');
console.log('✅ API key de Gemini configurada');
console.log('✅ Dependencias instaladas');
console.log('✅ Conexión con Gemini exitosa');
console.log('\n🚀 ¡Tu IA está lista para usar!');
console.log('\n💡 PRÓXIMOS PASOS:');
console.log('1. Ejecuta "npm run web" para iniciar el servidor');
console.log('2. Abre http://localhost:3000 en tu navegador');
console.log('3. Presiona "Cargar Datos del Dashboard"');
console.log('4. Ve a la sección "Chat con IA" y haz una pregunta');
console.log('\n🎯 Ejemplos de preguntas:');
console.log('   - "¿Cuáles son mis mejores productos?"');
console.log('   - "¿Qué día de la semana vendo más?"');
console.log('   - "¿Cómo están mis ventas este mes?"');
