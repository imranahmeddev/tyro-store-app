import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { playChaChingSound } from '../services/soundService';

export interface PushNotificationState {
  fcmToken: string | null;
  notification: any | null;
  isRegistered: boolean;
  testSound: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationState {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isInitialized, activeStoreId, getActiveStore } = useAuthStore();
  const activeStore = getActiveStore();

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // 0. Push notifications via direct native FCM / APNs tokens are only supported on native mobile devices (iOS/Android).
    if (Platform.OS === 'web') {
      return;
    }

    // Only attempt registration when app is initialized AND an active store profile is connected
    if (!isInitialized || !activeStoreId || !activeStore) {
      return;
    }

    let isMounted = true;
    let timeoutId: any = null;

    async function initPushNotificationsAsync() {
      try {
        // Step 1: Wait 1500ms post-mount delay to allow React Native UI and layout to mount smoothly
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 1500);
        });

        if (!isMounted) return;

        // Step 2: Lazy import expo-notifications and expo-device (never at top-level module scope)
        const Notifications = await import('expo-notifications');
        const Device = await import('expo-device');

        // Configure notification presentation handler safely
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
        } catch (handlerErr) {
          console.warn('[PushNotifications] setNotificationHandler note:', handlerErr);
        }

        // Step 3: Configure Android Notification Channels ('order-alerts' with custom 'chaching' audio)
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('order-alerts', {
              name: 'New Order Alerts',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#7c3aed',
              sound: 'chaching',
              enableLights: true,
              enableVibrate: true,
            });
            await Notifications.setNotificationChannelAsync('order-alerts-v2', {
              name: 'Order Alerts (WooCommerce Chime)',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#7c3aed',
              sound: 'chaching',
              enableLights: true,
              enableVibrate: true,
            });
          } catch (channelErr) {
            console.warn('[PushNotifications] order-alerts with chaching sound failed, falling back to default:', channelErr);
            try {
              await Notifications.setNotificationChannelAsync('order-alerts', {
                name: 'New Order Alerts',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0284c7',
                sound: 'default',
                enableLights: true,
                enableVibrate: true,
              });
            } catch (fallbackErr) {
              console.warn('[PushNotifications] Default channel creation fallback failed:', fallbackErr);
            }
          }

          try {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'General Updates',
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 200, 200],
              lightColor: '#0284c7',
              sound: 'default',
            });
          } catch (defaultChannelErr) {
            console.warn('[PushNotifications] General updates channel note:', defaultChannelErr);
          }
        }

        // Step 4: Physical Device Verification
        if (!Device.isDevice) {
          console.warn('[PushNotifications] Must use a physical device for Push Notifications.');
          return;
        }

        // Step 5: Permission Request
        let finalStatus = 'undetermined';
        try {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
        } catch (permErr) {
          console.warn('[PushNotifications] Permission request error:', permErr);
          return;
        }

        if (finalStatus !== 'granted') {
          console.warn('[PushNotifications] Permission not granted for push notifications.');
          return;
        }

        // Step 6: Fetch Direct Native FCM / APNs Device Token
        let rawToken: string | null = null;
        try {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          rawToken = tokenData.data;
        } catch (tokenErr) {
          console.warn('[PushNotifications] Failed to obtain device push token:', tokenErr);
          return;
        }

        if (!rawToken || !isMounted) {
          return;
        }

        setFcmToken(rawToken);

        // Step 7: Register Device Token with Backend
        try {
          const deviceName =
            Device.modelName ||
            Device.deviceName ||
            `${Platform.OS.toUpperCase()} Device`;

          const platform = Platform.OS === 'ios' ? 'ios' : 'android';

          await apiClient.post('/api/v1/devices', {
            token: rawToken,
            platform,
            device_name: deviceName,
          });

          if (isMounted) {
            setIsRegistered(true);
          }
          console.log('[PushNotifications] FCM token successfully registered with backend:', rawToken);
        } catch (backendErr) {
          console.warn('[PushNotifications] Backend token registration note:', backendErr);
        }

        // Step 8: Foreground Notification Listener
        try {
          notificationListener.current = Notifications.addNotificationReceivedListener(async (incoming) => {
            if (isMounted) {
              setNotification(incoming);
            }

            // Play signature cash register chime / haptic on new order or abandoned checkout
            const data = incoming.request.content.data;
            const title = incoming.request.content.title || '';
            const isOrderAlert =
              data?.type === 'new_order' ||
              data?.type === 'abandoned_checkout' ||
              title.toLowerCase().includes('order') ||
              title.toLowerCase().includes('sale') ||
              title.toLowerCase().includes('abandoned') ||
              title.toLowerCase().includes('cart');

            if (isOrderAlert) {
              await playChaChingSound();
            }

            // Auto-invalidate TanStack Query caches for instant UI update
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders_list'] });
            queryClient.invalidateQueries({ queryKey: ['abandoned_checkouts'] });
            queryClient.invalidateQueries({ queryKey: ['abandoned_stats'] });
            queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_analytics'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
          });
        } catch (listenerErr) {
          console.warn('[PushNotifications] Foreground listener registration note:', listenerErr);
        }

        // Step 9: Background / Tap Response Listener: Direct Deep Link Navigation
        try {
          responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
            console.log('[PushNotifications] Notification response received:', response);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['orders_list'] });
            queryClient.invalidateQueries({ queryKey: ['abandoned_checkouts'] });
            queryClient.invalidateQueries({ queryKey: ['abandoned_stats'] });
            queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_analytics'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });

            const data = response.notification.request.content.data;
            if (data?.type === 'abandoned_checkout' && data?.abandoned_id) {
              router.push(`/orders/abandoned/${data.abandoned_id}` as any);
            } else if (data?.order_id) {
              router.push(`/orders/${data.order_id}` as any);
            } else {
              router.push('/(tabs)/orders' as any);
            }
          });
        } catch (responseErr) {
          console.warn('[PushNotifications] Response listener registration note:', responseErr);
        }
      } catch (err) {
        console.warn('[PushNotifications] Initialization error:', err);
      }
    }

    initPushNotificationsAsync();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (_) {}
    };
  }, [isInitialized, activeStoreId, activeStore?.id, queryClient]);

  const testSound = async () => {
    await playChaChingSound();
  };

  return { fcmToken, notification, isRegistered, testSound };
}
