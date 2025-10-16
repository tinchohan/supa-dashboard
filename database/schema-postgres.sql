-- Esquema PostgreSQL para el dashboard de análisis de ventas
-- Tabla para tiendas/sucursales
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_id TEXT UNIQUE NOT NULL,
    store_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para usuarios autenticados
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER UNIQUE NOT NULL,
    email TEXT NOT NULL,
    store_id TEXT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    authentication_token TEXT,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Tabla para órdenes de venta
CREATE TABLE IF NOT EXISTS sale_orders (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    order_date TIMESTAMP NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    id_sale_order INTEGER,
    id_session INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Tabla para productos vendidos
CREATE TABLE IF NOT EXISTS sale_products (
    id SERIAL PRIMARY KEY,
    id_sale_order TEXT NOT NULL,
    store_id TEXT NOT NULL,
    name TEXT NOT NULL,
    fixed_name TEXT,
    quantity INTEGER NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_sale_order) REFERENCES sale_orders(id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id),
    UNIQUE(id_sale_order, store_id, name)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sale_orders_date ON sale_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sale_orders_store ON sale_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_products_order ON sale_products(id_sale_order);
CREATE INDEX IF NOT EXISTS idx_sale_products_store ON sale_products(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_store_id ON stores(store_id);
