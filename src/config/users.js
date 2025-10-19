// Configuración de usuarios para la API de Linisco
// Este archivo contiene las credenciales de los 7 usuarios

export const USERS_CONFIG = [
  {
    id: 1,
    email: "63953@linisco.com.ar",
    password: "63953hansen",
    storeName: "Subway Lacroze",
    storeId: "63953",
    active: true
  },
  {
    id: 2,
    email: "66220@linisco.com.ar", // Ejemplo - reemplazar con credenciales reales
    password: "66220hansen",
    storeName: "Subway Corrientes",
    storeId: "66220",
    active: true
  },
  {
    id: 3,
    email: "72267@linisco.com.ar", // Ejemplo - reemplazar con credenciales reales
    password: "72267hansen",
    storeName: "Subway Ortiz",
    storeId: "72267",
    active: true
  },
  {
    id: 4,
    email: "30036@linisco.com.ar", // Ejemplo - reemplazar con credenciales reales
    password: "30036hansen",
    storeName: "Daniel Lacroze",
    storeId: "30036",
    active: true
  },
  {
    id: 5,
    email: "30038@linisco.com.ar", // Ejemplo - reemplazar con credenciales reales
    password: "30038hansen",
    storeName: "Daniel Corrientes",
    storeId: "30038",
    active: true
  },
  {
    id: 6,
    email: "10019@linisco.com.ar", // Ejemplo - reemplazar con credenciales reales
    password: "10019hansen",
    storeName: "Daniel Ortiz",
    storeId: "10019",
    active: true
  },
  {
    id: 7,
    email: "10020@linisco.com.ar", // Ejemplo - reemplazar con credenciales reales
    password: "10020hansen",
    storeName: "Seitu Juramento",
    storeId: "10020",
    active: true
  }
];

// Función para obtener usuarios activos
export function getActiveUsers() {
  return USERS_CONFIG.filter(user => user.active);
}

// Función para obtener usuario por email
export function getUserByEmail(email) {
  return USERS_CONFIG.find(user => user.email === email);
}

// Función para obtener usuario por ID
export function getUserById(id) {
  return USERS_CONFIG.find(user => user.id === id);
}

// Función para obtener usuarios por tienda
export function getUsersByStore(storeId) {
  return USERS_CONFIG.filter(user => user.storeId === storeId && user.active);
}
