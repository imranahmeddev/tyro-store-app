import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  STORES: 'tyro_stores',
  ACTIVE_STORE_ID: 'tyro_active_store_id',
  ACTIVE_TOKEN: 'tyro_active_token',
} as const;

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  is_super_admin: boolean;
}

export interface StoreProfile {
  id: string;
  store_name: string;
  store_url: string;
  access_token: string;
  user_info: UserInfo;
  currency?: string;
  logo?: string | null;
  created_at: string;
}

export interface AuthState {
  stores: StoreProfile[];
  activeStoreId: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Getters & Helper Selectors
  getActiveStore: () => StoreProfile | null;
  getActiveToken: () => string | null;
  hasPermission: (permission: string) => boolean;

  // Actions
  initialize: () => Promise<void>;
  addStore: (profile: Omit<StoreProfile, 'id' | 'created_at'> & { id?: string }) => Promise<StoreProfile>;
  switchStore: (storeId: string) => Promise<void>;
  updateActiveStore: (partial: Partial<Omit<StoreProfile, 'id'>>) => Promise<void>;
  removeStore: (storeId: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Platform-resilient SecureStore Wrapper
const isWeb = Platform.OS === 'web';

async function secureSet(key: string, value: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.error(`[SecureStore] Error setting key ${key}:`, err);
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.error(`[SecureStore] Error reading key ${key}:`, err);
    return null;
  }
}

async function secureDelete(key: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.error(`[SecureStore] Error deleting key ${key}:`, err);
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  stores: [],
  activeStoreId: null,
  isLoading: false,
  isInitialized: false,

  getActiveStore: () => {
    const { stores, activeStoreId } = get();
    return stores.find((s) => s.id === activeStoreId) || null;
  },

  getActiveToken: () => {
    const active = get().getActiveStore();
    return active ? active.access_token : null;
  },

  hasPermission: (permission: string) => {
    const active = get().getActiveStore();
    if (!active || !active.user_info) return false;
    if (active.user_info.is_super_admin) return true;
    return active.user_info.permissions?.includes(permission) ?? false;
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const [rawStores, activeId] = await Promise.all([
        secureGet(STORAGE_KEYS.STORES),
        secureGet(STORAGE_KEYS.ACTIVE_STORE_ID),
      ]);

      let stores: StoreProfile[] = [];
      if (rawStores) {
        try {
          stores = JSON.parse(rawStores);
        } catch {
          stores = [];
        }
      }

      let validActiveId = activeId;
      if (!stores.some((s) => s.id === validActiveId)) {
        validActiveId = stores.length > 0 ? stores[0].id : null;
      }

      const activeStore = stores.find((s) => s.id === validActiveId);
      if (activeStore) {
        await secureSet(STORAGE_KEYS.ACTIVE_TOKEN, activeStore.access_token);
      } else {
        await secureDelete(STORAGE_KEYS.ACTIVE_TOKEN);
      }

      set({
        stores,
        activeStoreId: validActiveId,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('[AuthStore] Initialization failed:', error);
      set({ stores: [], activeStoreId: null, isInitialized: true, isLoading: false });
    }
  },

  addStore: async (profile) => {
    set({ isLoading: true });
    try {
      const normalizedUrl = profile.store_url.trim().replace(/\/+$/, '');
      const newStore: StoreProfile = {
        ...profile,
        store_url: normalizedUrl,
        id: profile.id || `store_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
      };

      const currentStores = get().stores.filter((s) => s.id !== newStore.id);
      const updatedStores = [...currentStores, newStore];

      await Promise.all([
        secureSet(STORAGE_KEYS.STORES, JSON.stringify(updatedStores)),
        secureSet(STORAGE_KEYS.ACTIVE_STORE_ID, newStore.id),
        secureSet(STORAGE_KEYS.ACTIVE_TOKEN, newStore.access_token),
      ]);

      set({
        stores: updatedStores,
        activeStoreId: newStore.id,
        isLoading: false,
      });

      return newStore;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  switchStore: async (storeId: string) => {
    const targetStore = get().stores.find((s) => s.id === storeId);
    if (!targetStore) {
      throw new Error(`Store with id "${storeId}" not found.`);
    }

    set({ isLoading: true });
    try {
      await Promise.all([
        secureSet(STORAGE_KEYS.ACTIVE_STORE_ID, targetStore.id),
        secureSet(STORAGE_KEYS.ACTIVE_TOKEN, targetStore.access_token),
      ]);

      set({
        activeStoreId: targetStore.id,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateActiveStore: async (partial) => {
    const active = get().getActiveStore();
    if (!active) return;

    const updatedStore: StoreProfile = {
      ...active,
      ...partial,
      store_url: partial.store_url ? partial.store_url.trim().replace(/\/+$/, '') : active.store_url,
    };

    const updatedStores = get().stores.map((s) => (s.id === active.id ? updatedStore : s));

    await Promise.all([
      secureSet(STORAGE_KEYS.STORES, JSON.stringify(updatedStores)),
      partial.access_token ? secureSet(STORAGE_KEYS.ACTIVE_TOKEN, partial.access_token) : Promise.resolve(),
    ]);

    set({ stores: updatedStores });
  },

  removeStore: async (storeId: string) => {
    const { stores, activeStoreId } = get();
    const remainingStores = stores.filter((s) => s.id !== storeId);
    let newActiveId = activeStoreId;

    if (activeStoreId === storeId) {
      newActiveId = remainingStores.length > 0 ? remainingStores[0].id : null;
    }

    const nextActiveStore = remainingStores.find((s) => s.id === newActiveId);

    await Promise.all([
      secureSet(STORAGE_KEYS.STORES, JSON.stringify(remainingStores)),
      newActiveId
        ? secureSet(STORAGE_KEYS.ACTIVE_STORE_ID, newActiveId)
        : secureDelete(STORAGE_KEYS.ACTIVE_STORE_ID),
      nextActiveStore
        ? secureSet(STORAGE_KEYS.ACTIVE_TOKEN, nextActiveStore.access_token)
        : secureDelete(STORAGE_KEYS.ACTIVE_TOKEN),
    ]);

    set({
      stores: remainingStores,
      activeStoreId: newActiveId,
    });
  },

  logout: async () => {
    const { activeStoreId } = get();
    if (activeStoreId) {
      await get().removeStore(activeStoreId);
    } else {
      await Promise.all([
        secureDelete(STORAGE_KEYS.STORES),
        secureDelete(STORAGE_KEYS.ACTIVE_STORE_ID),
        secureDelete(STORAGE_KEYS.ACTIVE_TOKEN),
      ]);
      set({ stores: [], activeStoreId: null });
    }
  },
}));

