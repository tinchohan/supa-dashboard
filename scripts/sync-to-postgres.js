#!/usr/bin/env node

/**
 * Script para sincronizar datos directamente a PostgreSQL
 * Este script se ejecuta en Railway para poblar la base de datos
 */

import { initializeDatabase, db } from '../config/database-postgres.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🚀 Iniciando sincronización a PostgreSQL...');

async function syncToPostgres() {
  try {
    // Inicializar PostgreSQL
    await initializeDatabase();
    console.log('✅ PostgreSQL inicializado');

    // Datos de prueba para verificar que funciona
    const testStores = [
      {
        store_id: '63953',
        store_name: 'Subway Lacroze',
        email: '63953@linisco.com.ar',
        password: '63953hansen'
      }
    ];

    const testOrders = [
      {
        id: 'test-001',
        store_id: '63953',
        order_date: '2025-10-15',
        total: 1500,
        discount: 0,
        payment_method: 'cash'
      }
    ];

    const testProducts = [
      {
        id_sale_order: 'test-001',
        store_id: '63953',
        name: 'Subway Club',
        fixed_name: 'subway-club',
        quantity: 2,
        sale_price: 750
      }
    ];

    // Insertar datos de prueba
    console.log('📊 Insertando datos de prueba...');

    // Insertar tiendas
    for (const store of testStores) {
      await db.prepare(`
        INSERT INTO stores (store_id, store_name, email, password) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (store_id) DO UPDATE SET
          store_name = EXCLUDED.store_name,
          email = EXCLUDED.email,
          password = EXCLUDED.password
      `).run(store.store_id, store.store_name, store.email, store.password);
    }

    // Insertar órdenes
    for (const order of testOrders) {
      await db.prepare(`
        INSERT INTO sale_orders (id, store_id, order_date, total, discount, payment_method) 
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          store_id = EXCLUDED.store_id,
          order_date = EXCLUDED.order_date,
          total = EXCLUDED.total,
          discount = EXCLUDED.discount,
          payment_method = EXCLUDED.payment_method
      `).run(order.id, order.store_id, order.order_date, order.total, order.discount, order.payment_method);
    }

    // Insertar productos
    for (const product of testProducts) {
      await db.prepare(`
        INSERT INTO sale_products (id_sale_order, store_id, name, fixed_name, quantity, sale_price) 
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id_sale_order, store_id, name) DO UPDATE SET
          fixed_name = EXCLUDED.fixed_name,
          quantity = EXCLUDED.quantity,
          sale_price = EXCLUDED.sale_price
      `).run(product.id_sale_order, product.store_id, product.name, product.fixed_name, product.quantity, product.sale_price);
    }

    console.log('✅ Datos de prueba insertados correctamente');

    // Verificar datos
    const storeCount = await db.prepare('SELECT COUNT(*) as count FROM stores').get();
    const orderCount = await db.prepare('SELECT COUNT(*) as count FROM sale_orders').get();
    const productCount = await db.prepare('SELECT COUNT(*) as count FROM sale_products').get();

    console.log(`📊 Verificación:`);
    console.log(`   - Tiendas: ${storeCount.count}`);
    console.log(`   - Órdenes: ${orderCount.count}`);
    console.log(`   - Productos: ${productCount.count}`);

    console.log('🎉 Sincronización completada exitosamente');

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  syncToPostgres()
    .then(() => {
      console.log('✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export default syncToPostgres;
