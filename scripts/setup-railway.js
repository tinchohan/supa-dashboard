#!/usr/bin/env node

/**
 * Script para configurar automáticamente Railway
 * Este script se ejecuta durante el build para configurar variables de entorno
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Configurando Railway...');

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
  } else {
    console.log('⚠️  DATABASE_URL no encontrada - configurando PostgreSQL local');
    // Para desarrollo local o si no hay PostgreSQL configurado
    process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/railway';
  }
  
  console.log('🎉 Configuración de Railway completada');
} else {
  console.log('ℹ️  No es entorno Railway - usando configuración local');
}

export default {};
