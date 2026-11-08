import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, ShoppingBag, Package, Grid } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const activeStore = useAuthStore((s) => s.getActiveStore());

  // Real-time pending & processing count for the Orders tab badge (Ultra-fast <1ms counts endpoint)
  const { data: ordersCounts } = useQuery({
    queryKey: ['wc_orders_badge', activeStore?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/orders/counts');
        return res.data;
      } catch {
        // Fallback to lightweight query if endpoint not available yet
        try {
          const fallback = await apiClient.get('/api/v1/orders', { params: { per_page: 20, status: 'pending' } });
          const list = Array.isArray(fallback.data) ? fallback.data : fallback.data?.data ?? [];
          return { pending: list.length, processing: 0 };
        } catch {
          return { pending: 0, processing: 0 };
        }
      }
    },
    enabled: !!activeStore,
    refetchInterval: () => (AppState.currentState === 'active' ? 60000 : false),
  });

  const pendingCount = (ordersCounts?.pending ?? 0) + (ordersCounts?.processing ?? 0);

  const ordersBadge = pendingCount > 0 ? (pendingCount > 99 ? '99+' : String(pendingCount)) : undefined;

  const activeTintColor = colors.isDark ? '#a78bfa' : '#6d28d9';
  const inactiveTintColor = colors.isDark ? '#71717a' : '#94a3b8';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTintColor,
        tabBarInactiveTintColor: inactiveTintColor,
        tabBarStyle: {
          backgroundColor: colors.isDark ? '#09090b' : '#ffffff',
          borderTopColor: colors.isDark ? '#27272a' : '#f1f5f9',
          borderTopWidth: 1,
          height: 52 + Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 8),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 6),
          paddingTop: 5,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: colors.isDark ? 0.3 : 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '600',
          marginTop: 1,
        },
      }}
    >
      {/* 1. Dashboard Tab */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Store',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(109, 40, 217, 0.1)' }]}>
              <LayoutDashboard size={20} color={focused ? activeTintColor : color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />

      {/* 2. Orders Tab */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarBadge: ordersBadge,
          tabBarBadgeStyle: {
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            fontSize: 9.5,
            fontWeight: '700',
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            lineHeight: 16,
            top: Platform.OS === 'ios' ? -2 : 0,
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(109, 40, 217, 0.1)' }]}>
              <ShoppingBag size={20} color={focused ? activeTintColor : color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />

      {/* 3. Products Tab */}
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(109, 40, 217, 0.1)' }]}>
              <Package size={20} color={focused ? activeTintColor : color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />

      {/* 4. Menu / Hub Tab */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(109, 40, 217, 0.1)' }]}>
              <Grid size={20} color={focused ? activeTintColor : color} strokeWidth={focused ? 2.4 : 1.9} />
            </View>
          ),
        }}
      />

      {/* Hidden Customers Tab */}
      <Tabs.Screen
        name="customers"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 26,
    borderRadius: 13,
  },
});
