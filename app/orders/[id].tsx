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
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  Copy,
  MapPin,
  CreditCard,
  Package,
  Calendar,
  Save,
  Check,
  Edit2,
  Clock,
  Send,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import StatusBadge from '../../src/components/ui/StatusBadge';
import CurrencyText, { formatBanglaCurrency } from '../../src/components/ui/CurrencyText';
import QuickActionButton from '../../src/components/ui/QuickActionButton';

const STATUS_LIST = [
  'pending',
  'processing',
  'confirmed',
  'packaging',
  'shipped',
  'delivered',
  'cancelled',
  'return',
] as const;

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [adminNote, setAdminNote] = useState('');
  const [addressCopied, setAddressCopied] = useState(false);

  // 1. Fetch Order Details
  const {
    data: order,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['order_detail', activeStore?.id, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/orders/${id}`);
      return response.data?.data || response.data;
    },
    enabled: !!activeStore && !!id,
  });

  useEffect(() => {
    if (order?.admin_note || order?.delivery_note) {
      setAdminNote(order.admin_note || order.delivery_note || '');
    }
  }, [order?.admin_note, order?.delivery_note]);

  // If Abandoned Cart, redirect to specialized Abandoned Cart screen
  useEffect(() => {
    if (order?.is_abandoned) {
      router.replace(`/orders/abandoned/${order.id}` as any);
    }
  }, [order?.is_abandoned, order?.id]);

  // 2. Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiClient.patch(`/api/v1/orders/${id}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
    },
    onError: (err: any) => {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Could not update status');
    },
  });

  // 3. Save Note Mutation
  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/api/v1/orders/${id}/notes`, {
        note: adminNote.trim(),
        type: 'internal',
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Saved', 'Order note updated.');
      queryClient.invalidateQueries({ queryKey: ['order_detail', activeStore?.id, id] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Could not save note');
    },
  });

  const handleCopyAddress = async () => {
    const text = [
      order?.customer_name,
      order?.customer_phone,
      order?.shipping_address,
      order?.shipping_zone,
    ]
      .filter(Boolean)
      .join('\n');

    if (!text) return;
    await Clipboard.setStringAsync(text);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (isLoading || !order) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#7c3aed" />
        </View>
      </SafeAreaView>
    );
  }

  const invoiceDisplay = `#${order.invoice_no || order.order_number || order.id}`;
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* 1. Header Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.subtle }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.topBarTitleCenter}>
          <Text style={[styles.invoiceTitle, { color: colors.text }]}>{invoiceDisplay}</Text>
          <Text style={[styles.orderDateSub, { color: colors.textSecondary }]}>
            {formatShortDate(order.created_at)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.subtle }]}
          onPress={() => router.push(`/orders/edit?id=${order.id}` as any)}
          activeOpacity={0.7}
        >
          <Edit2 size={14} color="#7c3aed" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
      >
        {/* 2. Customer Card (Highest Priority for Bangladeshi Store Owners) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
            CUSTOMER & SHIPPING DETAILS
          </Text>

          <View style={styles.customerRow}>
            <Text style={[styles.customerNameBig, { color: colors.text }]}>
              {order.customer_name || 'Unnamed Customer'}
            </Text>
            {order.customer_phone ? (
              <Text style={[styles.customerPhoneBig, { color: colors.textSecondary }]}>
                {order.customer_phone}
              </Text>
            ) : null}
          </View>

          {/* 1-Tap Quick Action Buttons */}
          {order.customer_phone ? (
            <View style={styles.actionsPillRow}>
              <QuickActionButton type="call" phone={order.customer_phone} />
              <QuickActionButton
                type="whatsapp"
                phone={order.customer_phone}
                message={`Hello ${order.customer_name || ''}, this is regarding your order ${invoiceDisplay} at ${activeStore?.store_name || 'our store'}.`}
              />
              <QuickActionButton type="copy" textToCopy={order.customer_phone} label="Copy Phone" />
            </View>
          ) : null}

          {/* Shipping Address */}
          {order.shipping_address ? (
            <View style={[styles.addressBox, { backgroundColor: colors.subtle }]}>
              <MapPin size={13} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.addressText, { color: colors.text }]}>
                  {order.shipping_address}
                </Text>
                {order.shipping_zone ? (
                  <Text style={[styles.zoneText, { color: colors.textSecondary }]}>
                    Zone: {order.shipping_zone}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.copyAddressBtn, { backgroundColor: addressCopied ? '#dcfce7' : colors.surface }]}
                onPress={handleCopyAddress}
                activeOpacity={0.7}
              >
                {addressCopied ? <Check size={12} color="#15803d" /> : <Copy size={12} color="#0284c7" />}
                <Text style={[styles.copyAddressText, { color: addressCopied ? '#15803d' : '#0284c7' }]}>
                  {addressCopied ? 'Copied' : 'Courier Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* 3. Quick Status Change Carousel */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.statusSectionHeader}>
            <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
              ORDER STATUS
            </Text>
            <StatusBadge status={order.status || 'processing'} size="md" />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipsRow}>
            {STATUS_LIST.map((st) => {
              const isActive = (order.status || '').toLowerCase() === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusChip,
                    isActive
                      ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => updateStatusMutation.mutate(st)}
                  disabled={updateStatusMutation.isPending || isActive}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: isActive ? '#ffffff' : colors.textSecondary, fontWeight: isActive ? '700' : '500' },
                    ]}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. Ordered Items */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
            ORDERED ITEMS ({items.length})
          </Text>

          <View style={styles.itemsList}>
            {items.map((item: any, idx: number) => {
              const isLast = idx === items.length - 1;
              const unitPrice = Number(item.unit_price || item.price || 0);
              const qty = Number(item.quantity || 1);
              const totalPrice = Number(item.total_price || unitPrice * qty);

              return (
                <View
                  key={item.id || idx}
                  style={[
                    styles.itemRow,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={[styles.itemThumb, { backgroundColor: colors.subtle }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <Package size={15} color={colors.textMuted} />
                    )}
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    {item.variant ? (
                      <Text style={[styles.itemVariant, { color: colors.textSecondary }]}>
                        {item.variant}
                      </Text>
                    ) : null}
                    <Text style={[styles.itemQtyPrice, { color: colors.textMuted }]}>
                      {qty} × {formatBanglaCurrency(unitPrice)} {currencySymbol}
                    </Text>
                  </View>

                  <CurrencyText
                    amount={totalPrice}
                    currencySymbol={currencySymbol}
                    size="sm"
                    color={colors.text}
                    weight="700"
                  />
                </View>
              );
            })}
          </View>

          {/* Pricing Breakdown */}
          <View style={[styles.priceBreakdownBox, { borderTopColor: colors.border }]}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                {formatBanglaCurrency(order.subtotal || order.total_amount)} {currencySymbol}
              </Text>
            </View>

            {Number(order.shipping_charge ?? 0) > 0 ? (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
                <Text style={[styles.breakdownValue, { color: colors.text }]}>
                  +{formatBanglaCurrency(order.shipping_charge)} {currencySymbol}
                </Text>
              </View>
            ) : null}

            {Number(order.discount_amount ?? 0) > 0 ? (
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: '#16a34a' }]}>Discount</Text>
                <Text style={[styles.breakdownValue, { color: '#16a34a' }]}>
                  -{formatBanglaCurrency(order.discount_amount)} {currencySymbol}
                </Text>
              </View>
            ) : null}

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total Payable (COD)</Text>
              <CurrencyText
                amount={order.total_amount}
                currencySymbol={currencySymbol}
                size="lg"
                color="#7c3aed"
                weight="800"
              />
            </View>
          </View>
        </View>

        {/* 5. Merchant Notes */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
            MERCHANT NOTE (INTERNAL)
          </Text>

          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.subtle,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Add internal note (e.g. customer wants delivery after 4 PM)..."
            placeholderTextColor={colors.textMuted}
            value={adminNote}
            onChangeText={setAdminNote}
            multiline
            numberOfLines={2}
          />

          <TouchableOpacity
            style={[styles.saveNoteBtn, saveNoteMutation.isPending && { opacity: 0.7 }]}
            onPress={() => saveNoteMutation.mutate()}
            disabled={saveNoteMutation.isPending}
            activeOpacity={0.7}
          >
            {saveNoteMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={13} color="#ffffff" />
                <Text style={styles.saveNoteText}>Save Note</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleCenter: {
    alignItems: 'center',
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  orderDateSub: {
    fontSize: 10,
    marginTop: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  sectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  cardHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  customerRow: {
    marginTop: 1,
  },
  customerNameBig: {
    fontSize: 14,
    fontWeight: '700',
  },
  customerPhoneBig: {
    fontSize: 12,
    marginTop: 1,
  },
  actionsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  addressText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  zoneText: {
    fontSize: 10.5,
    marginTop: 2,
  },
  copyAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    alignSelf: 'center',
  },
  copyAddressText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  statusSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChipsRow: {
    gap: 5,
    paddingVertical: 3,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
  },
  itemsList: {
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: 34,
    height: 34,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemVariant: {
    fontSize: 10,
    marginTop: 1,
  },
  itemQtyPrice: {
    fontSize: 10,
    marginTop: 1,
  },
  priceBreakdownBox: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 4,
    gap: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11.5,
  },
  breakdownValue: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 3,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11.5,
    minHeight: 46,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#7c3aed',
    paddingVertical: 6,
    borderRadius: 7,
    marginTop: 4,
  },
  saveNoteText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
});
