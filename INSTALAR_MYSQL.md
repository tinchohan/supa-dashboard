# 🗄️ Instalación de MySQL para Linisco Dashboard

## 🚀 Instalación Rápida

### Windows:

#### Opción A: Descargar desde el sitio oficial
1. Ve a: https://dev.mysql.com/downloads/mysql/
2. Descarga "MySQL Community Server"
3. Ejecuta el instalador
4. Configura password para root
5. Anota las credenciales

#### Opción B: Usar Chocolatey
```powershell
# Instalar Chocolatey si no lo tienes
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar MySQL
choco install mysql

# Iniciar MySQL
net start mysql
```

#### Opción C: Usar WSL (Windows Subsystem for Linux)
```bash
# Instalar WSL
wsl --install

# En WSL, instalar MySQL
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### macOS:
```bash
# Usar Homebrew
brew install mysql
brew services start mysql
```

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

## 🔧 Configuración

### 1. Crear base de datos y usuario
```sql
-- Conectar como root
mysql -u root -p

-- Ejecutar este script
CREATE DATABASE linisco_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'linisco_user'@'localhost' IDENTIFIED BY 'linisco_password';
GRANT ALL PRIVILEGES ON linisco_dashboard.* TO 'linisco_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Configurar variables de entorno
Crear archivo `.env`:
```env
# Base de datos MySQL
DB_HOST=localhost
DB_USER=linisco_user
DB_PASSWORD=linisco_password
DB_NAME=linisco_dashboard
DB_PORT=3306

# API de Linisco
LINISCO_API_URL=https://pos.linisco.com.ar
LINISCO_EMAIL=63953@linisco.com.ar
LINISCO_PASSWORD=63953hansen
```

### 3. Reiniciar el servidor
```bash
npm start
```

## ✅ Verificación

Después de instalar MySQL y configurar las variables:

1. **Verificar conexión:**
```bash
curl http://localhost:3000/api/sync/status
```

2. **Debería mostrar:**
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "users": [...]
  }
}
```

## 🎯 Beneficios de tener MySQL

- **Consultas 10x más rápidas**
- **Datos persistentes** sin depender de la API
- **Análisis avanzados** con SQL
- **Respaldo automático** de datos
- **Sincronización inteligente**

## 🔧 Solución de Problemas

### Error: "Can't connect to MySQL server"
```bash
# Verificar que MySQL esté ejecutándose
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS
net start mysql  # Windows
```

### Error: "Access denied for user"
```sql
-- Verificar usuario y permisos
mysql -u root -p
SHOW GRANTS FOR 'linisco_user'@'localhost';
```

### Error: "Unknown database"
```sql
-- Crear la base de datos
CREATE DATABASE linisco_dashboard;
```
