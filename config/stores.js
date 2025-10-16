import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

class StoreManager {
  constructor() {
    this.stores = this.loadStoresConfig();
  }

  loadStoresConfig() {
    try {
      // Intentar cargar desde archivo JSON primero
      const storesJsonPath = path.join(process.cwd(), 'config', 'stores.json');
      
      if (fs.existsSync(storesJsonPath)) {
        const storesData = fs.readFileSync(storesJsonPath, 'utf8');
        const stores = JSON.parse(storesData);
        console.log(`✅ Configuración cargada desde archivo JSON: ${stores.length} tiendas`);
        return stores;
      }

      // Fallback a variables de entorno
      let storesConfig = process.env.STORES_CONFIG;
      
      if (!storesConfig) {
        throw new Error('STORES_CONFIG no está definido en las variables de entorno y no se encontró config/stores.json');
      }

      // Limpiar el JSON de comentarios y espacios extra
      storesConfig = storesConfig
        .replace(/\/\/.*$/gm, '') // Remover comentarios de línea
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque
        .trim();

      // Parsear JSON de las variables de entorno
      const stores = JSON.parse(storesConfig);
      
      if (!Array.isArray(stores)) {
        throw new Error('STORES_CONFIG debe ser un array');
      }

      if (stores.length === 0) {
        throw new Error('STORES_CONFIG debe contener al menos una tienda');
      }

      // Validar que cada tienda tenga los campos requeridos
      stores.forEach((store, index) => {
        const requiredFields = ['email', 'password', 'store_name', 'store_id'];
        const missingFields = requiredFields.filter(field => !store[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Tienda ${index + 1} falta: ${missingFields.join(', ')}`);
        }
      });

      console.log(`✅ Configuración cargada para ${stores.length} tiendas`);
      return stores;
      
    } catch (error) {
      console.error('❌ Error cargando configuración de tiendas:', error.message);
      throw error;
    }
  }

  getStores() {
    return this.stores;
  }

  getStoreById(storeId) {
    return this.stores.find(store => store.store_id === storeId);
  }

  getStoreByEmail(email) {
    return this.stores.find(store => store.email === email);
  }

  getStoreNames() {
    return this.stores.map(store => ({
      id: store.store_id,
      name: store.store_name,
      email: store.email
    }));
  }

  // Validar que todas las tiendas tengan configuración válida
  validateStores() {
    const errors = [];
    
    this.stores.forEach((store, index) => {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(store.email)) {
        errors.push(`Tienda ${index + 1}: Email inválido (${store.email})`);
      }

      // Validar que el password no esté vacío
      if (!store.password || store.password.trim() === '') {
        errors.push(`Tienda ${index + 1}: Password no puede estar vacío`);
      }

      // Validar que el store_id sea numérico
      if (!/^\d+$/.test(store.store_id)) {
        errors.push(`Tienda ${index + 1}: Store ID debe ser numérico (${store.store_id})`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Errores de configuración:\n${errors.join('\n')}`);
    }

    return true;
  }

  // Obtener configuración para sincronización paralela
  getParallelConfig() {
    const parallelStores = parseInt(process.env.PARALLEL_STORES) || 3;
    return {
      maxConcurrent: Math.min(parallelStores, this.stores.length),
      batchSize: parseInt(process.env.BATCH_SIZE) || 100
    };
  }
}

export default StoreManager;
