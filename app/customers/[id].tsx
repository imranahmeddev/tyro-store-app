import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Linking,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Copy,
  Check,
  ExternalLink,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Truck,
  Calendar,
  AlertCircle,
  ChevronRight,
  Package,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

interface CustomerDetail {
  id: number | string;
  name: string;
  phone: string | null;
  email: string | null;
  joined_at: string | null;
  total_orders: number;
  lifetime_value: number;
  average_order_val: number;
  billing_address: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
  };
  shipping_address: {
    name?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    shipping_zone?: string | null;
  };
}

interface CustomerOrder {
  id: number;
  order_number: string;
  formatted_order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  items_count: number;
  courier_provider: string | null;
  courier_tracking_code: string | null;
  created_at: string;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 1. Fetch Customer Profile & Orders
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customer', activeStore?.id, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/customers/${id}`);
      return response.data;
    },
    enabled: !!activeStore && !!id,
  });

  const customer: CustomerDetail | undefined = data?.customer;
  const orders: CustomerOrder[] = data?.orders?.data ?? [];

  const handleCopy = async (text?: string | null, fieldKey?: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    if (fieldKey) {
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    if (cleanNumber) {
      Linking.openURL(`tel:${cleanNumber}`).catch(() =>
        Alert.alert('Error', 'Unable to initiate phone call.')
      );
    }
  };

  const handleWhatsApp = (phone?: string | null) => {
    if (!phone) return;
    let cleanNumber = phone.replace(/[^0-9]/g, '');
    if (!cleanNumber.startsWith('88') && cleanNumber.length === 11) {
      cleanNumber = '88' + cleanNumber;
    }
    if (cleanNumber) {
      const url = `https://wa.me/${cleanNumber}`;
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Unable to open WhatsApp.')
      );
    }
  };

  const handleEmail = (email?: string | null) => {
    if (!email) return;
    Linking.openURL(`mailto:${email.trim()}`).catch(() =>
      Alert.alert('Error', 'Unable to open mail client.')
    );
  };

  const handleOpenMaps = (addressText?: string | null) => {
    if (!addressText) return;
    const encoded = encodeURIComponent(addressText);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    });
    if (url) {
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Unable to launch maps navigation.')
      );
    }
  };

  const getInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString || '';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return { bg: '#dcfce7', text: '#16a34a' };
      case 'shipped':
      case 'packaging':
      case 'processing':
        return { bg: '#e0f2fe', text: '#0284c7' };
      case 'pending':
        return { bg: '#fef3c7', text: '#d97706' };
      case 'cancelled':
      case 'rejected':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'return':
        return { bg: '#f3e8ff', text: '#9333ea' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading customer CRM profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Customer Profile</Text>
        </View>
        <View style={styles.centerContainer}>
          <AlertCircle size={40} color="#ef4444" />
          <Text style={styles.errorTitle}>Customer Not Found</Text>
          <Text style={styles.errorSubtitle}>
            Unable to load profile data for this customer ID.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials = getInitials(customer.name);

  const renderHeader = () => (
    <View>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{initials}</Text>
        </View>
        <Text style={styles.customerHeroName}>{customer.name}</Text>
        <Text style={styles.customerHeroJoined}>
          Customer since {formatDate(customer.joined_at)}
        </Text>

        {/* 1-Tap CRM Action Row */}
        <View style={styles.crmActionsRow}>
          {customer.phone ? (
            <TouchableOpacity
              style={styles.crmActionBtn}
              onPress={() => handleCall(customer.phone)}
              activeOpacity={0.75}
            >
              <Phone size={18} color="#0284c7" />
              <Text style={styles.crmActionBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}

          {customer.phone ? (
            <TouchableOpacity
              style={styles.crmActionBtn}
              onPress={() => handleWhatsApp(customer.phone)}
              activeOpacity={0.75}
            >
              <MessageSquare size={18} color="#16a34a" />
              <Text style={styles.crmActionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}

          {customer.email ? (
            <TouchableOpacity
              style={styles.crmActionBtn}
              onPress={() => handleEmail(customer.email)}
              activeOpacity={0.75}
            >
              <Mail size={18} color="#9333ea" />
              <Text style={styles.crmActionBtnText}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Metrics Row: LTV, AOV, Total Orders */}
      <View style={styles.metricsRow}>
        {/* LTV */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconBox}>
            <TrendingUp size={16} color="#16a34a" />
          </View>
          <Text style={styles.metricLabel}>Lifetime Value (LTV)</Text>
          <Text style={styles.metricValue}>
            {currencySymbol}
            {customer.lifetime_value.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        {/* AOV */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconBox}>
            <CreditCard size={16} color="#0284c7" />
          </View>
          <Text style={styles.metricLabel}>Avg. Order (AOV)</Text>
          <Text style={styles.metricValue}>
            {currencySymbol}
            {customer.average_order_val.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        {/* Total Orders */}
        <View style={styles.metricCard}>
          <View style={styles.metricIconBox}>
            <ShoppingBag size={16} color="#e11d48" />
          </View>
          <Text style={styles.metricLabel}>Total Orders</Text>
          <Text style={styles.metricValue}>{customer.total_orders}</Text>
        </View>
      </View>

      {/* Address Book Cards */}
      <View style={styles.addressSection}>
        {/* Shipping Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View style={styles.addressTitleRow}>
              <Truck size={16} color="#0284c7" />
              <Text style={styles.addressTitle}>Shipping Address</Text>
            </View>
            <View style={styles.addressHeaderBtns}>
              <TouchableOpacity
                style={styles.addressActionSmall}
                onPress={() =>
                  handleCopy(
                    `${customer.shipping_address.name || ''}, ${
                      customer.shipping_address.address || ''
                    }, ${customer.shipping_address.city || ''} ${
                      customer.shipping_address.postal_code || ''
                    }`,
                    'shipping'
                  )
                }
              >
                {copiedField === 'shipping' ? (
                  <Check size={14} color="#16a34a" />
                ) : (
                  <Copy size={14} color="#64748b" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addressActionSmall}
                onPress={() =>
                  handleOpenMaps(
                    `${customer.shipping_address.address || ''}, ${
                      customer.shipping_address.city || ''
                    }`
                  )
                }
              >
                <ExternalLink size={14} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.addressRecipient}>
            {customer.shipping_address.name || customer.name}
          </Text>
          <Text style={styles.addressPhone}>
            {customer.shipping_address.phone || customer.phone || 'No phone'}
          </Text>
          <Text style={styles.addressBody}>
            {customer.shipping_address.address || 'No street address provided.'}
          </Text>
          {customer.shipping_address.city ? (
            <Text style={styles.addressCity}>
              {customer.shipping_address.city}
              {customer.shipping_address.postal_code
                ? ` - ${customer.shipping_address.postal_code}`
                : ''}
            </Text>
          ) : null}
        </View>

        {/* Billing Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <View style={styles.addressTitleRow}>
              <MapPin size={16} color="#64748b" />
              <Text style={styles.addressTitle}>Billing Address</Text>
            </View>
            <TouchableOpacity
              style={styles.addressActionSmall}
              onPress={() =>
                handleCopy(
                  `${customer.billing_address.address || ''}, ${
                    customer.billing_address.city || ''
                  }`,
                  'billing'
                )
              }
            >
              {copiedField === 'billing' ? (
                <Check size={14} color="#16a34a" />
              ) : (
                <Copy size={14} color="#64748b" />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.addressRecipient}>
            {customer.billing_address.name || customer.name}
          </Text>
          <Text style={styles.addressBody}>
            {customer.billing_address.address ||
              customer.shipping_address.address ||
              'Same as shipping address.'}
          </Text>
        </View>
      </View>

      {/* Order History Section Title */}
      <View style={styles.orderHistoryHeader}>
        <Text style={styles.orderHistoryTitle}>
          Order History ({customer.total_orders})
        </Text>
      </View>
    </View>
  );

  const renderOrderItem = ({ item }: { item: CustomerOrder }) => {
    const badge = getStatusBadgeStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/orders/${item.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.orderCardHeader}>
          <View style={styles.orderNumRow}>
            <Text style={styles.orderNumber}>
              {item.formatted_order_number || `#${item.order_number}`}
            </Text>
            <View style={[styles.orderStatusBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.orderStatusText, { color: badge.text }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </View>

        <View style={styles.orderMetaRow}>
          <View style={styles.orderMetaItem}>
            <Calendar size={12} color="#94a3b8" />
            <Text style={styles.orderMetaText}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.orderMetaItem}>
            <Package size={12} color="#94a3b8" />
            <Text style={styles.orderMetaText}>{item.items_count} items</Text>
          </View>
        </View>

        {item.courier_provider && item.courier_tracking_code ? (
          <View style={styles.orderCourierRow}>
            <Truck size={12} color="#0284c7" />
            <Text style={styles.orderCourierText}>
              {item.courier_provider}: {item.courier_tracking_code}
            </Text>
          </View>
        ) : null}

        <View style={styles.orderCardFooter}>
          <Text style={styles.paymentMethodText}>
            {item.payment_method?.toUpperCase() || 'COD'}
          </Text>
          <Text style={styles.orderTotalAmount}>
            {currencySymbol}
            {item.total.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.screenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.subtle }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={[styles.screenTitle, { color: colors.text }]} numberOfLines={1}>
            {customer.name}
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>Customer Profile</Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            colors={['#0284c7']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyOrdersBox}>
            <Package size={36} color="#cbd5e1" />
            <Text style={styles.emptyOrdersTitle}>No Past Orders Found</Text>
            <Text style={styles.emptyOrdersSubtitle}>
              This customer hasn't completed any orders yet.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0284c7',
  },
  customerHeroName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  customerHeroJoined: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  crmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  crmActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  crmActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  addressSection: {
    gap: 12,
    marginBottom: 16,
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  addressHeaderBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  addressActionSmall: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressRecipient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  addressPhone: {
    fontSize: 13,
    color: '#0284c7',
    marginTop: 2,
  },
  addressBody: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  addressCity: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  orderHistoryHeader: {
    marginBottom: 10,
  },
  orderHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  orderMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  orderMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  orderCourierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  orderCourierText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 2,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  orderTotalAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyOrdersBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyOrdersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
  },
  emptyOrdersSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
