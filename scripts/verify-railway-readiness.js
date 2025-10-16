import fs from 'fs';
import path from 'path';

console.log('🔍 Verificando preparación para Railway...\n');

const checks = [
  {
    name: 'Package.json con script start:prod',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.scripts && pkg.scripts['start:prod'];
    }
  },
  {
    name: 'Dependencia pg instalada',
    check: () => {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.dependencies && pkg.dependencies.pg;
    }
  },
  {
    name: 'Archivo railway.json presente',
    check: () => fs.existsSync('railway.json')
  },
  {
    name: 'Configuración PostgreSQL presente',
    check: () => fs.existsSync('config/database-postgres.js')
  },
  {
    name: 'Script de migración presente',
    check: () => fs.existsSync('scripts/migrate-to-postgres.js')
  },
  {
    name: 'Archivo .gitignore configurado',
    check: () => fs.existsSync('.gitignore')
  },
  {
    name: 'Servidor web modificado para PostgreSQL',
    check: () => {
      const serverContent = fs.readFileSync('web/server.js', 'utf8');
      return serverContent.includes('database-postgres.js') && 
             serverContent.includes('dbToUse');
    }
  }
];

let allPassed = true;

checks.forEach(({ name, check }) => {
  try {
    const passed = check();
    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 ¡Todo listo para Railway!');
  console.log('\n📋 Próximos pasos:');
  console.log('1. Sube tu código a GitHub');
  console.log('2. Crea un proyecto en Railway');
  console.log('3. Conecta tu repositorio');
  console.log('4. Configura las variables de entorno');
  console.log('5. ¡Deploy!');
} else {
  console.log('⚠️  Hay algunos problemas que resolver antes del deploy');
}

console.log('\n📖 Lee RAILWAY_DEPLOYMENT.md para instrucciones detalladas');
