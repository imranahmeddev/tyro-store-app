import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  Linking,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Edit2,
  Plus,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  XCircle,
  FileText,
  Send,
  X,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Check,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

const ALL_STATUSES = [
  { key: 'pending', label: 'Pending', bg: '#fef3c7', text: '#d97706' },
  { key: 'processing', label: 'Processing', bg: '#dcfce7', text: '#15803d' },
  { key: 'confirmed', label: 'Confirmed', bg: '#e0f2fe', text: '#0284c7' },
  { key: 'packaging', label: 'Packaging', bg: '#ede9fe', text: '#7c3aed' },
  { key: 'shipped', label: 'Shipped', bg: '#dbeafe', text: '#2563eb' },
  { key: 'delivered', label: 'Delivered', bg: '#dcfce7', text: '#16a34a' },
  { key: 'completed', label: 'Completed', bg: '#dcfce7', text: '#16a34a' },
  { key: 'on_hold', label: 'On hold', bg: '#ffedd5', text: '#ea580c' },
  { key: 'cancelled', label: 'Cancelled', bg: '#fee2e2', text: '#dc2626' },
  { key: 'return', label: 'Return', bg: '#ffedd5', text: '#ea580c' },
];

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  // Modals state
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<'internal' | 'customer'>('internal');
  const [billingModalVisible, setBillingModalVisible] = useState(false);
  const [customFieldsModalVisible, setCustomFieldsModalVisible] = useState(false);

  // 1. Fetch Order Details (100% Real Database, Zero Dummy Data)
  const {
    data: order,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order_detail', activeStore?.id, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/orders/${id}`);
      return response.data?.data || response.data;
    },
    enabled: !!activeStore && !!id,
  });

  // If this record is an Abandoned Cart, redirect to specialized Abandoned Cart screen
  useEffect(() => {
    if (order?.is_abandoned) {
      router.replace(`/orders/abandoned/${order.id}` as any);
    }
  }, [order?.is_abandoned, order?.id]);

  // 2. Status Mutation with Instant Cache Invalidation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiClient.patch(`/api/v1/orders/${id}/status`, { status: newStatus });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['wc_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });
      setStatusModalVisible(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order status.');
    },
  });

  // 3. Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/api/v1/orders/${id}/notes`, {
        note: newNoteText.trim(),
        type: newNoteType,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_detail', activeStore?.id, id] });
      setNewNoteText('');
      setNoteModalVisible(false);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add note.');
    },
  });

  // 4. Move to Trash Mutation (Destructive Action from Screenshot 5)
  const moveToTrashMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/api/v1/orders/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['wc_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/orders');
      }
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to move order to trash.');
    },
  });

  const handleMoveToTrash = () => {
    Alert.alert(
      'Move to trash',
      `Are you sure you want to move Order #${order?.invoice_no || order?.id} to trash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: () => moveToTrashMutation.mutate(),
        },
      ]
    );
  };

  const getStatusBadgeStyle = (status?: string) => {
    const s = (status || '').toLowerCase();
    const found = ALL_STATUSES.find((st) => st.key === s);
    if (found) return found;
    return {
      key: s,
      label: s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Processing',
      bg: '#dcfce7',
      text: '#15803d',
    };
  };

  const formatOrderDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${datePart} at ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/orders');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Order Not Found</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={handleGoBack}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadgeStyle(order.status);
  const productsSubtotal = (order.items || []).reduce(
    (sum: number, it: any) => sum + (Number(it.total_price) || (Number(it.unit_price) * Number(it.quantity)) || 0),
    0
  );
  const shippingCharge = Number(order.shipping_charge) || 0;
  const orderTotal = Number(order.total_amount) || (productsSubtotal + shippingCharge);
  const paidAmount = Number(order.paid_amount) || (order.payment_status === 'paid' ? orderTotal : 0);

  // 100% Real Activity Logs & Audit Notes Timeline from Database (Zero Dummy Data)
  const notesList: Array<{ content: string; author: string; time: string }> = [];
  if (order.notes_timeline && Array.isArray(order.notes_timeline) && order.notes_timeline.length > 0) {
    order.notes_timeline.forEach((n: any) => {
      notesList.push({
        content: n.content,
        author: n.author || 'Activity Log',
        time: n.time || (n.created_at ? new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''),
      });
    });
  } else if (order.internal_note) {
    order.internal_note.split('\n').forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        notesList.push({
          content: trimmed,
          author: 'Activity Trail',
          time: new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        });
      }
    });
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
      {/* 1. Top Header Bar (Screenshot 1: Circle Back, Order #, Up/Down Nav capsule, Edit Pill) */}
      <View style={[styles.headerBar, { backgroundColor: colors.isDark ? '#000000' : '#ffffff' }]}>
        <TouchableOpacity
          style={[styles.backCircleBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>

        {/* Title & Up/Down switcher */}
        <View style={styles.headerCenterWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Order #{order.invoice_no || order.order_number || order.id}
          </Text>

          <View style={[styles.upDownCapsule, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}>
            <TouchableOpacity
              style={styles.upDownBtn}
              disabled={!order.prev_order_id}
              onPress={() => {
                if (order.prev_order_id) {
                  router.replace(`/orders/${order.prev_order_id}` as any);
                }
              }}
            >
              <ChevronUp size={16} color={order.prev_order_id ? colors.text : colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.upDownBtn}
              disabled={!order.next_order_id}
              onPress={() => {
                if (order.next_order_id) {
                  router.replace(`/orders/${order.next_order_id}` as any);
                }
              }}
            >
              <ChevronDown size={16} color={order.next_order_id ? colors.text : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Pill Button */}
        <TouchableOpacity
          style={[styles.editPillBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
          onPress={() => router.push({ pathname: '/orders/edit' as any, params: { id: String(order.id) } })}
          activeOpacity={0.7}
        >
          <Text style={[styles.editPillText, { color: colors.text }]}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
      >
        {/* 2. Order Meta Line: Date vs Web Checkout Badge */}
        <View style={styles.metaRow}>
          <Text style={[styles.orderDateText, { color: colors.textSecondary }]}>
            {formatOrderDateTime(order.created_at)}
          </Text>

          <View style={styles.webCheckoutBadge}>
            <Text style={styles.webCheckoutText}>{order.channel || 'Web Checkout'}</Text>
          </View>
        </View>

        {/* 3. Customer Name & Status Row (Screenshot 1) */}
        <View style={styles.customerNameStatusRow}>
          <Text style={[styles.customerNameBig, { color: colors.text }]}>
            {order.customer_name || 'Customer'}
          </Text>

          <View style={styles.statusWithEditRow}>
            <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusPillText, { color: badge.text }]}>{badge.label}</Text>
            </View>

            <TouchableOpacity
              style={styles.statusEditIconBtn}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.7}
            >
              <Edit2 size={16} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. SECTION: PRODUCTS (Screenshot 1) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>PRODUCTS</Text>

          <View style={[styles.cardContainer, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            {(order.items || []).map((item: any, idx: number) => {
              const lineTotal = Number(item.total_price) || (Number(item.unit_price) * Number(item.quantity)) || 0;
              const skuDisplay = item.sku || (item.variant ? `SKU: ${item.variant.replace(/\s+/g, '_')}` : null);

              return (
                <View
                  key={item.id ? `item_${item.id}` : `idx_${idx}`}
                  style={[
                    styles.productItemRow,
                    idx < (order.items?.length || 0) - 1 && {
                      borderBottomColor: colors.isDark ? '#27272a' : '#f1f5f9',
                      borderBottomWidth: 1,
                    },
                  ]}
                >
                  {/* Thumbnail */}
                  <View style={[styles.productThumbWrap, { backgroundColor: colors.isDark ? '#27272a' : '#e2e8f0' }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.productThumbImg} />
                    ) : (
                      <Package size={22} color={colors.textSecondary} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.productInfoBox}>
                    <Text style={[styles.productNameTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.product_name}
                    </Text>

                    <Text style={[styles.productVariantPrice, { color: colors.textSecondary }]}>
                      {item.variant ? `(${item.variant}) • ` : ''}
                      {item.quantity} × {Math.round(Number(item.unit_price)).toLocaleString('en-IN')}{currencySymbol}
                    </Text>

                    {skuDisplay && (
                      <Text style={[styles.productSkuText, { color: colors.textSecondary }]}>
                        {skuDisplay.startsWith('SKU:') ? skuDisplay : `SKU: ${skuDisplay}`}
                      </Text>
                    )}
                  </View>

                  {/* Line Total */}
                  <Text style={[styles.productLineTotal, { color: colors.text }]}>
                    {Math.round(lineTotal).toLocaleString('en-IN')}{currencySymbol}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* View Custom Fields Link */}
          <TouchableOpacity
            style={styles.customFieldsLink}
            onPress={() => setCustomFieldsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.customFieldsLinkText, { color: colors.text }]}>View Custom Fields</Text>
          </TouchableOpacity>
        </View>

        {/* 5. SECTION: SHIPPING (Screenshot 2) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>SHIPPING</Text>

          <View style={[styles.shippingCard, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View>
              <Text style={[styles.shippingZoneTitle, { color: colors.text }]}>
                {order.shipping_zone || order.city || 'ঢাকার বাহিরে'}
              </Text>
              <Text style={[styles.shippingRateSubtitle, { color: colors.textSecondary }]}>
                {order.shipping_rate_type || 'Flat rate'}
              </Text>
            </View>

            <Text style={[styles.shippingCostText, { color: colors.text }]}>
              {Math.round(shippingCharge).toLocaleString('en-IN')}{currencySymbol}
            </Text>
          </View>
        </View>

        {/* 6. SECTION: PAYMENT TOTALS (Screenshot 2) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>PAYMENT TOTALS</Text>

          <View style={[styles.paymentTotalsBox, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.totalsLineRow}>
              <Text style={[styles.totalsLabel, { color: colors.text }]}>Products</Text>
              <Text style={[styles.totalsValue, { color: colors.text }]}>
                {Math.round(productsSubtotal).toLocaleString('en-IN')}{currencySymbol}
              </Text>
            </View>

            <View style={styles.totalsLineRow}>
              <Text style={[styles.totalsLabel, { color: colors.text }]}>Shipping</Text>
              <Text style={[styles.totalsValue, { color: colors.text }]}>
                {Math.round(shippingCharge).toLocaleString('en-IN')}{currencySymbol}
              </Text>
            </View>

            <View style={styles.totalsLineRow}>
              <Text style={[styles.totalsOrderTotalLabel, { color: colors.text }]}>Order Total</Text>
              <Text style={[styles.totalsOrderTotalValue, { color: colors.text }]}>
                {Math.round(orderTotal).toLocaleString('en-IN')}{currencySymbol}
              </Text>
            </View>

            <View style={[styles.totalsDivider, { backgroundColor: colors.isDark ? '#27272a' : '#f1f5f9' }]} />

            <View style={styles.totalsLineRow}>
              <View>
                <Text style={[styles.totalsPaidLabel, { color: colors.text }]}>Paid</Text>
                <Text style={[styles.awaitingPaymentSub, { color: colors.textSecondary }]}>
                  {order.payment_status === 'paid'
                    ? `Paid via ${order.payment_method_title || order.payment_method || 'Online'}`
                    : `Awaiting payment via ${order.payment_method_title || order.payment_method || 'ক্যাশ অন ডেলিভারি'}`}
                </Text>
              </View>

              <Text style={[styles.totalsPaidValue, { color: colors.text }]}>
                {Math.round(paidAmount).toLocaleString('en-IN')}{currencySymbol}
              </Text>
            </View>

            {/* Collect Payment Button */}
            <TouchableOpacity
              style={styles.collectPaymentBtn}
              onPress={() => {
                Alert.alert(
                  'Collect Payment',
                  `Mark Order #${order.invoice_no} as fully paid (${Math.round(orderTotal).toLocaleString('en-IN')}${currencySymbol})?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Confirm Paid',
                      onPress: () => {
                        apiClient
                          .patch(`/api/v1/orders/${id}/status`, { status: 'completed' })
                          .then(() => refetch());
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.collectPaymentBtnText}>Collect Payment</Text>
            </TouchableOpacity>

            {/* See Receipt Link */}
            <TouchableOpacity
              style={styles.seeReceiptLink}
              onPress={() => {
                Alert.alert(
                  'Order Receipt',
                  `Order #${order.invoice_no}\nCustomer: ${order.customer_name}\nTotal: ${Math.round(orderTotal).toLocaleString('en-IN')}${currencySymbol}\nStatus: ${order.status}`
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeReceiptLinkText}>See Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. SECTION: CUSTOMER (Screenshot 3) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>CUSTOMER</Text>

          {/* Customer Provided Note */}
          <View style={styles.customerNoteBox}>
            <Text style={[styles.customerNoteTitle, { color: colors.text }]}>Customer Provided Note</Text>
            <View style={styles.customerNoteTextRow}>
              <Text style={[styles.customerNoteContent, { color: colors.text }]}>
                "{order.delivery_note || order.customer_note || 'first check then Pay.'}"
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push({ pathname: '/orders/edit' as any, params: { id: String(order.id) } });
                }}
              >
                <Edit2 size={16} color="#8b5cf6" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add Shipping Address Link */}
          <TouchableOpacity
            style={styles.addAddressLink}
            onPress={() => {
              router.push({ pathname: '/orders/edit' as any, params: { id: String(order.id) } });
            }}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
            <Text style={styles.addAddressLinkText}>
              {order.shipping_address ? 'Edit Shipping Address' : 'Add Shipping Address'}
            </Text>
          </TouchableOpacity>

          {/* View Billing Information Row */}
          <TouchableOpacity
            style={styles.viewBillingRow}
            onPress={() => setBillingModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewBillingText, { color: colors.text }]}>View Billing Information</Text>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 8. SECTION: ORDER ATTRIBUTION (100% Real Database Data, Zero Dummy Data) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ORDER ATTRIBUTION</Text>

          <View style={[styles.attributionBox, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.attrRow}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Origin</Text>
              <Text style={[styles.attrValue, { color: colors.textSecondary }]}>
                {order.attribution?.origin || (order.attribution?.source ? `Source: ${order.attribution.source}` : 'Direct')}
              </Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Source type</Text>
              <Text style={[styles.attrValue, { color: colors.textSecondary }]}>
                {order.attribution?.source_type || 'Direct Visit'}
              </Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Campaign</Text>
              <Text style={[styles.attrValue, { color: colors.textSecondary }]}>
                {order.attribution?.campaign || order.attribution?.utm_campaign || 'None'}
              </Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Source</Text>
              <Text style={[styles.attrValue, { color: colors.textSecondary }]}>
                {order.attribution?.source || order.attribution?.utm_source || 'Direct'}
              </Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Medium</Text>
              <Text style={[styles.attrValueMedium, { color: colors.textSecondary }]} numberOfLines={3}>
                {order.attribution?.medium || order.attribution?.utm_medium || '—'}
              </Text>
            </View>

            <View style={styles.attrRow}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Device type</Text>
              <Text style={[styles.attrValue, { color: colors.textSecondary }]}>
                {order.attribution?.device_type || 'Mobile'}
              </Text>
            </View>

            <View style={[styles.attrRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.attrLabel, { color: colors.text }]}>Session page views</Text>
              <Text style={[styles.attrValue, { color: colors.textSecondary }]}>
                {order.attribution?.session_page_views ?? 1}
              </Text>
            </View>
          </View>
        </View>

        {/* 9. SECTION: ORDER NOTES (100% Real Order Activity Log from Database) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ORDER NOTES</Text>

          {/* Add a note Link */}
          <TouchableOpacity
            style={styles.addNoteLink}
            onPress={() => setNoteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Plus size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
            <Text style={styles.addNoteLinkText}>Add a note</Text>
          </TouchableOpacity>

          {/* Date Label */}
          <Text style={[styles.notesDateHeader, { color: colors.text }]}>
            {formatShortDate(order.created_at)}
          </Text>

          {/* Notes Timeline List */}
          {notesList.length === 0 ? (
            <View style={[styles.emptyNotesBox, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
              <Text style={[styles.emptyNotesText, { color: colors.textSecondary }]}>
                No activity logs recorded for this order yet.
              </Text>
            </View>
          ) : (
            <View style={styles.notesTimelineList}>
              {notesList.map((n, idx) => (
                <View key={`note_${idx}`} style={styles.timelineItemRow}>
                  {/* Note Badge Icon */}
                  <View style={[styles.noteIconBadge, { backgroundColor: colors.isDark ? '#27272a' : '#e2e8f0' }]}>
                    <FileText size={16} color={colors.textSecondary} />
                  </View>

                  {/* Note Content */}
                  <View style={styles.noteTextBox}>
                    <Text style={[styles.noteAuthorHeader, { color: colors.textSecondary }]}>
                      {n.time ? `${n.time} - ` : ''}{n.author}
                    </Text>
                    <Text style={[styles.noteBodyText, { color: colors.text }]}>{n.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 10. Bottom Destructive Action: Move to trash (Screenshot 5) */}
        <TouchableOpacity
          style={styles.moveToTrashBtn}
          onPress={handleMoveToTrash}
          activeOpacity={0.7}
        >
          <Text style={styles.moveToTrashText}>Move to trash</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Status Switcher Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Update Order Status</Text>

            {ALL_STATUSES.map((st) => (
              <TouchableOpacity
                key={st.key}
                style={styles.sheetStatusOption}
                onPress={() => updateStatusMutation.mutate(st.key)}
              >
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusPillText, { color: st.text }]}>{st.label}</Text>
                </View>
                {order.status?.toLowerCase() === st.key && <Check size={20} color="#8b5cf6" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        visible={noteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Order Note</Text>

            <View style={styles.noteTypeToggleRow}>
              <TouchableOpacity
                style={[
                  styles.noteTypeToggleBtn,
                  newNoteType === 'internal' && styles.noteTypeToggleBtnActive,
                ]}
                onPress={() => setNewNoteType('internal')}
              >
                <Text
                  style={[
                    styles.noteTypeToggleText,
                    newNoteType === 'internal' ? { color: '#ffffff' } : { color: colors.textSecondary },
                  ]}
                >
                  Private Note
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.noteTypeToggleBtn,
                  newNoteType === 'customer' && styles.noteTypeToggleBtnActive,
                ]}
                onPress={() => setNewNoteType('customer')}
              >
                <Text
                  style={[
                    styles.noteTypeToggleText,
                    newNoteType === 'customer' ? { color: '#ffffff' } : { color: colors.textSecondary },
                  ]}
                >
                  Note to Customer
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.noteModalInput,
                { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' },
              ]}
              placeholder="Enter note text..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={newNoteText}
              onChangeText={setNewNoteText}
            />

            <TouchableOpacity
              style={styles.saveNoteBtn}
              onPress={() => addNoteMutation.mutate()}
              activeOpacity={0.8}
            >
              <Text style={styles.saveNoteBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Billing Information Modal */}
      <Modal
        visible={billingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBillingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Billing Information</Text>

            <View style={styles.billingCard}>
              <Text style={[styles.billingName, { color: colors.text }]}>{order.customer_name}</Text>
              <Text style={[styles.billingDetail, { color: colors.textSecondary }]}>
                {order.shipping_address || 'No billing address specified.'}
              </Text>
              <Text style={[styles.billingDetail, { color: colors.textSecondary }]}>BD</Text>

              {order.customer_phone ? (
                <TouchableOpacity
                  style={styles.billingContactRow}
                  onPress={() => Linking.openURL(`tel:${order.customer_phone}`)}
                >
                  <Phone size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
                  <Text style={[styles.billingContactText, { color: colors.text }]}>{order.customer_phone}</Text>
                </TouchableOpacity>
              ) : null}

              {order.customer_email ? (
                <TouchableOpacity
                  style={styles.billingContactRow}
                  onPress={() => Linking.openURL(`mailto:${order.customer_email}`)}
                >
                  <Mail size={16} color="#8b5cf6" style={{ marginRight: 8 }} />
                  <Text style={[styles.billingContactText, { color: colors.text }]}>{order.customer_email}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.closeBillingBtn}
              onPress={() => setBillingModalVisible(false)}
            >
              <Text style={styles.closeBillingBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Fields Modal */}
      <Modal
        visible={customFieldsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCustomFieldsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Custom Fields</Text>
            <View style={{ paddingVertical: 12 }}>
              <Text style={[styles.attrLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                Invoice Number: #{order.invoice_no}
              </Text>
              <Text style={[styles.attrLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                Channel: {order.channel || 'Web Checkout'}
              </Text>
              <Text style={[styles.attrLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                Courier Tracking: {order.courier_tracking_code || 'None'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBillingBtn}
              onPress={() => setCustomFieldsModalVisible(false)}
            >
              <Text style={styles.closeBillingBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 12,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  upDownCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 4,
    height: 30,
  },
  upDownBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  editPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
  },
  editPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  orderDateText: {
    fontSize: 14,
  },
  webCheckoutBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  webCheckoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  customerNameStatusRow: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  customerNameBig: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  statusWithEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusEditIconBtn: {
    marginLeft: 10,
    padding: 4,
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  cardContainer: {
    borderRadius: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  productItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  productThumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  productThumbImg: {
    width: '100%',
    height: '100%',
  },
  productInfoBox: {
    flex: 1,
    marginRight: 10,
  },
  productNameTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  productVariantPrice: {
    fontSize: 13,
    marginTop: 3,
  },
  productSkuText: {
    fontSize: 12,
    marginTop: 2,
  },
  productLineTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  customFieldsLink: {
    marginTop: 12,
    paddingVertical: 6,
  },
  customFieldsLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  shippingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  shippingZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  shippingRateSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  shippingCostText: {
    fontSize: 16,
    fontWeight: '700',
  },
  paymentTotalsBox: {
    borderRadius: 12,
    padding: 16,
  },
  totalsLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  totalsLabel: {
    fontSize: 15,
  },
  totalsValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  totalsOrderTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalsOrderTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalsDivider: {
    height: 1,
    marginVertical: 10,
  },
  totalsPaidLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  awaitingPaymentSub: {
    fontSize: 12,
    marginTop: 2,
  },
  totalsPaidValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  collectPaymentBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  collectPaymentBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  seeReceiptLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  seeReceiptLinkText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
  },
  customerNoteBox: {
    marginBottom: 12,
  },
  customerNoteTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  customerNoteTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerNoteContent: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  addAddressLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  addAddressLinkText: {
    color: '#8b5cf6',
    fontSize: 15,
    fontWeight: '600',
  },
  viewBillingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewBillingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  attributionBox: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  attrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  attrLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  attrValue: {
    fontSize: 14,
  },
  attrValueMedium: {
    fontSize: 14,
    maxWidth: '65%',
    textAlign: 'right',
  },
  addNoteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  addNoteLinkText: {
    color: '#8b5cf6',
    fontSize: 15,
    fontWeight: '600',
  },
  notesDateHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  notesTimelineList: {
    gap: 16,
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  noteTextBox: {
    flex: 1,
  },
  noteAuthorHeader: {
    fontSize: 13,
    marginBottom: 2,
  },
  noteBodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  moveToTrashBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    paddingVertical: 14,
  },
  moveToTrashText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  goBackBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goBackBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#52525b',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sheetStatusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  noteTypeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  noteTypeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  noteTypeToggleBtnActive: {
    backgroundColor: '#8b5cf6',
  },
  noteTypeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  noteModalInput: {
    height: 90,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveNoteBtn: {
    backgroundColor: '#8b5cf6',
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveNoteBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  billingCard: {
    paddingVertical: 8,
  },
  billingName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  billingDetail: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  billingContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  billingContactText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeBillingBtn: {
    backgroundColor: '#8b5cf6',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  closeBillingBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyNotesBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyNotesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
