import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
  TextInput,
  SectionList,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Scan,
  Search,
  Plus,
  ChevronRight,
  RotateCcw,
  Clock,
  Check,
  X,
  AlertCircle,
  Package,
  Phone,
  MessageCircle,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import BarcodeScanner from '../../src/components/BarcodeScanner';

export interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  variant?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price?: number;
  image?: string | null;
}

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
  admin_note?: string | null;
  last_active_at?: string;
  created_at: string;
  channel?: string;
  items?: OrderItem[];
}

const STATUS_OPTIONS = [
  { key: 'any', label: 'All' },
  { key: 'abandoned', label: 'Abandoned' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'completed', label: 'Completed' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'return', label: 'Return' },
];

const DATE_RANGE_OPTIONS = [
  { key: 'any', label: 'Any' },
  { key: 'today', label: 'Today' },
  { key: '7days', label: 'Last 7 Days' },
  { key: '30days', label: 'Last 30 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year', label: 'This Year' },
];

const CHANNEL_OPTIONS = [
  { key: 'any', label: 'Any' },
  { key: 'web', label: 'Web Checkout' },
  { key: 'pos', label: 'POS Order' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  // State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeSubPicker, setActiveSubPicker] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Filter Values (Matching order page filtering.jfif)
  const [selectedStatus, setSelectedStatus] = useState<string>('any');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('any');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('any');

  // Pending filter states for modal
  const [tempStatus, setTempStatus] = useState<string>('any');
  const [tempDateRange, setTempDateRange] = useState<string>('any');
  const [tempCustomer, setTempCustomer] = useState<string>('');
  const [tempChannel, setTempChannel] = useState<string>('any');

  // Last updated timestamp
  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });

  // Fetch Abandoned Checkout stats for live count badge
  const { data: abandonedStats } = useQuery({
    queryKey: ['abandoned_stats', activeStore?.id],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/abandoned-checkouts', { params: { per_page: 1 } });
        return res.data?.stats ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!activeStore,
    refetchInterval: 30000,
  });

  // 1. Fetch Orders from Backend with Status & Search parameters (Zero N+1)
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'orders_list',
      activeStore?.id,
      selectedStatus,
      selectedDateRange,
      customerFilter,
      selectedChannel,
      searchQuery,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { per_page: 50 };
      if (selectedStatus === 'abandoned') {
        params.status = 'abandoned';
      } else if (selectedStatus !== 'any') {
        params.status = selectedStatus;
      } else {
        params.include_abandoned = 1;
      }
      if (selectedDateRange !== 'any') params.date_range = selectedDateRange;
      if (customerFilter.trim().length > 0) params.customer = customerFilter.trim();
      if (selectedChannel !== 'any') params.sales_channel = selectedChannel;
      if (searchQuery.trim().length > 0) params.search = searchQuery.trim();

      const response = await apiClient.get('/api/v1/orders', { params });
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      return response.data;
    },
    enabled: !!activeStore,
  });

  const rawOrders: Order[] = useMemo(() => {
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [data]);

  // Group orders into Sections matching Screenshot 1 (e.g. "OLDER THAN A MONTH", "THIS MONTH", "TODAY")
  const sections = useMemo(() => {
    if (rawOrders.length === 0) return [];

    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(now.getDate() - 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const todayStr = now.toDateString();

    const groups: { [key: string]: Order[] } = {
      TODAY: [],
      'THIS WEEK': [],
      'THIS MONTH': [],
      'OLDER THAN A MONTH': [],
    };

    rawOrders.forEach((ord) => {
      const orderDate = new Date(ord.created_at);
      if (isNaN(orderDate.getTime())) {
        groups['OLDER THAN A MONTH'].push(ord);
        return;
      }

      if (orderDate.toDateString() === todayStr) {
        groups['TODAY'].push(ord);
      } else if (orderDate >= sevenDaysAgo) {
        groups['THIS WEEK'].push(ord);
      } else if (orderDate >= oneMonthAgo) {
        groups['THIS MONTH'].push(ord);
      } else {
        groups['OLDER THAN A MONTH'].push(ord);
      }
    });

    const result: { title: string; data: Order[] }[] = [];
    if (groups['TODAY'].length > 0) result.push({ title: 'TODAY', data: groups['TODAY'] });
    if (groups['THIS WEEK'].length > 0) result.push({ title: 'THIS WEEK', data: groups['THIS WEEK'] });
    if (groups['THIS MONTH'].length > 0) result.push({ title: 'THIS MONTH', data: groups['THIS MONTH'] });
    if (groups['OLDER THAN A MONTH'].length > 0) result.push({ title: 'OLDER THAN A MONTH', data: groups['OLDER THAN A MONTH'] });

    // Fallback if dates were unparsed
    if (result.length === 0 && rawOrders.length > 0) {
      result.push({ title: 'ALL ORDERS', data: rawOrders });
    }

    return result;
  }, [rawOrders]);

  // Status Badge Styling (Matches WooCommerce screenshot pill: Mint Green for Processing)
  const getStatusBadgeStyle = (status?: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'abandoned':
        return {
          bg: '#fef3c7',
          text: '#b45309',
          label: 'Abandoned Cart',
        };
      case 'recovered':
        return {
          bg: '#dcfce7',
          text: '#15803d',
          label: 'Recovered',
        };
      case 'processing':
        return {
          bg: '#dcfce7',
          text: '#15803d',
          label: 'Processing',
        };
      case 'completed':
      case 'delivered':
        return {
          bg: '#dcfce7',
          text: '#16a34a',
          label: 'Completed',
        };
      case 'pending':
        return {
          bg: '#fef3c7',
          text: '#d97706',
          label: 'Pending',
        };
      case 'confirmed':
        return {
          bg: '#e0f2fe',
          text: '#0284c7',
          label: 'Confirmed',
        };
      case 'cancelled':
      case 'failed':
        return {
          bg: '#fee2e2',
          text: '#dc2626',
          label: 'Cancelled',
        };
      case 'on hold':
      case 'on_hold':
        return {
          bg: '#ffedd5',
          text: '#ea580c',
          label: 'On hold',
        };
      default:
        return {
          bg: '#f1f5f9',
          text: '#64748b',
          label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Processing',
        };
    }
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  const openFilterModal = () => {
    setTempStatus(selectedStatus);
    setTempDateRange(selectedDateRange);
    setTempCustomer(customerFilter);
    setTempChannel(selectedChannel);
    setActiveSubPicker(null);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedStatus(tempStatus);
    setSelectedDateRange(tempDateRange);
    setCustomerFilter(tempCustomer);
    setSelectedChannel(tempChannel);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempStatus('any');
    setTempDateRange('any');
    setTempCustomer('');
    setTempChannel('any');
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    // 1. Specialized Abandoned Cart Order Card
    if (order.is_abandoned || order.status === 'abandoned') {
      const isRecovered = Boolean(order.is_recovered);
      const itemsCount = order.items?.length || 0;
      const firstItemName = order.items?.[0]?.product_name;
      const previewText = itemsCount > 0
        ? `${itemsCount} item${itemsCount > 1 ? 's' : ''}${firstItemName ? ` (${firstItemName}${itemsCount > 1 ? '...' : ''})` : ''}`
        : 'Items in cart';

      const handleCall = () => {
        if (order.customer_phone) {
          Linking.openURL(`tel:${order.customer_phone.replace(/[^0-9+]/g, '')}`);
        }
      };

      const handleWhatsApp = () => {
        if (order.customer_phone) {
          const cleanPhone = order.customer_phone.replace(/[^0-9]/g, '');
          const storeName = activeStore?.store_name || 'our store';
          const msg = `Hello ${order.customer_name || 'there'},\n\nWe noticed you left some items in your cart at ${storeName}. Do you need any assistance completing your order?`;
          const waUrl = `https://wa.me/${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}?text=${encodeURIComponent(msg)}`;
          Linking.openURL(waUrl);
        }
      };

      return (
        <TouchableOpacity
          style={[
            styles.abandonedCard,
            {
              backgroundColor: colors.isDark ? '#141416' : '#ffffff',
              borderColor: colors.isDark ? '#27272a' : isRecovered ? '#bbf7d0' : '#fde68a',
            },
          ]}
          onPress={() => router.push(`/orders/abandoned/${order.id}` as any)}
          activeOpacity={0.7}
        >
          {/* Top row: ABN badge and Date */}
          <View style={styles.abandonedTopRow}>
            <View
              style={[
                styles.abandonedBadge,
                isRecovered ? styles.recoveredBadgeBg : styles.abandonedBadgeBg,
              ]}
            >
              <ShoppingBag size={12} color={isRecovered ? '#15803d' : '#b45309'} />
              <Text
                style={[
                  styles.abandonedBadgeText,
                  { color: isRecovered ? '#15803d' : '#b45309' },
                ]}
              >
                {isRecovered ? 'RECOVERED' : 'ABANDONED CART'}
              </Text>
            </View>

            <Text style={[styles.orderDateTop, { color: colors.textSecondary }]}>
              {formatShortDate(order.created_at)}
            </Text>
          </View>

          {/* Customer & Amount */}
          <View style={styles.orderMainRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.orderTitleText, { color: colors.text }]} numberOfLines={1}>
                {order.customer_name || 'Customer'}
              </Text>
              {order.customer_phone ? (
                <Text style={[styles.customerPhoneSub, { color: colors.textSecondary }]}>
                  {order.customer_phone}
                </Text>
              ) : null}
            </View>

            <View style={styles.orderAmountWrapper}>
              <Text
                style={[
                  styles.orderAmountText,
                  { color: isRecovered ? '#16a34a' : '#d97706', fontWeight: '800' },
                ]}
              >
                {Math.round(order.total_amount).toLocaleString('en-IN')}{currencySymbol}
              </Text>
              <ChevronRight size={18} color={colors.textSecondary} />
            </View>
          </View>

          {/* Items preview */}
          <Text style={[styles.abandonedPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
            🛒 {previewText}
          </Text>

          {/* Quick Actions Row */}
          <View style={styles.abandonedActionsRow}>
            {order.customer_phone ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.quickActionBtn,
                    { backgroundColor: colors.isDark ? '#1e293b' : '#f0fdf4' },
                  ]}
                  onPress={handleCall}
                  activeOpacity={0.7}
                >
                  <Phone size={13} color="#16a34a" />
                  <Text style={[styles.quickActionBtnText, { color: '#16a34a' }]}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickActionBtn,
                    { backgroundColor: colors.isDark ? '#1e293b' : '#f0fdf4' },
                  ]}
                  onPress={handleWhatsApp}
                  activeOpacity={0.7}
                >
                  <MessageCircle size={13} color="#16a34a" />
                  <Text style={[styles.quickActionBtnText, { color: '#16a34a' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </>
            ) : null}

            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: colors.isDark ? '#2e1065' : '#f5f3ff', marginLeft: 'auto' },
              ]}
              onPress={() => router.push(`/orders/abandoned/${order.id}` as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickActionBtnText, { color: '#8b5cf6', fontWeight: '700' }]}>
                {isRecovered ? 'Details' : 'Recover'}
              </Text>
              <ArrowUpRight size={13} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    // 2. Standard WooCommerce Order Row
    const badge = getStatusBadgeStyle(order.status);
    const invoiceDisplay = `#${order.invoice_no || order.order_number || order.id}`;
    const customerDisplay = order.customer_name ? ` ${order.customer_name}` : '';

    return (
      <TouchableOpacity
        style={[styles.orderRow, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
        onPress={() => router.push(`/orders/${order.id}` as any)}
        activeOpacity={0.7}
      >
        {/* Top Date: e.g. "9 Sep" */}
        <Text style={[styles.orderDateTop, { color: colors.textSecondary }]}>
          {formatShortDate(order.created_at)}
        </Text>

        {/* Middle Row: #3848 Mujib vs 1,930৳ > */}
        <View style={styles.orderMainRow}>
          <Text style={[styles.orderTitleText, { color: colors.text }]} numberOfLines={1}>
            {invoiceDisplay}{customerDisplay}
          </Text>

          <View style={styles.orderAmountWrapper}>
            <Text style={[styles.orderAmountText, { color: colors.text }]}>
              {Math.round(order.total_amount).toLocaleString('en-IN')}{currencySymbol}
            </Text>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </View>

        {/* Bottom Status Pill: e.g. "Processing" in mint green */}
        <View style={styles.badgeRow}>
          <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
      {/* 1. Top Header Bar (Screenshot 1: Barcode Button left, Search + Plus Capsule right) */}
      <View style={[styles.topBar, { backgroundColor: colors.isDark ? '#000000' : '#ffffff' }]}>
        {/* Left: Barcode Scanner Button */}
        <TouchableOpacity
          style={[styles.circleIconBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.7}
        >
          <Scan size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Right: Search & Create Capsule */}
        <View style={[styles.capsuleBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}>
          <TouchableOpacity
            style={styles.capsuleHalf}
            onPress={() => setSearchBarVisible(!searchBarVisible)}
            activeOpacity={0.7}
          >
            <Search size={18} color={colors.text} />
          </TouchableOpacity>

          <View style={[styles.capsuleDivider, { backgroundColor: colors.isDark ? '#27272a' : '#cbd5e1' }]} />

          <TouchableOpacity
            style={styles.capsuleHalf}
            onPress={() => router.push('/orders/create' as any)}
            activeOpacity={0.7}
          >
            <Plus size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar (Expandable) */}
      {searchBarVisible && (
        <View style={[styles.searchBarContainer, { backgroundColor: colors.isDark ? '#18181b' : '#f8fafc' }]}>
          <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by order #, phone, customer..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 2. Main Title & Filter Bar (Screenshot 1) */}
      <View style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Orders</Text>

        <View style={styles.subTitleRow}>
          <View>
            <Text style={[styles.subTitleText, { color: colors.text }]}>
              {selectedStatus === 'any' ? 'All Orders' : `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Orders`}
            </Text>
            <Text style={[styles.lastUpdatedText, { color: colors.textSecondary }]}>
              Last Updated: {lastUpdated}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={openFilterModal}
            activeOpacity={0.7}
          >
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Status Filter Bar (Scrollable chips with live Abandoned badge) */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = selectedStatus === opt.key;
            const isAbandoned = opt.key === 'abandoned';
            const abandonedCount = abandonedStats?.total_abandoned || 0;

            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? '#8b5cf6'
                      : colors.isDark
                      ? '#1c1c1e'
                      : '#ffffff',
                    borderColor: isSelected
                      ? '#8b5cf6'
                      : colors.isDark
                      ? '#27272a'
                      : '#e4e4e7',
                  },
                ]}
                onPress={() => setSelectedStatus(opt.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected
                        ? '#ffffff'
                        : isAbandoned
                        ? '#d97706'
                        : colors.text,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {opt.label}
                </Text>

                {isAbandoned && abandonedCount > 0 && (
                  <View
                    style={[
                      styles.chipBadge,
                      { backgroundColor: isSelected ? '#ffffff' : '#f59e0b' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipBadgeText,
                        { color: isSelected ? '#8b5cf6' : '#ffffff' },
                      ]}
                    >
                      {abandonedCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Sectioned Orders List (Grouped by Date) */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={36} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to load orders</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerContainer}>
          <Package size={44} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {selectedStatus !== 'any' || searchQuery
              ? 'Try adjusting your filters or search.'
              : 'New orders will appear here automatically.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeaderBox, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
              <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* 4. Filter Modal (100% Mirroring Screenshot 2: order page filtering.jfif) */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={[styles.filterSafe, { backgroundColor: colors.isDark ? '#000000' : '#ffffff' }]}>
          {/* Modal Header */}
          <View style={[styles.filterHeader, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#e2e8f0' }]}>
            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={() => setFilterModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissText, { color: colors.text }]}>Dismiss</Text>
            </TouchableOpacity>

            <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>

            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={resetFilters}
              activeOpacity={0.7}
            >
              <Clock size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Filter Rows Container */}
          <View style={styles.filterRowsContainer}>
            {/* Row 1: Order Status */}
            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={() => setActiveSubPicker(activeSubPicker === 'status' ? null : 'status')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterRowLabel, { color: colors.text }]}>Order Status</Text>
              <View style={styles.filterRowValueWrap}>
                <Text style={[styles.filterRowValue, { color: colors.textSecondary }]}>
                  {STATUS_OPTIONS.find((s) => s.key === tempStatus)?.label || 'Any'}
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Sub-picker: Order Status Options */}
            {activeSubPicker === 'status' && (
              <View style={[styles.subPickerBox, { backgroundColor: colors.isDark ? '#18181b' : '#f8fafc' }]}>
                {STATUS_OPTIONS.map((st) => (
                  <TouchableOpacity
                    key={st.key}
                    style={styles.subOptionRow}
                    onPress={() => {
                      setTempStatus(st.key);
                      setActiveSubPicker(null);
                    }}
                  >
                    <Text style={[styles.subOptionText, { color: colors.text }]}>{st.label}</Text>
                    {tempStatus === st.key && <Check size={18} color="#8b5cf6" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Row 2: Date Range */}
            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={() => setActiveSubPicker(activeSubPicker === 'date' ? null : 'date')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterRowLabel, { color: colors.text }]}>Date Range</Text>
              <View style={styles.filterRowValueWrap}>
                <Text style={[styles.filterRowValue, { color: colors.textSecondary }]}>
                  {DATE_RANGE_OPTIONS.find((d) => d.key === tempDateRange)?.label || 'Any'}
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Sub-picker: Date Range Options */}
            {activeSubPicker === 'date' && (
              <View style={[styles.subPickerBox, { backgroundColor: colors.isDark ? '#18181b' : '#f8fafc' }]}>
                {DATE_RANGE_OPTIONS.map((dr) => (
                  <TouchableOpacity
                    key={dr.key}
                    style={styles.subOptionRow}
                    onPress={() => {
                      setTempDateRange(dr.key);
                      setActiveSubPicker(null);
                    }}
                  >
                    <Text style={[styles.subOptionText, { color: colors.text }]}>{dr.label}</Text>
                    {tempDateRange === dr.key && <Check size={18} color="#8b5cf6" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Row 3: Customer */}
            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={() => setActiveSubPicker(activeSubPicker === 'customer' ? null : 'customer')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterRowLabel, { color: colors.text }]}>Customer</Text>
              <View style={styles.filterRowValueWrap}>
                <Text style={[styles.filterRowValue, { color: colors.textSecondary }]}>
                  {tempCustomer ? tempCustomer : 'Any'}
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {activeSubPicker === 'customer' && (
              <View style={[styles.subPickerBox, { backgroundColor: colors.isDark ? '#18181b' : '#f8fafc' }]}>
                <TextInput
                  style={[styles.customerFilterInput, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
                  placeholder="Type customer name or phone..."
                  placeholderTextColor={colors.textSecondary}
                  value={tempCustomer}
                  onChangeText={setTempCustomer}
                />
              </View>
            )}

            {/* Row 4: Product */}
            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={() => setActiveSubPicker(activeSubPicker === 'product' ? null : 'product')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterRowLabel, { color: colors.text }]}>Product</Text>
              <View style={styles.filterRowValueWrap}>
                <Text style={[styles.filterRowValue, { color: colors.textSecondary }]}>Any</Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Row 5: Sales Channel */}
            <TouchableOpacity
              style={[styles.filterRow, { borderBottomColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
              onPress={() => setActiveSubPicker(activeSubPicker === 'channel' ? null : 'channel')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterRowLabel, { color: colors.text }]}>Sales Channel</Text>
              <View style={styles.filterRowValueWrap}>
                <Text style={[styles.filterRowValue, { color: colors.textSecondary }]}>
                  {CHANNEL_OPTIONS.find((c) => c.key === tempChannel)?.label || 'Any'}
                </Text>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {activeSubPicker === 'channel' && (
              <View style={[styles.subPickerBox, { backgroundColor: colors.isDark ? '#18181b' : '#f8fafc' }]}>
                {CHANNEL_OPTIONS.map((ch) => (
                  <TouchableOpacity
                    key={ch.key}
                    style={styles.subOptionRow}
                    onPress={() => {
                      setTempChannel(ch.key);
                      setActiveSubPicker(null);
                    }}
                  >
                    <Text style={[styles.subOptionText, { color: colors.text }]}>{ch.label}</Text>
                    {tempChannel === ch.key && <Check size={18} color="#8b5cf6" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Bottom Sticky Action Button: Show Orders */}
          <View style={[styles.filterBottomBar, { backgroundColor: colors.isDark ? '#000000' : '#ffffff' }]}>
            <TouchableOpacity
              style={styles.showOrdersBtn}
              onPress={applyFilters}
              activeOpacity={0.8}
            >
              <Text style={styles.showOrdersBtnText}>Show Orders</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={(code) => {
          setScannerVisible(false);
          setSearchQuery(code);
          setSearchBarVisible(true);
        }}
        title="Scan Order Parcel"
        subtitle="Point camera at invoice barcode or consignment slip"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 8,
  },
  circleIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 8,
  },
  capsuleHalf: {
    paddingHorizontal: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleDivider: {
    width: 1,
    height: 20,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  titleSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subTitleText: {
    fontSize: 17,
    fontWeight: '700',
  },
  lastUpdatedText: {
    fontSize: 12,
    marginTop: 2,
  },
  filterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  filterBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  sectionHeaderBox: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 90,
  },
  orderRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  orderDateTop: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  orderMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitleText: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  orderAmountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderAmountText: {
    fontSize: 17,
    fontWeight: '600',
  },
  badgeRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },

  /* Filter Modal Styles (order page filtering.jfif) */
  filterSafe: {
    flex: 1,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dismissBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  resetBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRowsContainer: {
    flex: 1,
    paddingTop: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  filterRowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  filterRowValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterRowValue: {
    fontSize: 16,
  },
  subPickerBox: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  subOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  subOptionText: {
    fontSize: 15,
  },
  customerFilterInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginVertical: 6,
  },
  filterBottomBar: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  showOrdersBtn: {
    backgroundColor: '#8b5cf6',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showOrdersBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  /* Horizontal Status Filter Bar */
  filterBarWrapper: {
    paddingVertical: 6,
  },
  filterChipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* Abandoned Cart Card Styles */
  abandonedCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  abandonedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  abandonedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  abandonedBadgeBg: {
    backgroundColor: '#fef3c7',
  },
  recoveredBadgeBg: {
    backgroundColor: '#dcfce7',
  },
  abandonedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  customerPhoneSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  abandonedPreviewText: {
    fontSize: 12,
    marginTop: 2,
  },
  abandonedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
