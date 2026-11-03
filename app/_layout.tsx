import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';

// Prevent native splash screen from hiding prematurely
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function RootNavigation() {
  const { isInitialized, activeStoreId, initialize } = useAuthStore();
  const { initializeTheme, colors } = useThemeStore();
  const segments = useSegments();
  const router = useRouter();

  // Safely configure foreground notification presentation after mount
  useEffect(() => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (e) {
      console.warn('[RootNavigation] Notifications.setNotificationHandler note:', e);
    }
  }, []);

  // Initialize FCM Push Notifications (defensively deferred until isInitialized && activeStoreId)
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
      <QueryClientProvider client={queryClient}>
        <RootNavigation />
      </QueryClientProvider>
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
