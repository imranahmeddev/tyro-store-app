import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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
  Phone,
  MessageCircle,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  Check,
  Package,
  MapPin,
  Mail,
  User,
  ArrowRight,
} from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';
import { useThemeStore } from '../../../src/store/themeStore';

export interface AbandonedCartItem {
  id: number;
  product_id?: number;
  product_name: string;
  variant?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image?: string | null;
}

export interface AbandonedCheckoutDetail {
  id: number;
  session_id: string;
  invoice_no: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_address?: string;
  total_amount: number;
  subtotal: number;
  status: string;
  is_recovered: boolean;
  admin_note?: string | null;
  channel?: string;
  created_at: string;
  last_active_at?: string;
  items: AbandonedCartItem[];
}

export default function AbandonedCheckoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [noteText, setNoteText] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);

  // 1. Fetch Abandoned Checkout Details
  const {
    data: checkout,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery<AbandonedCheckoutDetail>({
    queryKey: ['abandoned_checkout_detail', activeStore?.id, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/abandoned-checkouts/${id}`);
      const data = response.data?.data || response.data;
      if (data?.admin_note !== undefined && !noteDirty) {
        setNoteText(data.admin_note || '');
      }
      return data;
    },
    enabled: !!activeStore && !!id,
  });

  // 2. Note Update Mutation
  const updateNoteMutation = useMutation({
    mutationFn: async (admin_note: string) => {
      const response = await apiClient.patch(`/api/v1/abandoned-checkouts/${id}/note`, { admin_note });
      return response.data;
    },
    onSuccess: () => {
      setNoteDirty(false);
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkout_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      Alert.alert('Saved', 'Admin note updated successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update note.');
    },
  });

  // 3. Toggle Recovered Mutation
  const toggleRecoverMutation = useMutation({
    mutationFn: async (is_recovered: boolean) => {
      const response = await apiClient.patch(`/api/v1/abandoned-checkouts/${id}/recover`, { is_recovered });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkout_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['abandoned_stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update recovery status.');
    },
  });

  // 4. Convert to Real Order Mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/api/v1/abandoned-checkouts/${id}/convert`);
      return response.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkout_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['abandoned_stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });

      const newOrderId = data?.order_id || data?.order?.id;
      Alert.alert(
        'Order Created! 🎉',
        `Order #${data?.order?.order_number || newOrderId} has been created and this cart is marked recovered.`,
        [
          {
            text: 'View Order',
            onPress: () => {
              if (newOrderId) {
                router.replace(`/orders/${newOrderId}` as any);
              } else {
                router.replace('/(tabs)/orders' as any);
              }
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Conversion Failed', err?.response?.data?.message || 'Could not convert abandoned cart to order.');
    },
  });

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/abandoned-checkouts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned_checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['abandoned_stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      Alert.alert('Deleted', 'Checkout record deleted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete record.');
    },
  });

  const handleCall = () => {
    if (!checkout?.customer_phone) {
      Alert.alert('No Phone', 'Customer phone number is not available.');
      return;
    }
    const cleanPhone = checkout.customer_phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = () => {
    if (!checkout?.customer_phone) {
      Alert.alert('No Phone', 'Customer phone number is not available.');
      return;
    }
    const cleanPhone = checkout.customer_phone.replace(/[^0-9]/g, '');
    const storeName = activeStore?.store_name || 'our store';
    const message = `Hello ${checkout.customer_name || 'there'},\n\nWe noticed you left some items in your cart at ${storeName}. Do you need any assistance completing your order?`;
    const waUrl = `https://wa.me/${cleanPhone.startsWith('88') ? cleanPhone : '88' + cleanPhone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(waUrl);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Checkout Record',
      'Are you sure you want to delete this abandoned cart record? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const confirmConvert = () => {
    Alert.alert(
      'Create Order & Recover',
      `Create an official order for "${checkout?.customer_name || 'Customer'}" and mark this cart as recovered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Order', onPress: () => convertMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading cart details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !checkout) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
        <View style={styles.centerContainer}>
          <AlertTriangle size={40} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Record Not Found</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const itemsList = checkout.items || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { backgroundColor: colors.isDark ? '#000000' : '#ffffff', borderBottomColor: colors.isDark ? '#27272a' : '#e4e4e7' }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Abandoned Cart #{checkout.id}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {checkout.last_active_at ? new Date(checkout.last_active_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
          </Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={confirmDelete} activeOpacity={0.7}>
          <Trash2 size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, checkout.is_recovered ? styles.bannerRecovered : styles.bannerAbandoned]}>
          <View style={styles.bannerLeft}>
            {checkout.is_recovered ? (
              <CheckCircle2 size={22} color="#15803d" />
            ) : (
              <AlertTriangle size={22} color="#b45309" />
            )}
            <View>
              <Text style={[styles.bannerTitle, { color: checkout.is_recovered ? '#15803d' : '#b45309' }]}>
                {checkout.is_recovered ? 'Cart Recovered' : 'Unrecovered Cart'}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: checkout.is_recovered ? '#166534' : '#92400e' }]}>
                {checkout.is_recovered ? 'Order has been placed or marked recovered' : 'Customer left before completing payment'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.toggleRecoverBtn, { borderColor: checkout.is_recovered ? '#86efac' : '#fde68a' }]}
            onPress={() => toggleRecoverMutation.mutate(!checkout.is_recovered)}
            disabled={toggleRecoverMutation.isPending}
            activeOpacity={0.7}
          >
            {toggleRecoverMutation.isPending ? (
              <ActivityIndicator size="small" color={checkout.is_recovered ? '#15803d' : '#b45309'} />
            ) : (
              <Text style={[styles.toggleRecoverText, { color: checkout.is_recovered ? '#15803d' : '#b45309' }]}>
                {checkout.is_recovered ? 'Revert' : 'Mark Recovered'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Customer Info Card with 1-Tap Actions */}
        <View style={[styles.card, { backgroundColor: colors.isDark ? '#121214' : '#ffffff', borderColor: colors.isDark ? '#27272a' : '#e4e4e7' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Customer Details</Text>

          <View style={styles.infoRow}>
            <User size={16} color={colors.textSecondary} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name:</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{checkout.customer_name || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Phone size={16} color={colors.textSecondary} style={styles.infoIcon} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone:</Text>
            <Text style={[styles.infoValue, { color: colors.text, fontWeight: '700' }]}>
              {checkout.customer_phone || 'N/A'}
            </Text>
          </View>

          {checkout.customer_email ? (
            <View style={styles.infoRow}>
              <Mail size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{checkout.customer_email}</Text>
            </View>
          ) : null}

          {checkout.shipping_address ? (
            <View style={styles.infoRow}>
              <MapPin size={16} color={colors.textSecondary} style={styles.infoIcon} />
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Address:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{checkout.shipping_address}</Text>
            </View>
          ) : null}

          {/* Quick Reachout Buttons */}
          <View style={styles.reachoutRow}>
            <TouchableOpacity
              style={[styles.reachoutBtn, styles.callBtn]}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <Phone size={16} color="#ffffff" />
              <Text style={styles.reachoutBtnText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.reachoutBtn, styles.waBtn]}
              onPress={handleWhatsApp}
              activeOpacity={0.7}
            >
              <MessageCircle size={16} color="#ffffff" />
              <Text style={styles.reachoutBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cart Items Card */}
        <View style={[styles.card, { backgroundColor: colors.isDark ? '#121214' : '#ffffff', borderColor: colors.isDark ? '#27272a' : '#e4e4e7' }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Cart Items ({itemsList.length})
            </Text>
            <Text style={[styles.cartTotalHeading, { color: '#8b5cf6' }]}>
              {Math.round(checkout.total_amount).toLocaleString('en-IN')}{currencySymbol}
            </Text>
          </View>

          {itemsList.length === 0 ? (
            <View style={styles.emptyItemsBox}>
              <Package size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyItemsText, { color: colors.textSecondary }]}>No items recorded in cart</Text>
            </View>
          ) : (
            itemsList.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.itemRow,
                  { borderBottomColor: colors.isDark ? '#27272a' : '#f1f5f9' },
                  idx === itemsList.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.itemImageFallback, { backgroundColor: colors.isDark ? '#27272a' : '#f4f4f5' }]}>
                    <Package size={20} color={colors.textSecondary} />
                  </View>
                )}

                <View style={styles.itemDetails}>
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                    {item.product_name}
                  </Text>
                  {item.variant ? (
                    <Text style={[styles.itemVariant, { color: colors.textSecondary }]}>
                      Variant: {item.variant}
                    </Text>
                  ) : null}
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {item.quantity} × {Math.round(item.unit_price).toLocaleString('en-IN')}{currencySymbol}
                  </Text>
                </View>

                <Text style={[styles.itemTotal, { color: colors.text }]}>
                  {Math.round(item.total_price || (item.unit_price * item.quantity)).toLocaleString('en-IN')}{currencySymbol}
                </Text>
              </View>
            ))
          )}

          <View style={[styles.summaryDivider, { backgroundColor: colors.isDark ? '#27272a' : '#e4e4e7' }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Cart Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {Math.round(checkout.total_amount).toLocaleString('en-IN')}{currencySymbol}
            </Text>
          </View>
        </View>

        {/* Admin Note Card */}
        <View style={[styles.card, { backgroundColor: colors.isDark ? '#121214' : '#ffffff', borderColor: colors.isDark ? '#27272a' : '#e4e4e7' }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Admin Note</Text>
          <TextInput
            style={[
              styles.noteInput,
              {
                backgroundColor: colors.isDark ? '#1c1c1e' : '#f8fafc',
                color: colors.text,
                borderColor: colors.isDark ? '#27272a' : '#e2e8f0',
              },
            ]}
            placeholder="Write recovery notes (e.g. called customer, requested callback at 6pm)..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            value={noteText}
            onChangeText={(txt) => {
              setNoteText(txt);
              setNoteDirty(true);
            }}
          />

          <TouchableOpacity
            style={[styles.saveNoteBtn, !noteDirty && styles.saveNoteBtnDisabled]}
            onPress={() => updateNoteMutation.mutate(noteText)}
            disabled={!noteDirty || updateNoteMutation.isPending}
            activeOpacity={0.7}
          >
            {updateNoteMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={16} color="#ffffff" />
                <Text style={styles.saveNoteBtnText}>Save Note</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Convert to Order Action Card */}
        {!checkout.is_recovered && (
          <View style={[styles.convertCard, { backgroundColor: colors.isDark ? '#1e1b4b' : '#f5f3ff', borderColor: '#c4b5fd' }]}>
            <View style={styles.convertTextWrap}>
              <Text style={[styles.convertTitle, { color: '#6d28d9' }]}>Ready to Recover?</Text>
              <Text style={[styles.convertDesc, { color: colors.isDark ? '#c4b5fd' : '#7c3aed' }]}>
                1-Click convert creates an official order in your store, reserves stock, and notifies customer.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.convertBtn}
              onPress={confirmConvert}
              disabled={convertMutation.isPending}
              activeOpacity={0.7}
            >
              {convertMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.convertBtnText}>Convert to Order</Text>
                  <ArrowRight size={18} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    marginTop: 12,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerAbandoned: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  bannerRecovered: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  toggleRecoverBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  toggleRecoverText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cartTotalHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 13,
    width: 65,
  },
  infoValue: {
    fontSize: 13,
    flex: 1,
  },
  reachoutRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
  },
  reachoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  callBtn: {
    backgroundColor: '#0284c7',
  },
  waBtn: {
    backgroundColor: '#16a34a',
  },
  reachoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyItemsBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyItemsText: {
    fontSize: 13,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  itemImageFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemVariant: {
    fontSize: 11,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  saveNoteBtnDisabled: {
    opacity: 0.5,
  },
  saveNoteBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  convertCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  convertTextWrap: {
    gap: 4,
  },
  convertTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  convertDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 10,
  },
  convertBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
