-- PostgreSQL Schema basado en la API de Linisco
-- Este schema replica exactamente la estructura de la API

-- Tabla de usuarios (para autenticación)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    authentication_token VARCHAR(255),
    roles_mask INTEGER DEFAULT 0,
    brand_id INTEGER DEFAULT 1
);

-- Tabla de tiendas (stores)
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    store_id VARCHAR(50) NOT NULL UNIQUE,
    store_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de órdenes de venta (sale_orders)
CREATE TABLE IF NOT EXISTS sale_orders (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER NOT NULL,
    shop_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    id_sale_order INTEGER NOT NULL,
    id_customer INTEGER DEFAULT 0,
    number INTEGER DEFAULT 0,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    id_session INTEGER NOT NULL,
    paymentmethod VARCHAR(50) NOT NULL, -- Nota: es "paymentmethod" no "payment_method"
    total DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.0,
    url TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para optimización
    CONSTRAINT fk_sale_orders_store FOREIGN KEY (store_id) REFERENCES stores(store_id),
    UNIQUE(linisco_id, store_id)
);

-- Tabla de productos vendidos (sale_products)
CREATE TABLE IF NOT EXISTS sale_products (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER NOT NULL,
    shop_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    id_sale_product INTEGER NOT NULL,
    id_sale_order INTEGER NOT NULL,
    id_product INTEGER,
    id_control_sheet_def INTEGER,
    name VARCHAR(255),
    fixed_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    sale_price DECIMAL(10,2) NOT NULL,
    url TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para optimización
    CONSTRAINT fk_sale_products_store FOREIGN KEY (store_id) REFERENCES stores(store_id),
    CONSTRAINT fk_sale_products_order FOREIGN KEY (id_sale_order, store_id) REFERENCES sale_orders(id_sale_order, store_id),
    UNIQUE(linisco_id, store_id)
);

-- Tabla de sesiones (psessions)
CREATE TABLE IF NOT EXISTS psessions (
    id SERIAL PRIMARY KEY,
    linisco_id INTEGER NOT NULL,
    shop_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) NOT NULL,
    id_session INTEGER NOT NULL,
    id_user INTEGER NOT NULL,
    username VARCHAR(255),
    checkin TIMESTAMP WITH TIME ZONE NOT NULL,
    checkout TIMESTAMP WITH TIME ZONE,
    initial_cash DECIMAL(10,2) DEFAULT 0.0,
    cash DECIMAL(10,2) DEFAULT 0.0,
    cd_visa DECIMAL(10,2) DEFAULT 0.0,
    cc_maestro DECIMAL(10,2) DEFAULT 0.0,
    cc_amex DECIMAL(10,2) DEFAULT 0.0,
    cc_cabal DECIMAL(10,2) DEFAULT 0.0,
    cc_naranja DECIMAL(10,2) DEFAULT 0.0,
    cc_diners DECIMAL(10,2) DEFAULT 0.0,
    cc_nativa DECIMAL(10,2) DEFAULT 0.0,
    cc_argencard DECIMAL(10,2) DEFAULT 0.0,
    cc_mcdebit DECIMAL(10,2) DEFAULT 0.0,
    in_total DECIMAL(10,2) DEFAULT 0.0,
    cd_maestro DECIMAL(10,2) DEFAULT 0.0,
    cd_cabal DECIMAL(10,2) DEFAULT 0.0,
    cc_visa DECIMAL(10,2) DEFAULT 0.0,
    total_invoiced DECIMAL(10,2) DEFAULT 0.0,
    real_invoiced DECIMAL(10,2) DEFAULT 0.0,
    url TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para optimización
    CONSTRAINT fk_psessions_store FOREIGN KEY (store_id) REFERENCES stores(store_id),
    UNIQUE(linisco_id, store_id)
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_sale_orders_store_date ON sale_orders(store_id, order_date);
CREATE INDEX IF NOT EXISTS idx_sale_orders_paymentmethod ON sale_orders(paymentmethod);
CREATE INDEX IF NOT EXISTS idx_sale_orders_date_range ON sale_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_sale_products_store ON sale_products(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_products_order ON sale_products(id_sale_order);
CREATE INDEX IF NOT EXISTS idx_sale_products_name ON sale_products(name);

CREATE INDEX IF NOT EXISTS idx_psessions_store ON psessions(store_id);
CREATE INDEX IF NOT EXISTS idx_psessions_date ON psessions(checkin);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Usuarios del sistema con tokens de autenticación';
COMMENT ON TABLE stores IS 'Tiendas del sistema con credenciales';
COMMENT ON TABLE sale_orders IS 'Órdenes de venta de la API de Linisco';
COMMENT ON TABLE sale_products IS 'Productos vendidos en cada orden';
COMMENT ON TABLE psessions IS 'Sesiones de trabajo de los usuarios';

-- Datos iniciales de tiendas
INSERT INTO stores (store_id, store_name, email, password) VALUES
('66220', 'Subway Lacroze', '66220@linisco.com.ar', 'subway123'),
('66221', 'Subway Corrientes', '66221@linisco.com.ar', 'subway123'),
('66222', 'Subway Ortiz', '66222@linisco.com.ar', 'subway123'),
('10019', 'Daniel Lacroze', '10019@linisco.com.ar', 'daniel123'),
('30038', 'Daniel Corrientes', '30038@linisco.com.ar', 'daniel123'),
('10019', 'Daniel Ortiz', '10019@linisco.com.ar', 'daniel123'),
('30039', 'Seitu Juramento', '30039@linisco.com.ar', 'seitu123')
ON CONFLICT (store_id) DO NOTHING;
