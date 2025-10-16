-- Tabla para tiendas/sucursales
CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id TEXT UNIQUE NOT NULL,
    store_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para usuarios autenticados
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    linisco_id INTEGER UNIQUE NOT NULL,
    email TEXT NOT NULL,
    store_id TEXT NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    authentication_token TEXT,
    roles_mask INTEGER,
    brand_id INTEGER,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Tabla para sesiones de punto de venta
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    linisco_id INTEGER UNIQUE NOT NULL,
    shop_number TEXT NOT NULL,
    store_id TEXT NOT NULL,
    user_id INTEGER,
    username TEXT,
    checkin DATETIME,
    checkout DATETIME,
    initial_cash REAL DEFAULT 0,
    cash REAL DEFAULT 0,
    cd_visa REAL DEFAULT 0,
    cc_maestro REAL DEFAULT 0,
    cc_amex REAL DEFAULT 0,
    cc_cabal REAL DEFAULT 0,
    cc_naranja REAL DEFAULT 0,
    cc_diners REAL DEFAULT 0,
    cc_nativa REAL DEFAULT 0,
    cc_argencard REAL DEFAULT 0,
    cc_mcdebit REAL DEFAULT 0,
    in_total REAL DEFAULT 0,
    cd_maestro REAL DEFAULT 0,
    cd_cabal REAL DEFAULT 0,
    cc_visa REAL DEFAULT 0,
    total_invoiced REAL DEFAULT 0,
    real_invoiced REAL DEFAULT 0,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Tabla para órdenes de venta
CREATE TABLE IF NOT EXISTS sale_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    linisco_id INTEGER UNIQUE NOT NULL,
    shop_number TEXT NOT NULL,
    store_id TEXT NOT NULL,
    id_sale_order INTEGER NOT NULL,
    id_customer INTEGER DEFAULT 0,
    number INTEGER DEFAULT 0,
    order_date DATETIME,
    id_session INTEGER,
    payment_method TEXT,
    total REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Tabla para productos vendidos
CREATE TABLE IF NOT EXISTS sale_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    linisco_id INTEGER UNIQUE NOT NULL,
    shop_number TEXT NOT NULL,
    store_id TEXT NOT NULL,
    id_sale_product INTEGER NOT NULL,
    id_sale_order INTEGER NOT NULL,
    id_product INTEGER,
    id_control_sheet_def INTEGER,
    name TEXT,
    fixed_name TEXT,
    quantity INTEGER DEFAULT 1,
    sale_price REAL DEFAULT 0,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

-- Tabla para combos vendidos - ELIMINADA (no necesaria)

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_stores_store_id ON stores(store_id);
CREATE INDEX IF NOT EXISTS idx_sessions_shop_number ON sessions(shop_number);
CREATE INDEX IF NOT EXISTS idx_sessions_store_id ON sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_sessions_checkin ON sessions(checkin);
CREATE INDEX IF NOT EXISTS idx_sale_orders_shop_number ON sale_orders(shop_number);
CREATE INDEX IF NOT EXISTS idx_sale_orders_store_id ON sale_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_order_date ON sale_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sale_products_shop_number ON sale_products(shop_number);
CREATE INDEX IF NOT EXISTS idx_sale_products_store_id ON sale_products(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_products_id_sale_order ON sale_products(id_sale_order);
-- Índices de combos eliminados

-- Tabla para control de sincronización
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sync_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    records_synced INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);
