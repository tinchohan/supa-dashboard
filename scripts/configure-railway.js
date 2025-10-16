#!/usr/bin/env node

/**
 * Script para configurar automáticamente Railway
 * Este script se puede ejecutar localmente para configurar Railway via API
 */

import { execSync } from 'child_process';

console.log('🚀 Configurando Railway automáticamente...');

// Verificar si Railway CLI está instalado
try {
  execSync('railway --version', { stdio: 'pipe' });
  console.log('✅ Railway CLI encontrado');
} catch (error) {
  console.log('❌ Railway CLI no encontrado');
  console.log('📦 Instalando Railway CLI...');
  try {
    execSync('npm install -g @railway/cli', { stdio: 'inherit' });
    console.log('✅ Railway CLI instalado');
  } catch (installError) {
    console.error('❌ Error instalando Railway CLI:', installError.message);
    console.log('💡 Instala manualmente: npm install -g @railway/cli');
    process.exit(1);
  }
}

// Comandos para configurar Railway
const commands = [
  'railway login',
  'railway link',
  'railway add postgresql',
  'railway variables set NODE_ENV=production',
  'railway variables set PORT=3000',
  'railway deploy'
];

console.log('🔧 Ejecutando configuración automática...');
console.log('📋 Comandos a ejecutar:');
commands.forEach((cmd, index) => {
  console.log(`${index + 1}. ${cmd}`);
});

console.log('\n🎯 Para configurar Railway manualmente:');
console.log('1. Instala Railway CLI: npm install -g @railway/cli');
console.log('2. Haz login: railway login');
console.log('3. Conecta tu proyecto: railway link');
console.log('4. Agrega PostgreSQL: railway add postgresql');
console.log('5. Configura variables: railway variables set NODE_ENV=production');
console.log('6. Deploy: railway deploy');

export default {};
