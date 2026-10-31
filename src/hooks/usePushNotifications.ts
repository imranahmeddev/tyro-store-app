import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
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
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());

  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // 0. Push notifications via direct native FCM / APNs tokens are only supported on native mobile devices (iOS/Android).
    // Silently skip on web preview to avoid VAPID missing key errors.
    if (Platform.OS === 'web') {
      return;
    }

    // Only attempt registration when an active store profile is connected
    if (!activeStore) {
      return;
    }

    async function registerForPushNotificationsAsync() {
      try {
        // 1. Android Notification Channels: 'order-alerts' with custom 'chaching' audio
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('order-alerts', {
            name: 'New Order Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0284c7',
            sound: 'chaching',
            enableLights: true,
            enableVibrate: true,
          });

          await Notifications.setNotificationChannelAsync('default', {
            name: 'General Updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200, 200],
            lightColor: '#0284c7',
            sound: 'default',
          });
        }

        // 2. Physical Device Verification
        if (!Device.isDevice) {
          console.warn('[PushNotifications] Must use a physical device for Push Notifications.');
          return;
        }

        // 3. Permission Request
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[PushNotifications] Permission not granted for push notifications.');
          return;
        }

        // 4. Fetch Direct Native FCM / APNs Device Token
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const rawToken = tokenData.data;

        if (!rawToken) {
          console.warn('[PushNotifications] Failed to obtain device push token.');
          return;
        }

        setFcmToken(rawToken);

        // 5. Register Device Token with Backend
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
      } catch (error) {
        console.error('[PushNotifications] Registration error:', error);
      }
    }

    registerForPushNotificationsAsync();

    // 6. Foreground Notification Listener: Trigger Cha-Ching! & Cache Invalidation
    notificationListener.current = Notifications.addNotificationReceivedListener(async (incoming) => {
      setNotification(incoming);

      // Play signature cash register chime on new order notification
      const data = incoming.request.content.data;
      const title = incoming.request.content.title || '';
      const isOrder =
        data?.type === 'new_order' ||
        title.toLowerCase().includes('order') ||
        title.toLowerCase().includes('sale');

      if (isOrder) {
        await playChaChingSound();
      }

      // Auto-invalidate TanStack Query caches for instant UI update
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
    });

    // 7. Background / Tap Response Listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[PushNotifications] Notification response received:', response);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [activeStore?.id, queryClient]);

  const testSound = async () => {
    await playChaChingSound();
  };

  return { fcmToken, notification, isRegistered, testSound };
}
