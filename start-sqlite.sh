#!/bin/bash
echo "🚀 Iniciando aplicación SQLite en Railway..."

# Crear directorio para SQLite si no existe
mkdir -p /app/data

# Verificar que el directorio existe
if [ -d "/app/data" ]; then
    echo "✅ Directorio /app/data creado"
else
    echo "❌ Error creando directorio /app/data"
    exit 1
fi

# Iniciar aplicación
echo "🔧 Iniciando servidor SQLite..."
npm run start:sqlite
