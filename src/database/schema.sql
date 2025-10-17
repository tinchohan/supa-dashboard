-- Esquema de base de datos para Linisco Dashboard

-- Tabla de tiendas
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(50) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de órdenes de venta
CREATE TABLE IF NOT EXISTS sale_orders (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER NOT NULL,
    shop_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    id_sale_order INTEGER NOT NULL,
    id_customer INTEGER,
    number INTEGER,
    order_date TIMESTAMP WITH TIME ZONE,
    id_session INTEGER,
    paymentmethod VARCHAR(100),
    total DECIMAL(10, 2),
    discount DECIMAL(10, 2),
    url VARCHAR(500),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(linisco_id, store_id)
);

-- Tabla de productos vendidos
CREATE TABLE IF NOT EXISTS sale_products (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER NOT NULL,
    shop_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    id_sale_product INTEGER NOT NULL,
    id_sale_order INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    fixed_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS psessions (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER UNIQUE NOT NULL,
    shop_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    id_session INTEGER NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_date ON sale_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sale_orders_payment ON sale_orders(paymentmethod);
CREATE INDEX IF NOT EXISTS idx_sale_products_store_id ON sale_products(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_products_order ON sale_products(id_sale_order);
CREATE INDEX IF NOT EXISTS idx_sale_products_name ON sale_products(name);
CREATE INDEX IF NOT EXISTS idx_psessions_store_id ON psessions(store_id);
CREATE INDEX IF NOT EXISTS idx_psessions_date ON psessions(session_date);
