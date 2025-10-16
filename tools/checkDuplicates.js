#!/usr/bin/env node

import { db } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

class DuplicateChecker {
  constructor() {
    this.duplicates = {
      users: [],
      sessions: [],
      sale_orders: [],
      sale_products: []
    };
  }

  // Verificar duplicados en usuarios
  checkUserDuplicates() {
    console.log('🔍 Verificando duplicados en usuarios...');
    
    const query = `
      SELECT 
        linisco_id, 
        email, 
        store_id,
        COUNT(*) as count
      FROM users 
      GROUP BY linisco_id, email, store_id
      HAVING COUNT(*) > 1
    `;
    
    const stmt = db.prepare(query);
    const duplicates = stmt.all();
    
    if (duplicates.length > 0) {
      console.log(`❌ ${duplicates.length} grupos de usuarios duplicados encontrados:`);
      duplicates.forEach(dup => {
        console.log(`   • Linisco ID: ${dup.linisco_id}, Email: ${dup.email}, Store: ${dup.store_id} (${dup.count} veces)`);
      });
      this.duplicates.users = duplicates;
    } else {
      console.log('✅ No hay usuarios duplicados');
    }
    
    return duplicates.length;
  }

  // Verificar duplicados en sesiones
  checkSessionDuplicates() {
    console.log('🔍 Verificando duplicados en sesiones...');
    
    const query = `
      SELECT 
        linisco_id, 
        shop_number, 
        store_id,
        COUNT(*) as count
      FROM sessions 
      GROUP BY linisco_id, shop_number, store_id
      HAVING COUNT(*) > 1
    `;
    
    const stmt = db.prepare(query);
    const duplicates = stmt.all();
    
    if (duplicates.length > 0) {
      console.log(`❌ ${duplicates.length} grupos de sesiones duplicadas encontrados:`);
      duplicates.forEach(dup => {
        console.log(`   • Linisco ID: ${dup.linisco_id}, Shop: ${dup.shop_number}, Store: ${dup.store_id} (${dup.count} veces)`);
      });
      this.duplicates.sessions = duplicates;
    } else {
      console.log('✅ No hay sesiones duplicadas');
    }
    
    return duplicates.length;
  }

  // Verificar duplicados en órdenes de venta
  checkOrderDuplicates() {
    console.log('🔍 Verificando duplicados en órdenes de venta...');
    
    const query = `
      SELECT 
        linisco_id, 
        shop_number, 
        store_id,
        id_sale_order,
        COUNT(*) as count
      FROM sale_orders 
      GROUP BY linisco_id, shop_number, store_id, id_sale_order
      HAVING COUNT(*) > 1
    `;
    
    const stmt = db.prepare(query);
    const duplicates = stmt.all();
    
    if (duplicates.length > 0) {
      console.log(`❌ ${duplicates.length} grupos de órdenes duplicadas encontrados:`);
      duplicates.forEach(dup => {
        console.log(`   • Linisco ID: ${dup.linisco_id}, Shop: ${dup.shop_number}, Store: ${dup.store_id}, Order: ${dup.id_sale_order} (${dup.count} veces)`);
      });
      this.duplicates.sale_orders = duplicates;
    } else {
      console.log('✅ No hay órdenes duplicadas');
    }
    
    return duplicates.length;
  }

  // Verificar duplicados en productos vendidos
  checkProductDuplicates() {
    console.log('🔍 Verificando duplicados en productos vendidos...');
    
    const query = `
      SELECT 
        linisco_id, 
        shop_number, 
        store_id,
        id_sale_product,
        COUNT(*) as count
      FROM sale_products 
      GROUP BY linisco_id, shop_number, store_id, id_sale_product
      HAVING COUNT(*) > 1
    `;
    
    const stmt = db.prepare(query);
    const duplicates = stmt.all();
    
    if (duplicates.length > 0) {
      console.log(`❌ ${duplicates.length} grupos de productos duplicados encontrados:`);
      duplicates.forEach(dup => {
        console.log(`   • Linisco ID: ${dup.linisco_id}, Shop: ${dup.shop_number}, Store: ${dup.store_id}, Product: ${dup.id_sale_product} (${dup.count} veces)`);
      });
      this.duplicates.sale_products = duplicates;
    } else {
      console.log('✅ No hay productos duplicados');
    }
    
    return duplicates.length;
  }

  // Verificar duplicados por tienda
  checkDuplicatesByStore(storeId) {
    console.log(`🔍 Verificando duplicados para tienda ${storeId}...`);
    
    const queries = {
      sessions: `
        SELECT 
          linisco_id, 
          shop_number,
          COUNT(*) as count
        FROM sessions 
        WHERE store_id = ?
        GROUP BY linisco_id, shop_number
        HAVING COUNT(*) > 1
      `,
      orders: `
        SELECT 
          linisco_id, 
          shop_number,
          id_sale_order,
          COUNT(*) as count
        FROM sale_orders 
        WHERE store_id = ?
        GROUP BY linisco_id, shop_number, id_sale_order
        HAVING COUNT(*) > 1
      `,
      products: `
        SELECT 
          linisco_id, 
          shop_number,
          id_sale_product,
          COUNT(*) as count
        FROM sale_products 
        WHERE store_id = ?
        GROUP BY linisco_id, shop_number, id_sale_product
        HAVING COUNT(*) > 1
      `
    };

    let totalDuplicates = 0;

    Object.entries(queries).forEach(([table, query]) => {
      const stmt = db.prepare(query);
      const duplicates = stmt.all(storeId);
      
      if (duplicates.length > 0) {
        console.log(`❌ ${duplicates.length} duplicados en ${table} para tienda ${storeId}`);
        totalDuplicates += duplicates.length;
      } else {
        console.log(`✅ No hay duplicados en ${table} para tienda ${storeId}`);
      }
    });

    return totalDuplicates;
  }

  // Obtener estadísticas de duplicados
  getDuplicateStats() {
    console.log('\n📊 ESTADÍSTICAS DE DUPLICADOS:');
    
    const stats = {
      users: this.duplicates.users.length,
      sessions: this.duplicates.sessions.length,
      orders: this.duplicates.sale_orders.length,
      products: this.duplicates.sale_products.length
    };

    const totalDuplicates = Object.values(stats).reduce((sum, count) => sum + count, 0);

    console.log(`   • Usuarios duplicados: ${stats.users}`);
    console.log(`   • Sesiones duplicadas: ${stats.sessions}`);
    console.log(`   • Órdenes duplicadas: ${stats.orders}`);
    console.log(`   • Productos duplicados: ${stats.products}`);
    console.log(`   • Total de grupos duplicados: ${totalDuplicates}`);

    return stats;
  }

  // Limpiar duplicados (mantener solo el más reciente)
  cleanDuplicates() {
    console.log('\n🧹 Limpiando duplicados...');
    
    const cleanupQueries = [
      {
        table: 'users',
        query: `
          DELETE FROM users 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM users 
            GROUP BY linisco_id, email, store_id
          )
        `
      },
      {
        table: 'sessions',
        query: `
          DELETE FROM sessions 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM sessions 
            GROUP BY linisco_id, shop_number, store_id
          )
        `
      },
      {
        table: 'sale_orders',
        query: `
          DELETE FROM sale_orders 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM sale_orders 
            GROUP BY linisco_id, shop_number, store_id, id_sale_order
          )
        `
      },
      {
        table: 'sale_products',
        query: `
          DELETE FROM sale_products 
          WHERE id NOT IN (
            SELECT MIN(id) 
            FROM sale_products 
            GROUP BY linisco_id, shop_number, store_id, id_sale_product
          )
        `
      }
    ];

    let totalCleaned = 0;

    cleanupQueries.forEach(({ table, query }) => {
      try {
        const stmt = db.prepare(query);
        const result = stmt.run();
        const deleted = result.changes;
        
        if (deleted > 0) {
          console.log(`✅ ${deleted} duplicados eliminados de ${table}`);
          totalCleaned += deleted;
        } else {
          console.log(`✅ No hay duplicados en ${table}`);
        }
      } catch (error) {
        console.error(`❌ Error limpiando ${table}:`, error.message);
      }
    });

    console.log(`\n🎉 Total de registros duplicados eliminados: ${totalCleaned}`);
    return totalCleaned;
  }

  // Verificar integridad de datos
  checkDataIntegrity() {
    console.log('\n🔍 Verificando integridad de datos...');
    
    const integrityChecks = [
      {
        name: 'Órdenes sin tienda válida',
        query: `
          SELECT COUNT(*) as count 
          FROM sale_orders so 
          LEFT JOIN stores s ON so.store_id = s.store_id 
          WHERE s.store_id IS NULL
        `
      },
      {
        name: 'Productos sin orden válida',
        query: `
          SELECT COUNT(*) as count 
          FROM sale_products sp 
          LEFT JOIN sale_orders so ON sp.id_sale_order = so.id_sale_order 
          WHERE so.id_sale_order IS NULL
        `
      },
      {
        name: 'Sesiones sin tienda válida',
        query: `
          SELECT COUNT(*) as count 
          FROM sessions s 
          LEFT JOIN stores st ON s.store_id = st.store_id 
          WHERE st.store_id IS NULL
        `
      }
    ];

    let totalIssues = 0;

    integrityChecks.forEach(check => {
      const stmt = db.prepare(check.query);
      const result = stmt.get();
      
      if (result.count > 0) {
        console.log(`❌ ${check.name}: ${result.count} registros`);
        totalIssues += result.count;
      } else {
        console.log(`✅ ${check.name}: OK`);
      }
    });

    if (totalIssues === 0) {
      console.log('✅ Integridad de datos: PERFECTA');
    } else {
      console.log(`⚠️ Total de problemas de integridad: ${totalIssues}`);
    }

    return totalIssues;
  }

  // Ejecutar todas las verificaciones
  async runAllChecks() {
    console.log('🚀 Iniciando verificación completa de duplicados...\n');
    
    const startTime = Date.now();
    
    // Verificar duplicados
    const userDups = this.checkUserDuplicates();
    const sessionDups = this.checkSessionDuplicates();
    const orderDups = this.checkOrderDuplicates();
    const productDups = this.checkProductDuplicates();
    
    // Obtener estadísticas
    const stats = this.getDuplicateStats();
    
    // Verificar integridad
    const integrityIssues = this.checkDataIntegrity();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️ Verificación completada en ${duration} segundos`);
    
    return {
      duplicates: stats,
      integrityIssues,
      duration: parseFloat(duration)
    };
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new DuplicateChecker();
  const command = process.argv[2] || 'check';

  switch (command) {
    case 'check':
      checker.runAllChecks();
      break;
    case 'clean':
      checker.runAllChecks().then(() => {
        checker.cleanDuplicates();
      });
      break;
    case 'store':
      const storeId = process.argv[3];
      if (storeId) {
        checker.checkDuplicatesByStore(storeId);
      } else {
        console.log('❌ Debes especificar el ID de la tienda');
        console.log('Uso: node tools/checkDuplicates.js store <store_id>');
      }
      break;
    default:
      console.log(`
🔍 Duplicate Checker - Verificador de Duplicados

COMANDOS DISPONIBLES:
  node tools/checkDuplicates.js check    - Verificar duplicados (por defecto)
  node tools/checkDuplicates.js clean    - Verificar y limpiar duplicados
  node tools/checkDuplicates.js store <id> - Verificar duplicados por tienda

EJEMPLOS:
  node tools/checkDuplicates.js check
  node tools/checkDuplicates.js clean
  node tools/checkDuplicates.js store 63953
      `);
  }
}

export default DuplicateChecker;
