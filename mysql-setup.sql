-- Script de configuración de MySQL para Linisco Dashboard
-- Ejecutar este script para crear la base de datos y usuario

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS linisco_dashboard 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Crear usuario (reemplazar 'linisco_user' y 'linisco_password' con tus credenciales)
CREATE USER IF NOT EXISTS 'linisco_user'@'localhost' IDENTIFIED BY 'linisco_password';

-- Otorgar permisos
GRANT ALL PRIVILEGES ON linisco_dashboard.* TO 'linisco_user'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Usar la base de datos
USE linisco_dashboard;

-- Mostrar información
SELECT 'Base de datos linisco_dashboard creada exitosamente' as status;
SELECT 'Usuario linisco_user creado exitosamente' as status;
SELECT 'Permisos otorgados exitosamente' as status;

-- Mostrar tablas (se crearán automáticamente por la aplicación)
SHOW TABLES;
