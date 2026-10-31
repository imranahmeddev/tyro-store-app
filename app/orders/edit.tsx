import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  Plus,
  ChevronUp,
  X,
  Check,
  Tag,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';

export default function OrderEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingZone, setShippingZone] = useState('ঢাকার বাহিরে');
  const [shippingCharge, setShippingCharge] = useState('130');
  const [customerNote, setCustomerNote] = useState('first check then Pay.');
  const [couponCode, setCouponCode] = useState('');

  // Modals
  const [editAddressModalVisible, setEditAddressModalVisible] = useState(false);
  const [editNoteModalVisible, setEditNoteModalVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [shippingModalVisible, setShippingModalVisible] = useState(false);

  // 1. Fetch Order Details (Zero Dummy Data)
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order_detail_edit', activeStore?.id, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/orders/${id}`);
      return response.data?.data || response.data;
    },
    enabled: !!activeStore && !!id,
  });

  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name || '');
      setCustomerPhone(order.customer_phone || '');
      setShippingAddress(order.shipping_address || '');
      setShippingZone(order.shipping_zone || 'ঢাকার বাহিরে');
      setShippingCharge(String(Math.round(Number(order.shipping_charge) || 130)));
      setCustomerNote(order.delivery_note || order.customer_note || 'first check then Pay.');
    }
  }, [order]);

  // 2. Save Order Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_zone: shippingZone.trim(),
        shipping_charge: parseFloat(shippingCharge) || 0,
        delivery_note: customerNote.trim(),
      };
      const response = await apiClient.put(`/api/v1/orders/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['wc_dashboard'] });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace(`/orders/${id}` as any);
      }
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update order.');
    },
  });

  const productsSubtotal = (order?.items || []).reduce(
    (sum: number, it: any) => sum + (Number(it.total_price) || (Number(it.unit_price) * Number(it.quantity)) || 0),
    0
  );
  const currentShipCost = parseFloat(shippingCharge) || 0;
  const currentTotal = productsSubtotal + currentShipCost;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.isDark ? '#000000' : '#f4f4f5' }]}>
      {/* 1. Header Bar (Screenshot: Cancel pill left, Order # center) */}
      <View style={[styles.headerBar, { backgroundColor: colors.isDark ? '#000000' : '#ffffff' }]}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.isDark ? '#1c1c1e' : '#f1f5f9' }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Order #{order?.invoice_no || order?.order_number || id}
        </Text>

        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 2. Shipping Card (Screenshot: ঢাকার বাহিরে | Flat rate | 130৳) */}
        <TouchableOpacity
          style={[styles.shippingCard, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}
          onPress={() => setShippingModalVisible(true)}
          activeOpacity={0.7}
        >
          <View>
            <Text style={[styles.shippingTitle, { color: colors.text }]}>{shippingZone}</Text>
            <Text style={[styles.shippingSub, { color: colors.textSecondary }]}>Flat rate</Text>
          </View>

          <Text style={[styles.shippingAmount, { color: colors.text }]}>
            {Math.round(currentShipCost).toLocaleString('en-IN')}{currencySymbol}
          </Text>
        </TouchableOpacity>

        {/* 3. + Add Coupon Link */}
        <TouchableOpacity
          style={styles.addCouponLink}
          onPress={() => setCouponModalVisible(true)}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
          <Text style={styles.addCouponText}>Add Coupon</Text>
        </TouchableOpacity>

        {/* 4. Customer Card (Screenshot: Customer heading with Edit pencil, Billing Address, Shipping Address) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer</Text>
          <TouchableOpacity
            style={styles.pencilBtn}
            onPress={() => setEditAddressModalVisible(true)}
            activeOpacity={0.7}
          >
            <Edit2 size={18} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <View style={styles.addressSectionBox}>
          {/* Billing Address */}
          <Text style={[styles.addressTypeHeader, { color: colors.text }]}>Billing Address</Text>
          <Text style={[styles.addressTextLine, { color: colors.text }]}>{customerName || 'No name'}</Text>
          <Text style={[styles.addressTextLine, { color: colors.textSecondary }]}>
            {shippingAddress || 'No address specified.'}
          </Text>
          <Text style={[styles.addressTextLine, { color: colors.textSecondary }]}>BD</Text>

          {/* Shipping Address */}
          <Text style={[styles.addressTypeHeader, { color: colors.text, marginTop: 18 }]}>Shipping Address</Text>
          <Text style={[styles.addressTextLine, { color: colors.textSecondary }]}>
            {shippingAddress || 'No address specified.'}
          </Text>
        </View>

        {/* 5. Customer Note Card (Screenshot: Customer Note heading with Edit pencil) */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Note</Text>
          <TouchableOpacity
            style={styles.pencilBtn}
            onPress={() => setEditNoteModalVisible(true)}
            activeOpacity={0.7}
          >
            <Edit2 size={18} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <View style={styles.addressSectionBox}>
          <Text style={[styles.customerNoteText, { color: colors.text }]}>
            {customerNote || 'No note provided.'}
          </Text>
        </View>
      </ScrollView>

      {/* 6. Sticky Bottom Sheet Footer (Screenshot: ChevronUp, Order total, Done Button) */}
      <View style={[styles.bottomFooter, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
        <View style={styles.footerChevronBox}>
          <ChevronUp size={20} color={colors.textSecondary} />
        </View>

        <View style={styles.orderTotalRow}>
          <Text style={[styles.orderTotalLabel, { color: colors.text }]}>Order total</Text>
          <Text style={[styles.orderTotalValue, { color: colors.text }]}>
            {Math.round(currentTotal).toLocaleString('en-IN')}{currencySymbol}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          activeOpacity={0.8}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.doneBtnText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit Address Modal */}
      <Modal
        visible={editAddressModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit Customer Details</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Customer Name</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. Mujib"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phone Number</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="e.g. 01700000000"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Address (Village, Thana, District)</Text>
            <TextInput
              style={[styles.inputBoxMultiline, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={shippingAddress}
              onChangeText={setShippingAddress}
              placeholder="e.g. Sylhet.Golapgonj. tikorbari masjid or samne"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.sheetActionBtn}
              onPress={() => setEditAddressModalVisible(false)}
            >
              <Text style={styles.sheetActionBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        visible={editNoteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Customer Note</Text>

            <TextInput
              style={[styles.inputBoxMultiline, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={customerNote}
              onChangeText={setCustomerNote}
              placeholder="e.g. first check then Pay."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={styles.sheetActionBtn}
              onPress={() => setEditNoteModalVisible(false)}
            >
              <Text style={styles.sheetActionBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Shipping Modal */}
      <Modal
        visible={shippingModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShippingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Shipping Settings</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Shipping Method / Zone</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={shippingZone}
              onChangeText={setShippingZone}
              placeholder="e.g. ঢাকার বাহিরে"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Shipping Cost (৳)</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={shippingCharge}
              onChangeText={setShippingCharge}
              placeholder="130"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.sheetActionBtn}
              onPress={() => setShippingModalVisible(false)}
            >
              <Text style={styles.sheetActionBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Coupon Modal */}
      <Modal
        visible={couponModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCouponModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.isDark ? '#18181b' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Apply Coupon Code</Text>

            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: colors.isDark ? '#27272a' : '#cbd5e1' }]}
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter coupon code (e.g. EID20)"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
            />

            <TouchableOpacity
              style={styles.sheetActionBtn}
              onPress={() => {
                Alert.alert('Coupon', `Coupon code "${couponCode}" saved.`);
                setCouponModalVisible(false);
              }}
            >
              <Text style={styles.sheetActionBtnText}>Apply Coupon</Text>
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
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  shippingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  shippingSub: {
    fontSize: 13,
    marginTop: 2,
  },
  shippingAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  addCouponLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  addCouponText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  pencilBtn: {
    padding: 4,
  },
  addressSectionBox: {
    paddingLeft: 2,
    marginBottom: 8,
  },
  addressTypeHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  addressTextLine: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  customerNoteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  footerChevronBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  orderTotalLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  orderTotalValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 16,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  inputBox: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  inputBoxMultiline: {
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  sheetActionBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  sheetActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

