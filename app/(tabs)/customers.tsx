import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Users,
  Search,
  RefreshCw,
  X,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import CurrencyText from '../../src/components/ui/CurrencyText';
import QuickActionButton from '../../src/components/ui/QuickActionButton';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  total_orders?: number;
  total_spent?: number;
  created_at: string;
}

export default function CustomersScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // 1. Fetch Customers
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['customers', activeStore?.id, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '50' };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await apiClient.get('/api/v1/customers', { params });
      return response.data;
    },
    enabled: !!activeStore,
  });

  const customers: Customer[] = Array.isArray(data) ? data : data?.data ?? [];

  const getInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => {
    return (
      <TouchableOpacity
        style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/customers/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.avatarLeftGroup}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
                {item.name || 'Unnamed Customer'}
              </Text>
              {item.phone ? (
                <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>
                  {item.phone}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.metricsCol}>
            <CurrencyText
              amount={item.total_spent ?? 0}
              currencySymbol={currencySymbol}
              size="sm"
              color={colors.text}
              weight="700"
            />
            <Text style={[styles.ordersCountText, { color: colors.textSecondary }]}>
              {item.total_orders ?? 0} orders
            </Text>
          </View>
        </View>

        {/* Quick Contact Line */}
        {item.phone ? (
          <View style={styles.actionsLine}>
            <QuickActionButton type="call" phone={item.phone} />
            <QuickActionButton
              type="whatsapp"
              phone={item.phone}
              message={`Hello ${item.name || ''}, greetings from ${activeStore?.store_name || 'our store'}!`}
            />
            <QuickActionButton type="copy" textToCopy={item.phone} label="Copy" />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* 1. Slim Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Customers</Text>
          <View style={[styles.countPill, { backgroundColor: colors.isDark ? '#312e81' : '#ede9fe' }]}>
            <Text style={[styles.countPillText, { color: colors.isDark ? '#c4b5fd' : '#6d28d9' }]}>
              {customers.length}
            </Text>
          </View>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.subtle }]}
            onPress={() => setIsSearchActive((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Search size={15} color={isSearchActive ? '#7c3aed' : colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.subtle }]}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <RefreshCw size={15} color={isRefetching ? '#7c3aed' : colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      {isSearchActive && (
        <View style={[styles.searchBarBox, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Search size={14} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search customer name or phone..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <X size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Customer List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#7c3aed"
              colors={['#7c3aed']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No customers found.
              </Text>
            </View>
          }
        />
      )}
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
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  countPill: {
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  countPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 12.5,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 7,
  },
  customerCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 9.5,
    gap: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    marginRight: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  customerName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  customerPhone: {
    fontSize: 11,
    marginTop: 0.5,
  },
  metricsCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  ordersCountText: {
    fontSize: 10.5,
  },
  actionsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
  },
});
