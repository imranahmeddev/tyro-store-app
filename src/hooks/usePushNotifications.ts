import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { playChaChingSound } from '../services/soundService';

export interface PushNotificationState {
  fcmToken: string | null;
  notification: Notifications.Notification | null;
  isRegistered: boolean;
  testSound: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationState {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isInitialized, activeStoreId, getActiveStore } = useAuthStore();
  const activeStore = getActiveStore();

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 0. Push notifications via direct native FCM / APNs tokens are only supported on native mobile devices (iOS/Android).
    if (Platform.OS === 'web') {
      return;
    }

    // Only attempt registration when app is initialized AND an active store profile is connected
    if (!isInitialized || !activeStoreId || !activeStore) {
      return;
    }

    async function registerForPushNotificationsAsync() {
      try {
        // 1. Android Notification Channels: 'order-alerts' with custom 'chaching' audio
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('order-alerts', {
              name: 'New Order Alerts',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#0284c7',
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

        // 2. Physical Device Verification
        if (!Device.isDevice) {
          console.warn('[PushNotifications] Must use a physical device for Push Notifications.');
          return;
        }

        // 3. Permission Request
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

        // 4. Fetch Direct Native FCM / APNs Device Token
        let rawToken: string | null = null;
        try {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          rawToken = tokenData.data;
        } catch (tokenErr) {
          console.warn('[PushNotifications] Failed to obtain device push token:', tokenErr);
          return;
        }

        if (!rawToken) {
          console.warn('[PushNotifications] Device push token is empty.');
          return;
        }

        setFcmToken(rawToken);

        // 5. Register Device Token with Backend
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

          setIsRegistered(true);
          console.log('[PushNotifications] FCM token successfully registered with backend:', rawToken);
        } catch (backendErr) {
          console.warn('[PushNotifications] Backend token registration note:', backendErr);
        }
      } catch (error) {
        console.error('[PushNotifications] Unexpected registration error:', error);
      }
    }

    registerForPushNotificationsAsync();

    // 6. Foreground Notification Listener: Trigger Cha-Ching! & Cache Invalidation
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener(async (incoming) => {
        setNotification(incoming);

        // Play signature cash register chime on new order or abandoned checkout notification
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

    // 7. Background / Tap Response Listener: Direct Deep Link Navigation
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

    return () => {
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
