// Configuración de usuarios activos
const activeUsers = [
  {
    storeId: '63953',
    storeName: 'Subway Lacroze',
    email: '63953@linisco.com.ar',
    password: '63953hansen'
  },
  {
    storeId: '66220',
    storeName: 'Subway Corrientes',
    email: '66220@linisco.com.ar',
    password: '66220hansen'
  },
  {
    storeId: '72267',
    storeName: 'Subway Ortiz',
    email: '72267@linisco.com.ar',
    password: '72267hansen'
  },
  {
    storeId: '30036',
    storeName: 'Daniel Lacroze',
    email: '30036@linisco.com.ar',
    password: '30036hansen'
  },
  {
    storeId: '30038',
    storeName: 'Daniel Corrientes',
    email: '30038@linisco.com.ar',
    password: '30038hansen'
  },
  {
    storeId: '10019',
    storeName: 'Daniel Ortiz',
    email: '10019@linisco.com.ar',
    password: '10019hansen'
  },
  {
    storeId: '10020',
    storeName: 'Seitu Juramento',
    email: '10020@linisco.com.ar',
    password: '10020hansen'
  }
];

export function getActiveUsers() {
  return activeUsers;
}

export function getUserByEmail(email) {
  return activeUsers.find(user => user.email === email);
}

export function getUserByStoreId(storeId) {
  return activeUsers.find(user => user.storeId === storeId);
}
