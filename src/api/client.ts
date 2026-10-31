import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

export const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * - Dynamically binds the active store's URL as baseURL if relative path used
 * - Injects the Sanctum Bearer token for the active store profile
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const activeStore = authStore.getActiveStore();

    if (activeStore) {
      if (!config.baseURL && !/^https?:\/\//i.test(config.url || '')) {
        config.baseURL = activeStore.store_url;
      }

      if (activeStore.access_token) {
        config.headers.set('Authorization', `Bearer ${activeStore.access_token}`);
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * - Catches HTTP 401 Unauthorized globally
 * - Handles token expiration or revocation
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('[API Client] Unauthorized 401 detected. Revoking active session.');
      const authStore = useAuthStore.getState();
      const activeStore = authStore.getActiveStore();

      if (activeStore) {
        // Automatically purge invalid credentials for the active store
        await authStore.logout();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

