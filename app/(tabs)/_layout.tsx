import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { BarChart2, FileText, Package, LayoutGrid } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function TabsLayout() {
  const colors = useThemeStore((s) => s.colors);
  const activeStore = useAuthStore((s) => s.getActiveStore());

  // Fetch real order count for live WooCommerce badge (Matches live connected store)
  const { data: ordersData } = useQuery({
    queryKey: ['wc_orders_badge', activeStore?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/orders', {
          params: { per_page: 50 },
        });
        const list = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        return list;
      } catch {
        return [];
      }
    },
    enabled: !!activeStore,
    refetchInterval: 30000,
  });

  const processingCount = Array.isArray(ordersData)
    ? ordersData.filter((o: any) => {
        const s = String(o.status || '').toLowerCase();
        return s === 'processing' || s === 'pending' || (s === 'abandoned' && !o.is_recovered);
      }).length
    : 0;
  const processingBadge = processingCount > 0 ? String(processingCount) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#c084fc', // WooCommerce Active Purple
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: colors.isDark ? '#18181b' : '#ffffff',
          borderTopColor: colors.isDark ? '#27272a' : '#e4e4e7',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* 1. My store (bar chart icon) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'My store',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <BarChart2 size={22} color={focused ? '#c084fc' : color} />
            </View>
          ),
        }}
      />

      {/* 2. Orders (receipt/document icon with purple badge) */}
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarBadge: processingBadge,
          tabBarBadgeStyle: {
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 18,
            top: Platform.OS === 'ios' ? -2 : 0,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <FileText size={22} color={focused ? '#c084fc' : color} />
            </View>
          ),
        }}
      />

      {/* 3. Products (package/box icon) */}
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <Package size={22} color={focused ? '#c084fc' : color} />
            </View>
          ),
        }}
      />

      {/* 4. Menu (4-dots/grid icon) */}
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && styles.activePill]}>
              <LayoutGrid size={22} color={focused ? '#c084fc' : color} />
            </View>
          ),
        }}
      />

      {/* Hidden Customers Screen (Preserves route) */}
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
    width: 44,
    height: 28,
    borderRadius: 14,
  },
  activePill: {
    backgroundColor: 'rgba(139, 92, 246, 0.22)', // WooCommerce Signature Translucent Purple Pill
  },
});
