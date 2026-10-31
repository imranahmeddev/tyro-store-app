import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  Truck,
  FileText,
  Check,
  CreditCard,
  ShoppingBag,
  Store,
  X,
  AlertCircle,
  Scan,
} from 'lucide-react-native';
import BarcodeScanner from '../../src/components/BarcodeScanner';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

interface SelectedItem {
  product_id: number;
  product_name: string;
  image?: string | null;
  sku?: string | null;
  variant_id?: number | null;
  variant?: string | null;
  quantity: number;
  unit_price: number;
}

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Cash on Delivery' },
  { key: 'cash', label: 'Cash (In-Person POS)' },
  { key: 'bkash', label: 'bKash / Mobile Banking' },
  { key: 'bank', label: 'Direct Bank Transfer' },
] as const;

export default function CreateOrderScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const currencySymbol = activeStore?.currency || '৳';

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('Dhaka');
  const [shippingZone, setShippingZone] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Pricing & Payment State
  const [shippingCharge, setShippingCharge] = useState('60');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // Product Search & Cart State
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [scannerVisible, setScannerVisible] = useState(false);

  // Real-time Product Search Query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['products_search', activeStore?.id, searchProductQuery],
    queryFn: async () => {
      if (!searchProductQuery.trim()) return [];
      const res = await apiClient.get('/api/v1/products', {
        params: { search: searchProductQuery.trim(), per_page: 8 },
      });
      return res.data?.data || res.data || [];
    },
    enabled: searchProductQuery.trim().length > 1,
  });

  const handleSelectProduct = (product: any) => {
    const existingIndex = selectedItems.findIndex((i) => i.product_id === product.id);
    if (existingIndex > -1) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      const price =
        product.sale_price && Number(product.sale_price) > 0
          ? Number(product.sale_price)
          : Number(product.price) || 0;

      setSelectedItems([
        ...selectedItems,
        {
          product_id: product.id,
          product_name: product.name,
          image: product.image_url || product.thumbnail || null,
          sku: product.sku || null,
          quantity: 1,
          unit_price: price,
        },
      ]);
    }
    setSearchProductQuery('');
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setSearchProductQuery(barcode);
    try {
      const res = await apiClient.get('/api/v1/products', {
        params: { search: barcode.trim(), per_page: 5 },
      });
      const items = res.data?.data || res.data || [];
      if (items.length > 0) {
        handleSelectProduct(items[0]);
      }
    } catch (e) {
      console.warn('[POS] Error looking up scanned barcode:', e);
    }
  };

  const handleQuantityChange = (productId: number, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as SelectedItem[]
    );
  };

  const handleUnitPriceChange = (productId: number, text: string) => {
    const parsed = parseFloat(text) || 0;
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.product_id === productId ? { ...item, unit_price: parsed } : item
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setSelectedItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const handleShippingZoneChange = (zone: 'inside_dhaka' | 'outside_dhaka') => {
    setShippingZone(zone);
    setShippingCharge(zone === 'inside_dhaka' ? '60' : '120');
  };

  // Calculations
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const shipCost = parseFloat(shippingCharge) || 0;
  const discountCost = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + shipCost - discountCost);

  // Create Order Mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!customerName.trim()) throw new Error('Customer Name is required.');
      if (!customerPhone.trim()) throw new Error('Customer Phone is required.');
      if (!shippingAddress.trim()) throw new Error('Shipping Address is required.');
      if (selectedItems.length === 0) throw new Error('Please add at least one product to the order.');

      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        shipping_address: shippingAddress.trim(),
        city: city.trim() || 'Dhaka',
        shipping_zone: shippingZone,
        shipping_charge: shipCost,
        discount_amount: discountCost,
        payment_method: paymentMethod,
        delivery_note: deliveryNote.trim() || null,
        items: selectedItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      const response = await apiClient.post('/api/v1/orders', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['wc_dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wc_orders_badge'] });
      const createdOrder = data?.order || data?.data;
      Alert.alert(
        'Order Created Successfully',
        `Invoice #${createdOrder?.invoice_no || 'Created'} has been recorded.`,
        [
          {
            text: 'View Order',
            onPress: () => {
              if (createdOrder?.id) {
                router.replace(`/orders/${createdOrder.id}`);
              } else {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/orders');
              }
            },
          },
        ]
      );
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to create order. Please verify input data.';
      Alert.alert('Validation Error', msg);
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/orders');
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.topBarTitle}>
          <Text style={styles.headerTitle}>New Order / POS</Text>
          <Text style={styles.headerSubtitle}>{activeStore?.store_name || 'Store'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Customer Information Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User size={18} color="#0284c7" />
            <Text style={styles.sectionTitle}>Customer Information</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Customer Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <User size={16} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor="#94a3b8"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 01700000000"
                placeholderTextColor="#94a3b8"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address (Optional)</Text>
            <View style={styles.inputContainer}>
              <Mail size={16} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. customer@example.com"
                placeholderTextColor="#94a3b8"
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Delivery Address <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <MapPin size={16} color="#94a3b8" style={[styles.inputIcon, { marginTop: 10 }]} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="House, Road, Area, Sector..."
                placeholderTextColor="#94a3b8"
                value={shippingAddress}
                onChangeText={setShippingAddress}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Shipping Delivery Zone</Text>
            <View style={styles.zoneSelector}>
              <TouchableOpacity
                style={[styles.zonePill, shippingZone === 'inside_dhaka' && styles.zonePillActive]}
                onPress={() => handleShippingZoneChange('inside_dhaka')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.zonePillText,
                    shippingZone === 'inside_dhaka' && styles.zonePillTextActive,
                  ]}
                >
                  Inside Dhaka ({currencySymbol}60)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.zonePill, shippingZone === 'outside_dhaka' && styles.zonePillActive]}
                onPress={() => handleShippingZoneChange('outside_dhaka')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.zonePillText,
                    shippingZone === 'outside_dhaka' && styles.zonePillTextActive,
                  ]}
                >
                  Outside Dhaka ({currencySymbol}120)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Order / Delivery Note (Optional)</Text>
            <TextInput
              style={[styles.input, styles.singleLineInput]}
              placeholder="e.g. Call before delivery, fragile items"
              placeholderTextColor="#94a3b8"
              value={deliveryNote}
              onChangeText={setDeliveryNote}
            />
          </View>
        </View>

        {/* Live Catalog Cart Builder */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Package size={18} color="#0284c7" />
            <Text style={styles.sectionTitle}>Cart Items ({selectedItems.length})</Text>
          </View>

          {/* Product Search Input */}
          <View style={styles.searchContainer}>
            <Search size={16} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products by title or SKU to add..."
              placeholderTextColor="#94a3b8"
              value={searchProductQuery}
              onChangeText={setSearchProductQuery}
            />
            {isSearching && <ActivityIndicator size="small" color="#0284c7" />}
            {searchProductQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => setSearchProductQuery('')} activeOpacity={0.7}>
                <X size={16} color="#94a3b8" style={{ marginRight: 6 }} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{
                padding: 6,
                backgroundColor: '#f0f9ff',
                borderRadius: 8,
                marginLeft: 4,
              }}
              onPress={() => setScannerVisible(true)}
              activeOpacity={0.7}
            >
              <Scan size={18} color="#0284c7" />
            </TouchableOpacity>
          </View>

          {/* Search Results Dropdown List */}
          {searchResults && searchResults.length > 0 && searchProductQuery.trim().length > 1 && (
            <View style={styles.searchResultsBox}>
              <Text style={styles.searchResultsTitle}>Select Product to Add:</Text>
              {searchResults.map((product: any) => {
                const price =
                  product.sale_price && Number(product.sale_price) > 0
                    ? Number(product.sale_price)
                    : Number(product.price) || 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectProduct(product)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.searchResultLeft}>
                      <View style={styles.searchResultThumb}>
                        {product.image_url ? (
                          <Image source={{ uri: product.image_url }} style={styles.thumbImage} />
                        ) : (
                          <Package size={18} color="#94a3b8" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchResultName} numberOfLines={1}>
                          {product.name}
                        </Text>
                        <Text style={styles.searchResultSku}>
                          SKU: {product.sku || 'N/A'} • Stock: {product.stock_quantity ?? '∞'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.searchResultRight}>
                      <Text style={styles.searchResultPrice}>
                        {currencySymbol} {price.toFixed(2)}
                      </Text>
                      <View style={styles.addPill}>
                        <Plus size={12} color="#ffffff" />
                        <Text style={styles.addPillText}>Add</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Selected Items List */}
          {selectedItems.length === 0 ? (
            <View style={styles.emptyCartBox}>
              <ShoppingBag size={32} color="#cbd5e1" />
              <Text style={styles.emptyCartTitle}>No Items in Cart</Text>
              <Text style={styles.emptyCartSubtitle}>
                Type in the search box above to add products to this order.
              </Text>
            </View>
          ) : (
            <View style={styles.cartList}>
              {selectedItems.map((item) => (
                <View key={item.product_id} style={styles.cartItemRow}>
                  <View style={styles.cartItemThumb}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.thumbImage} />
                    ) : (
                      <Package size={18} color="#94a3b8" />
                    )}
                  </View>

                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    {item.sku ? <Text style={styles.cartItemSku}>SKU: {item.sku}</Text> : null}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceSymbol}>{currencySymbol}</Text>
                      <TextInput
                        style={styles.unitPriceInput}
                        keyboardType="numeric"
                        value={String(item.unit_price)}
                        onChangeText={(txt) => handleUnitPriceChange(item.product_id, txt)}
                      />
                      <Text style={styles.multiplierText}>each</Text>
                    </View>
                  </View>

                  <View style={styles.cartItemActions}>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepButton}
                        onPress={() => handleQuantityChange(item.product_id, -1)}
                        activeOpacity={0.7}
                      >
                        <Minus size={12} color="#475569" />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepButton}
                        onPress={() => handleQuantityChange(item.product_id, 1)}
                        activeOpacity={0.7}
                      >
                        <Plus size={12} color="#475569" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cartLineTotal}>
                      {currencySymbol} {(item.quantity * item.unit_price).toFixed(2)}
                    </Text>

                    <TouchableOpacity
                      style={styles.trashBtn}
                      onPress={() => handleRemoveItem(item.product_id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Adjustments & Payment Method */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <DollarSign size={18} color="#0284c7" />
            <Text style={styles.sectionTitle}>Adjustments & Payment</Text>
          </View>

          <View style={styles.adjustmentRow}>
            <Text style={styles.adjustmentLabel}>Delivery Fee ({currencySymbol})</Text>
            <TextInput
              style={styles.adjustmentInput}
              keyboardType="numeric"
              value={shippingCharge}
              onChangeText={setShippingCharge}
            />
          </View>

          <View style={styles.adjustmentRow}>
            <Text style={styles.adjustmentLabel}>Custom Discount ({currencySymbol})</Text>
            <TextInput
              style={styles.adjustmentInput}
              keyboardType="numeric"
              value={discountAmount}
              onChangeText={setDiscountAmount}
            />
          </View>

          <View style={styles.paymentSection}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.paymentGrid}>
              {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity
                  key={pm.key}
                  style={[
                    styles.paymentOption,
                    paymentMethod === pm.key && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMethod(pm.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.paymentOptionText,
                      paymentMethod === pm.key && styles.paymentOptionTextActive,
                    ]}
                  >
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Real-time Financial Breakdown */}
          <View style={styles.calculationBox}>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Subtotal</Text>
              <Text style={styles.calcValue}>
                {currencySymbol} {subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Shipping Charge</Text>
              <Text style={styles.calcValue}>
                +{currencySymbol} {shipCost.toFixed(2)}
              </Text>
            </View>
            {discountCost > 0 && (
              <View style={styles.calcRow}>
                <Text style={[styles.calcLabel, { color: '#16a34a' }]}>Discount</Text>
                <Text style={[styles.calcValue, { color: '#16a34a' }]}>
                  -{currencySymbol} {discountCost.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.calcRow, styles.calcTotalRow]}>
              <Text style={styles.calcTotalLabel}>Grand Total</Text>
              <Text style={styles.calcTotalValue}>
                {currencySymbol} {grandTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            createOrderMutation.isPending && styles.submitButtonDisabled,
          ]}
          onPress={() => createOrderMutation.mutate()}
          disabled={createOrderMutation.isPending}
          activeOpacity={0.85}
        >
          {createOrderMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Text style={styles.submitButtonText}>Create Order</Text>
              <View style={styles.submitTotalPill}>
                <Text style={styles.submitTotalPillText}>
                  {currencySymbol} {grandTotal.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* POS Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScan={handleBarcodeScanned}
        title="Scan Barcode for POS"
        subtitle="Align product barcode or SKU within frame"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  topBarTitle: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#dc2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: '#0f172a',
  },
  singleLineInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    height: 42,
  },
  textArea: {
    minHeight: 64,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  zoneSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  zonePill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  zonePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  zonePillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  zonePillTextActive: {
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0f9ff',
    height: 44,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  searchResultsBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 8,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchResultsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  searchResultThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  searchResultSku: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  searchResultRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  searchResultPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyCartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 8,
  },
  emptyCartSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 16,
  },
  cartList: {
    gap: 10,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  cartItemSku: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceSymbol: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 2,
  },
  unitPriceInput: {
    height: 26,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    minWidth: 50,
  },
  multiplierText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
  cartItemActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
  },
  stepButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 8,
  },
  cartLineTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  trashBtn: {
    padding: 4,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  adjustmentLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  adjustmentInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  paymentSection: {
    marginTop: 6,
    marginBottom: 12,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentOption: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentOptionActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  paymentOptionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  paymentOptionTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  calculationBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 6,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  calcTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
    alignItems: 'center',
  },
  calcTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  calcTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284c7',
  },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  submitTotalPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  submitTotalPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
