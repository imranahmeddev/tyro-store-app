export const APP_CONFIG = {
  APP_NAME: 'Tyro eComm',
  VERSION: '1.0.0',
  DEFAULT_TIMEOUT: 15000,
  API_V1_PREFIX: '/api/v1',
} as const;

export const ENDPOINTS = {
  STORE_INFO: '/api/v1/store-info',
  AUTH_TOKEN: '/api/v1/auth/token',
  AUTH_REVOKE: '/api/v1/auth/revoke',
  DASHBOARD: '/api/v1/dashboard',
  ORDERS: '/api/v1/orders',
  PRODUCTS: '/api/v1/products',
  CUSTOMERS: '/api/v1/customers',
  DEVICES: '/api/v1/devices',
} as const;

