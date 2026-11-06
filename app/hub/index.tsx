import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Tag,
  Star,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Settings,
  ChevronRight,
  Store,
  ExternalLink,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function HubMenuScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);

  const hubItems = [
    {
      id: 'pos',
      title: 'POS / New Order',
      subtitle: 'Manual terminal order creation',
      icon: ShoppingCart,
      color: '#ea580c',
      bg: colors.isDark ? '#431407' : '#ffedd5',
      route: '/orders/create',
    },
    {
      id: 'analytics',
      title: 'Store Analytics',
      subtitle: 'Full revenue & sales breakdown',
      icon: TrendingUp,
      color: '#7c3aed',
      bg: colors.isDark ? '#2e1065' : '#ede9fe',
      route: '/analytics',
    },
    {
      id: 'customers',
      title: 'Customer Directory',
      subtitle: 'Customer profiles & contact list',
      icon: Users,
      color: '#16a34a',
      bg: colors.isDark ? '#052e16' : '#dcfce7',
      route: '/(tabs)/customers',
    },
    {
      id: 'products',
      title: 'Product Catalog',
      subtitle: 'Items, pricing, stock levels',
      icon: Package,
      color: '#0284c7',
      bg: colors.isDark ? '#082f49' : '#e0f2fe',
      route: '/(tabs)/products',
    },
    {
      id: 'coupons',
      title: 'Coupons & Promo',
      subtitle: 'Discount promo codes',
      icon: Tag,
      color: '#0891b2',
      bg: colors.isDark ? '#164e63' : '#cffafe',
      route: '/hub/coupons',
    },
    {
      id: 'reviews',
      title: 'Customer Reviews',
      subtitle: 'Moderate product ratings',
      icon: Star,
      color: '#d97706',
      bg: colors.isDark ? '#451a03' : '#fef3c7',
      route: '/hub/reviews',
    },
    {
      id: 'settings',
      title: 'Settings & Alerts',
      subtitle: 'OLED theme, sound, notifications',
      icon: Settings,
      color: '#475569',
      bg: colors.isDark ? '#27272a' : '#f1f5f9',
      route: '/hub/settings',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Slim Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Commerce Hub</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            {activeStore?.store_name || 'Store Operations'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.subtle }]}
          onPress={() => router.push('/hub/settings')}
          activeOpacity={0.7}
        >
          <Settings size={15} color={colors.text} />
          <Text style={[styles.settingsBtnText, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {hubItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                  <IconComponent size={18} color={item.color} />
                </View>

                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>

                <ChevronRight size={15} color={colors.textMuted} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 10.5,
    marginTop: 0.5,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  settingsBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 24,
  },
  menuGrid: {
    gap: 7,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 9.5,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardInfo: {
    flex: 1,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
});
