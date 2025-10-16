// Ejemplo de credenciales de autenticación
// Copiar este archivo como auth-credentials.js y cambiar las credenciales

export const AUTH_CREDENTIALS = {
  username: 'admin',
  password: 'linisco2025'
};

// Función para validar credenciales
export function validateCredentials(username, password) {
  return username === AUTH_CREDENTIALS.username && 
         password === AUTH_CREDENTIALS.password;
}

export default AUTH_CREDENTIALS;
