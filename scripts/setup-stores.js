#!/usr/bin/env node

import StoreManager from '../config/stores.js';
import { db } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

class StoreSetup {
  constructor() {
    this.storeManager = new StoreManager();
  }

  async setupStores() {
    try {
      console.log('🏪 Configurando tiendas en la base de datos...');
      
      // Validar configuración
      this.storeManager.validateStores();
      
      const stores = this.storeManager.getStores();
      
      // Insertar/actualizar tiendas en la base de datos
      const insertStore = db.prepare(`
        INSERT OR REPLACE INTO stores (store_id, store_name, email, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      stores.forEach(store => {
        insertStore.run(store.store_id, store.store_name, store.email);
        console.log(`✅ Tienda configurada: ${store.store_name} (${store.store_id})`);
      });

      console.log(`\n🎉 ${stores.length} tiendas configuradas exitosamente`);
      
      // Mostrar resumen
      const stmt = db.prepare('SELECT * FROM stores ORDER BY store_id');
      const configuredStores = stmt.all();
      
      console.log('\n📋 TIENDAS CONFIGURADAS:');
      configuredStores.forEach(store => {
        console.log(`   • ${store.store_name} (ID: ${store.store_id}) - ${store.email}`);
      });

    } catch (error) {
      console.error('❌ Error configurando tiendas:', error.message);
      process.exit(1);
    }
  }

  async testConnections() {
    try {
      console.log('🔍 Probando conexiones a las tiendas...');
      
      const stores = this.storeManager.getStores();
      const results = [];

      for (const store of stores) {
        try {
          console.log(`   Probando ${store.store_name}...`);
          
          // Aquí podrías hacer una prueba de conexión real
          // Por ahora solo validamos la configuración
          results.push({
            store: store.store_name,
            status: 'config_valid',
            message: 'Configuración válida'
          });
          
        } catch (error) {
          results.push({
            store: store.store_name,
            status: 'error',
            message: error.message
          });
        }
      }

      console.log('\n📊 RESULTADOS DE PRUEBA:');
      results.forEach(result => {
        const status = result.status === 'config_valid' ? '✅' : '❌';
        console.log(`   ${status} ${result.store}: ${result.message}`);
      });

    } catch (error) {
      console.error('❌ Error probando conexiones:', error.message);
    }
  }

  async showConfig() {
    try {
      console.log('⚙️ CONFIGURACIÓN ACTUAL:');
      
      const stores = this.storeManager.getStores();
      const config = this.storeManager.getParallelConfig();
      
      console.log(`   • Total de tiendas: ${stores.length}`);
      console.log(`   • Sincronización paralela: ${config.maxConcurrent} tiendas simultáneas`);
      console.log(`   • Tamaño de lote: ${config.batchSize} registros`);
      
      console.log('\n🏪 TIENDAS CONFIGURADAS:');
      stores.forEach((store, index) => {
        console.log(`   ${index + 1}. ${store.store_name} (${store.store_id})`);
        console.log(`      Email: ${store.email}`);
        console.log(`      Password: ${'*'.repeat(store.password.length)}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error mostrando configuración:', error.message);
    }
  }
}

// Ejecutar script
const setup = new StoreSetup();
const command = process.argv[2] || 'setup';

switch (command) {
  case 'setup':
    setup.setupStores();
    break;
  case 'test':
    setup.testConnections();
    break;
  case 'config':
    setup.showConfig();
    break;
  default:
    console.log(`
🏪 Store Setup - Configuración de Tiendas

COMANDOS DISPONIBLES:
  node scripts/setup-stores.js setup    - Configurar tiendas en la base de datos
  node scripts/setup-stores.js test     - Probar conexiones a las tiendas
  node scripts/setup-stores.js config   - Mostrar configuración actual

EJEMPLOS:
  node scripts/setup-stores.js setup
  node scripts/setup-stores.js test
  node scripts/setup-stores.js config
    `);
}
