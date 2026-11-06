import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Scan,
  RefreshCw,
  ShoppingBag,
  ChevronRight,
  X,
  Filter,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import BarcodeScanner from '../../src/components/BarcodeScanner';
import StatusBadge from '../../src/components/ui/StatusBadge';
import CurrencyText from '../../src/components/ui/CurrencyText';
import QuickActionButton from '../../src/components/ui/QuickActionButton';

export interface Order {
  id: number;
  invoice_no: string;
  order_number?: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  shipping_address?: string;
  total_amount: number;
  subtotal?: number;
  status: string;
  is_abandoned?: boolean;
  is_recovered?: boolean;
  created_at: string;
  items?: any[];
}

const STATUS_FILTERS = [
  { key: 'any', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'abandoned', label: 'Abandoned' },
] as const;

export default function OrdersScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [selectedStatus, setSelectedStatus] = useState<string>('any');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [scannerVisible, setScannerVisible] = useState<boolean>(false);

  // 1. Fetch Orders from backend
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['orders_list', activeStore?.id, selectedStatus, searchQuery],
    queryFn: async () => {
      const params: Record<string, any> = { per_page: 50 };
      if (selectedStatus === 'abandoned') {
        params.status = 'abandoned';
      } else if (selectedStatus !== 'any') {
        params.status = selectedStatus;
      } else {
        params.include_abandoned = 1;
      }
      if (searchQuery.trim().length > 0) {
        params.search = searchQuery.trim();
      }

      const response = await apiClient.get('/api/v1/orders', { params });
      return response.data;
    },
    enabled: !!activeStore,
  });

  const orders: Order[] = useMemo(() => {
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [data]);

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const isAbandoned = Boolean(item.is_abandoned || item.status === 'abandoned');
    const isRecovered = Boolean(item.is_recovered);
    const invoiceDisplay = `#${item.invoice_no || item.order_number || item.id}`;

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: isAbandoned
              ? isRecovered
                ? '#bbf7d0'
                : '#fde68a'
              : colors.border,
          },
        ]}
        onPress={() => {
          if (isAbandoned) {
            router.push(`/orders/abandoned/${item.id}` as any);
          } else {
            router.push(`/orders/${item.id}` as any);
          }
        }}
        activeOpacity={0.7}
      >
        {/* Top line: Invoice #, Date, Status pill */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.invoiceDateGroup}>
            <Text style={[styles.invoiceText, { color: colors.text }]}>
              {invoiceDisplay}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {formatShortDate(item.created_at)}
            </Text>
          </View>

          <StatusBadge
            status={isAbandoned ? (isRecovered ? 'recovered' : 'abandoned') : item.status || 'processing'}
            size="sm"
          />
        </View>

        {/* Middle Line: Customer name & Price */}
        <View style={styles.cardMainRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
              {item.customer_name || 'Customer'}
            </Text>
            {item.customer_phone ? (
              <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>
                {item.customer_phone}
              </Text>
            ) : null}
          </View>

          <View style={styles.amountWrapper}>
            <CurrencyText
              amount={item.total_amount}
              currencySymbol={currencySymbol}
              size="md"
              color={colors.text}
              weight="700"
            />
            <ChevronRight size={15} color={colors.textSecondary} style={{ marginLeft: 2 }} />
          </View>
        </View>

        {/* Bottom Actions: 1-Tap Call & WhatsApp */}
        {item.customer_phone ? (
          <View style={styles.cardActionsRow}>
            <QuickActionButton type="call" phone={item.customer_phone} />
            <QuickActionButton
              type="whatsapp"
              phone={item.customer_phone}
              message={
                isAbandoned
                  ? `Hello ${item.customer_name || 'there'}, we noticed you left items in your cart at ${activeStore?.store_name || 'our store'}. Would you like help completing your order?`
                  : `Hello ${item.customer_name || 'there'}, this is regarding your order ${invoiceDisplay} at ${activeStore?.store_name || 'our store'}.`
              }
            />
            <QuickActionButton type="copy" textToCopy={item.customer_phone} label="Copy Phone" />
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* 1. Slim Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Orders</Text>
          <View style={[styles.countPill, { backgroundColor: colors.isDark ? '#312e81' : '#ede9fe' }]}>
            <Text style={[styles.countPillText, { color: colors.isDark ? '#c4b5fd' : '#6d28d9' }]}>
              {orders.length}
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
            onPress={() => setScannerVisible(true)}
            activeOpacity={0.7}
          >
            <Scan size={15} color={colors.text} />
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

      {/* Optional Search Bar */}
      {isSearchActive && (
        <View style={[styles.searchBarBox, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Search size={14} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search invoice #, customer name, phone..."
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

      {/* 2. Horizontal Status Filter Carousel */}
      <View style={[styles.filterBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {STATUS_FILTERS.map((f) => {
            const isActive = selectedStatus === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  isActive
                    ? { backgroundColor: colors.isDark ? '#312e81' : '#ede9fe', borderColor: '#7c3aed' }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setSelectedStatus(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isActive
                        ? colors.isDark
                          ? '#c4b5fd'
                          : '#6d28d9'
                        : colors.textSecondary,
                      fontWeight: isActive ? '700' : '500',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Orders FlatList */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderItem}
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
              <ShoppingBag size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No orders found for this status.
              </Text>
            </View>
          }
        />
      )}

      {/* Barcode Scanner Modal */}
      {scannerVisible && (
        <BarcodeScanner
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScan={(scannedSku) => {
            setScannerVisible(false);
            setSearchQuery(scannedSku);
            setIsSearchActive(true);
          }}
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
  filterBarWrapper: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  filterScrollContent: {
    paddingHorizontal: 10,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 7,
  },
  orderCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 9.5,
    gap: 5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceDateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 10.5,
  },
  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  customerPhone: {
    fontSize: 11,
    marginTop: 1,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionsRow: {
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
