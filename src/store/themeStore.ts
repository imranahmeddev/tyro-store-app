import { create } from 'zustand';
import { Appearance, ColorSchemeName, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  isDark: boolean;
  background: string;
  surface: string;
  card: string;
  subtle: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySubtle: string;
  primaryBorder: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  statusBarStyle: 'light' | 'dark';
}

const LightTheme: ThemeColors = {
  isDark: false,
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  subtle: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  primary: '#0284c7',
  primarySubtle: '#f0f9ff',
  primaryBorder: '#bae6fd',
  success: '#16a34a',
  successBg: '#dcfce7',
  warning: '#d97706',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  statusBarStyle: 'dark',
};

// True OLED Deep Black (#000000) for maximum battery savings on AMOLED displays
const DarkTheme: ThemeColors = {
  isDark: true,
  background: '#000000',
  surface: '#09090b',
  card: '#121214',
  subtle: '#18181b',
  border: '#27272a',
  text: '#f8fafc',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  primary: '#38bdf8',
  primarySubtle: '#082f49',
  primaryBorder: '#0369a1',
  success: '#22c55e',
  successBg: '#052e16',
  warning: '#f59e0b',
  warningBg: '#451a03',
  danger: '#ef4444',
  dangerBg: '#450a0a',
  statusBarStyle: 'light',
};

const THEME_STORAGE_KEY = 'tyro_theme_mode';

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isInitialized: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

function resolveColors(mode: ThemeMode): ThemeColors {
  if (mode === 'light') return LightTheme;
  if (mode === 'dark') return DarkTheme;

  // System mode
  const sysScheme = Appearance.getColorScheme();
  return sysScheme === 'dark' ? DarkTheme : LightTheme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  colors: resolveColors('system'),
  isInitialized: false,

  setMode: async (mode: ThemeMode) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } else {
        await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
      }
    } catch (e) {
      console.warn('[ThemeStore] Failed to persist theme:', e);
    }

    set({
      mode,
      colors: resolveColors(mode),
    });
  },

  initializeTheme: async () => {
    let savedMode: ThemeMode = 'system';
    try {
      if (Platform.OS === 'web') {
        const val = localStorage.getItem(THEME_STORAGE_KEY);
        if (val === 'light' || val === 'dark' || val === 'system') {
          savedMode = val;
        }
      } else {
        const val = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (val === 'light' || val === 'dark' || val === 'system') {
          savedMode = val;
        }
      }
    } catch (e) {
      console.warn('[ThemeStore] Error reading saved theme:', e);
    }

    set({
      mode: savedMode,
      colors: resolveColors(savedMode),
      isInitialized: true,
    });

    // Listen to device system theme changes
    Appearance.addChangeListener(({ colorScheme }) => {
      const currentMode = get().mode;
      if (currentMode === 'system') {
        set({ colors: colorScheme === 'dark' ? DarkTheme : LightTheme });
      }
    });
  },
}));

