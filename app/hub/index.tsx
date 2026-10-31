import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Tag,
  Star,
  Users,
  Package,
  ShoppingCart,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Store,
  Sparkles,
  Settings,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function HubMenuScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);

  const hubItems = [
    {
      id: 'coupons',
      title: 'Coupons & Promotions',
      subtitle: 'Create promo codes, manage percentage & fixed discounts',
      icon: Tag,
      color: '#0284c7',
      bg: colors.isDark ? '#082f49' : '#e0f2fe',
      route: '/hub/coupons',
    },
    {
      id: 'reviews',
      title: 'Review Moderation',
      subtitle: 'Moderate customer ratings, approve reviews & post replies',
      icon: Star,
      color: '#f59e0b',
      bg: colors.isDark ? '#451a03' : '#fef3c7',
      route: '/hub/reviews',
    },
    {
      id: 'customers',
      title: 'Customer CRM & Directory',
      subtitle: 'Customer profiles, lifetime value (LTV), AOV & order books',
      icon: Users,
      color: '#16a34a',
      bg: colors.isDark ? '#052e16' : '#dcfce7',
      route: '/(tabs)/customers',
    },
    {
      id: 'products',
      title: 'Product Catalog Engine',
      subtitle: 'Create products, variable matrix, media & stock counts',
      icon: Package,
      color: '#9333ea',
      bg: colors.isDark ? '#3b0764' : '#f3e8ff',
      route: '/(tabs)/products',
    },
    {
      id: 'pos',
      title: 'POS / Create Order',
      subtitle: 'Manual terminal order creation with instant catalog search',
      icon: ShoppingCart,
      color: '#ea580c',
      bg: colors.isDark ? '#431407' : '#ffedd5',
      route: '/orders/create',
    },
    {
      id: 'settings',
      title: 'Settings & System Updater',
      subtitle: 'OLED Pure Black theme, audio alerts & self-hosted updater',
      icon: Settings,
      color: '#0284c7',
      bg: colors.isDark ? '#1e293b' : '#f1f5f9',
      route: '/hub/settings',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.screenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Commerce Hub</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            {activeStore?.store_name || 'Store Management Suite'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.badgeStore, { backgroundColor: colors.subtle, borderColor: colors.border }]}
          onPress={() => router.push('/hub/settings')}
          activeOpacity={0.7}
        >
          <Settings size={14} color={colors.primary} />
          <Text style={[styles.badgeStoreText, { color: colors.primary }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: colors.primarySubtle, borderColor: colors.primaryBorder }]}>
          <View style={[styles.bannerIconBox, { backgroundColor: colors.surface }]}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <View style={styles.bannerInfo}>
            <Text style={[styles.bannerTitle, { color: colors.primary }]}>Advanced Merchant Tools</Text>
            <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
              Streamline discounts, moderate social proof, and engage loyal customers.
            </Text>
          </View>
        </View>

        {/* Menu Cards */}
        <View style={styles.menuList}>
          {hubItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuIconBox,
                    { backgroundColor: item.bg },
                  ]}
                >
                  <IconComponent size={22} color={item.color} />
                </View>

                <View style={styles.menuInfo}>
                  <Text style={[styles.menuItemTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </View>

                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeStoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuInfo: {
    flex: 1,
    marginRight: 8,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
