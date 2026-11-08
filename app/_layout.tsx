import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';

// 1. Prevent native splash screen from hiding prematurely
SplashScreen.preventAutoHideAsync().catch(() => {});

// 2. Global JS Uncaught Exception Catcher (prevents pre-mount crash from killing native process)
if (typeof globalThis !== 'undefined' && (globalThis as any).ErrorUtils) {
  const previousHandler = (globalThis as any).ErrorUtils.getGlobalHandler?.();
  (globalThis as any).ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('[GlobalErrorHandler] Uncaught JS Error:', error, 'Fatal:', isFatal);
    if (!isFatal && previousHandler) {
      try {
        previousHandler(error, isFatal);
      } catch (_) {}
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigation() {
  const { isInitialized, activeStoreId, initialize } = useAuthStore();
  const { initializeTheme, colors } = useThemeStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize FCM Push Notifications (defensively deferred and lazy-loaded after mount)
  usePushNotifications();

  useEffect(() => {
    initialize();
    initializeTheme();
  }, [initialize, initializeTheme]);

  useEffect(() => {
    if (!isInitialized) return;

    // Hide native splash screen once state is hydrated
    SplashScreen.hideAsync().catch(() => {});

    const isLogin = segments[0] === 'login';

    if (!activeStoreId && !isLogin) {
      router.replace('/login');
    } else if (activeStoreId && (isLogin || !segments[0])) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isInitialized, activeStoreId, segments, router]);

  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="analytics/index" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="orders/create" options={{ headerShown: false }} />
        <Stack.Screen name="orders/edit" options={{ headerShown: false }} />
        <Stack.Screen name="orders/abandoned/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="products/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="products/create" options={{ headerShown: false }} />
        <Stack.Screen name="customers/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="hub/index" options={{ headerShown: false }} />
        <Stack.Screen name="hub/coupons/index" options={{ headerShown: false }} />
        <Stack.Screen name="hub/coupons/create" options={{ headerShown: false }} />
        <Stack.Screen name="hub/reviews/index" options={{ headerShown: false }} />
        <Stack.Screen name="hub/settings/index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});
