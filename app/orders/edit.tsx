import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Plus,
  Minus,
  Trash2,
  Edit2,
  Search,
  Package,
  X,
  Check,
  MapPin,
  Tag,
  DollarSign,
  User,
  Phone,
  FileText,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import CurrencyText, { formatBanglaCurrency } from '../../src/components/ui/CurrencyText';
import { resolveProductImage } from '../../src/utils/image';

export interface EditableItem {
  id?: number;
  product_id?: number | null;
  product_name: string;
  variant?: string | null;
  quantity: number;
  unit_price: number;
  image?: string | null;
}

export default function OrderEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  // 1. Customer & Shipping Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingZone, setShippingZone] = useState('outside_dhaka');
  const [shippingCharge, setShippingCharge] = useState('130');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [customerNote, setCustomerNote] = useState('');

  // 2. Editable Items State
  const [items, setItems] = useState<EditableItem[]>([]);

  // 3. Product Search / Add Modal States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 4. Variant Edit Modal States
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [variantInputText, setVariantInputText] = useState('');

  // 5. Fetch Order Details
  const { data: order, isLoading } = useQuery({
    queryKey: ['order_detail_edit', activeStore?.id, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/orders/${id}`);
      return response.data?.data || response.data;
    },
    enabled: !!activeStore && !!id,
  });

  // Hydrate initial state
  useEffect(() => {
    if (order) {
      setCustomerName(order.customer_name || '');
      setCustomerPhone(order.customer_phone || '');
      setShippingAddress(order.shipping_address || '');
      setShippingZone(order.shipping_zone || 'outside_dhaka');
      setShippingCharge(String(Math.round(Number(order.shipping_charge) || 0)));
      setDiscountAmount(String(Math.round(Number(order.discount_amount) || 0)));
      setCustomerNote(order.delivery_note || order.customer_note || '');

      if (Array.isArray(order.items)) {
        setItems(
          order.items.map((it: any) => ({
            id: it.id,
            product_id: it.product_id || null,
            product_name: it.product_name || 'Item',
            variant: it.variant || null,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            image: it.image || it.product?.primary_image_url || null,
          }))
        );
      }
    }
  }, [order]);

  // Product Search Query
  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['products_search_for_order_edit', activeStore?.id, searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await apiClient.get('/api/v1/products', {
        params: { search: searchQuery.trim(), per_page: 8 },
      });
      return res.data?.data || res.data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  // Subtotal and Total Calculation
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  }, [items]);

  const shipCost = parseFloat(shippingCharge) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, subtotal + shipCost - discount);

  // Item Actions
  const handleQuantityChange = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        // Confirm removal
        Alert.alert(
          'Remove Product',
          `Are you sure you want to remove "${target.product_name}" from this order?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => {
                setItems((curr) => curr.filter((_, i) => i !== index));
              },
            },
          ]
        );
        return prev;
      }
      target.quantity = newQty;
      updated[index] = target;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenVariantEdit = (index: number) => {
    setEditingItemIndex(index);
    setVariantInputText(items[index]?.variant || '');
    setVariantModalVisible(true);
  };

  const handleSaveVariant = () => {
    if (editingItemIndex !== null) {
      setItems((prev) => {
        const updated = [...prev];
        updated[editingItemIndex] = {
          ...updated[editingItemIndex],
          variant: variantInputText.trim() || null,
        };
        return updated;
      });
    }
    setVariantModalVisible(false);
    setEditingItemIndex(null);
  };

  // Add Product from Search
  const handleSelectProduct = (product: any, variant?: string) => {
    const price = Number(product.sale_price || product.price || 0);
    const img = product.image_url || product.primary_image_url || product.image || null;

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        variant: variant || null,
        quantity: 1,
        unit_price: price,
        image: img,
      },
    ]);

    setAddModalVisible(false);
    setSearchQuery('');
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (items.length === 0) {
        throw new Error('Order must have at least one product.');
      }
      if (!customerName.trim()) {
        throw new Error('Customer name is required.');
      }
      if (!customerPhone.trim()) {
        throw new Error('Customer phone number is required.');
      }

      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_zone: shippingZone,
        shipping_charge: shipCost,
        discount_amount: discount,
        delivery_note: customerNote.trim(),
        items: items.map((it) => ({
          product_id: it.product_id || null,
          product_name: it.product_name,
          variant: it.variant || null,
          quantity: it.quantity,
          unit_price: it.unit_price,
          image: it.image || null,
        })),
      };

      const res = await apiClient.put(`/api/v1/orders/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order_detail', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['order_detail_edit', activeStore?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['orders_list'] });
      queryClient.invalidateQueries({ queryKey: ['wc_dashboard'] });
      Alert.alert('Success', 'Order has been customized and updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(`/orders/${id}` as any);
            }
          },
        },
      ]);
    },
    onError: (err: any) => {
      Alert.alert(
        'Update Failed',
        err.response?.data?.message || err.message || 'Failed to update order. Please check inputs.'
      );
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>
            Customize Order #{order?.invoice_no || order?.order_number || id}
          </Text>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>
            Change Products, Variations & Address
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderBtn, saveMutation.isPending && { opacity: 0.6 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          activeOpacity={0.8}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. ORDER ITEMS & VARIATIONS SECTION */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Package size={15} color="#7c3aed" />
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
                ORDERED PRODUCTS ({items.length})
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={() => setAddModalVisible(true)}
              activeOpacity={0.7}
            >
              <Plus size={13} color="#ffffff" />
              <Text style={styles.addProductBtnText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No products in this order. Tap "+ Add Product" to add.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {items.map((it, idx) => {
                const isLast = idx === items.length - 1;
                const lineTotal = it.unit_price * it.quantity;

                return (
                  <View
                    key={idx}
                    style={[
                      styles.itemRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    {/* Thumbnail */}
                    <View style={[styles.itemThumb, { backgroundColor: colors.subtle }]}>
                      {(() => {
                        const itImg = resolveProductImage(it);
                        return itImg ? (
                          <Image source={{ uri: itImg }} style={styles.thumbImg} resizeMode="cover" />
                        ) : (
                          <Package size={16} color={colors.textMuted} />
                        );
                      })()}
                    </View>

                    {/* Product & Variation Info */}
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                        {it.product_name}
                      </Text>

                      {/* Variation Selector / Pill */}
                      <TouchableOpacity
                        style={[styles.variantPill, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                        onPress={() => handleOpenVariantEdit(idx)}
                        activeOpacity={0.7}
                      >
                        <Tag size={10} color="#7c3aed" />
                        <Text style={[styles.variantText, { color: it.variant ? '#7c3aed' : colors.textMuted }]}>
                          {it.variant ? it.variant : 'Tap to set variation (Size/Color)'}
                        </Text>
                        <Edit2 size={10} color={colors.textSecondary} />
                      </TouchableOpacity>

                      {/* Unit Price */}
                      <Text style={[styles.itemUnitPrice, { color: colors.textSecondary }]}>
                        {formatBanglaCurrency(it.unit_price)} {currencySymbol} each
                      </Text>
                    </View>

                    {/* Stepper & Delete */}
                    <View style={styles.itemRightActions}>
                      <CurrencyText
                        amount={lineTotal}
                        currencySymbol={currencySymbol}
                        size="sm"
                        color={colors.text}
                        weight="700"
                      />

                      <View style={[styles.stepperContainer, { borderColor: colors.border }]}>
                        <TouchableOpacity
                          style={[styles.stepperBtn, { backgroundColor: colors.subtle }]}
                          onPress={() => handleQuantityChange(idx, -1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Minus size={11} color={colors.text} />
                        </TouchableOpacity>

                        <Text style={[styles.stepperQty, { color: colors.text }]}>{it.quantity}</Text>

                        <TouchableOpacity
                          style={[styles.stepperBtn, { backgroundColor: colors.subtle }]}
                          onPress={() => handleQuantityChange(idx, 1)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Plus size={11} color={colors.text} />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleRemoveItem(idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. CUSTOMER DETAILS SECTION */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <User size={15} color="#7c3aed" />
            <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
              CUSTOMER & DELIVERY ADDRESS
            </Text>
          </View>

          {/* Name & Phone */}
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CUSTOMER NAME *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Full name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PHONE NUMBER *</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="017xxxxxxxx"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Full Address */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SHIPPING ADDRESS *</Text>
          <TextInput
            style={[styles.textInputMultiline, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
            value={shippingAddress}
            onChangeText={setShippingAddress}
            placeholder="Full address (House, Road, Area, Thana, District)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          {/* Delivery Zone Presets */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DELIVERY REGION</Text>
          <View style={styles.zoneButtonsRow}>
            <TouchableOpacity
              style={[
                styles.zoneBtn,
                shippingZone === 'inside_dhaka'
                  ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }
                  : { backgroundColor: colors.subtle, borderColor: colors.border },
              ]}
              onPress={() => {
                setShippingZone('inside_dhaka');
                setShippingCharge('60');
              }}
            >
              <Text style={[styles.zoneBtnText, { color: shippingZone === 'inside_dhaka' ? '#ffffff' : colors.text }]}>
                Inside Dhaka (৳60)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.zoneBtn,
                shippingZone === 'outside_dhaka'
                  ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' }
                  : { backgroundColor: colors.subtle, borderColor: colors.border },
              ]}
              onPress={() => {
                setShippingZone('outside_dhaka');
                setShippingCharge('120');
              }}
            >
              <Text style={[styles.zoneBtnText, { color: shippingZone === 'outside_dhaka' ? '#ffffff' : colors.text }]}>
                Outside Dhaka (৳120)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Charges Row */}
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>DELIVERY CHARGE (৳)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
                value={shippingCharge}
                onChangeText={setShippingCharge}
                keyboardType="numeric"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>SPECIAL DISCOUNT (৳)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
                value={discountAmount}
                onChangeText={setDiscountAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Customer Note */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>CUSTOMER / DELIVERY NOTE</Text>
          <TextInput
            style={[styles.textInputMultiline, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
            value={customerNote}
            onChangeText={setCustomerNote}
            placeholder="Special instructions (e.g. check before payment, color preference)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* 4. BILL SUMMARY CARD */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>BILL SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Products Subtotal ({items.length} items)</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {formatBanglaCurrency(subtotal)} {currencySymbol}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delivery Charge</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              + {formatBanglaCurrency(shipCost)} {currencySymbol}
            </Text>
          </View>

          {discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>Special Discount</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                - {formatBanglaCurrency(discount)} {currencySymbol}
              </Text>
            </View>
          ) : null}

          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

          <View style={styles.summaryTotalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Grand Total</Text>
            <CurrencyText
              amount={grandTotal}
              currencySymbol={currencySymbol}
              size="lg"
              color="#7c3aed"
              weight="800"
            />
          </View>
        </View>
      </ScrollView>

      {/* 5. Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View>
          <Text style={[styles.bottomTotalLabel, { color: colors.textSecondary }]}>Grand Total</Text>
          <CurrencyText
            amount={grandTotal}
            currencySymbol={currencySymbol}
            size="md"
            color="#7c3aed"
            weight="800"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          activeOpacity={0.8}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Order Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL 1: ADD PRODUCT / VARIATION */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Product to Order</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Search from catalog and tap to add
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.modalSearchBox, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Search by product name or SKU..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={15} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Results List */}
            <ScrollView style={{ maxHeight: 350 }}>
              {isSearching ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                </View>
              ) : (searchResults || []).length > 0 ? (
                (searchResults || []).map((prod: any) => {
                  const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
                  const price = Number(prod.sale_price || prod.price || 0);

                  return (
                    <View key={prod.id} style={[styles.searchResultCard, { borderColor: colors.border }]}>
                      <View style={styles.searchResultMain}>
                        <View style={[styles.itemThumb, { backgroundColor: colors.subtle }]}>
                          {(() => {
                            const pImg = resolveProductImage(prod);
                            return pImg ? (
                              <Image
                                source={{ uri: pImg }}
                                style={styles.thumbImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <Package size={15} color={colors.textMuted} />
                            );
                          })()}
                        </View>

                        <View style={{ flex: 1, marginHorizontal: 8 }}>
                          <Text style={[styles.itemName, { color: colors.text }]}>{prod.name}</Text>
                          <Text style={[styles.itemUnitPrice, { color: colors.textSecondary }]}>
                            {formatBanglaCurrency(price)} {currencySymbol}
                            {prod.sku ? ` • SKU: ${prod.sku}` : ''}
                          </Text>
                        </View>

                        {!hasVariants && (
                          <TouchableOpacity
                            style={styles.addSingleBtn}
                            onPress={() => handleSelectProduct(prod)}
                          >
                            <Plus size={13} color="#ffffff" />
                            <Text style={styles.addSingleBtnText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* If product has variations */}
                      {hasVariants && (
                        <View style={styles.variantsGrid}>
                          <Text style={[styles.variantHeading, { color: colors.textSecondary }]}>
                            Select Variation:
                          </Text>
                          <View style={styles.variantChipsWrapper}>
                            {prod.variants.map((v: any, vIdx: number) => {
                              const variantName = v.value || v.name || `Var #${vIdx + 1}`;
                              return (
                                <TouchableOpacity
                                  key={v.id || vIdx}
                                  style={[styles.variantSelectChip, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                                  onPress={() => handleSelectProduct(prod, variantName)}
                                >
                                  <Text style={[styles.variantSelectChipText, { color: colors.text }]}>
                                    + {variantName}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : searchQuery.trim().length >= 2 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    No products found matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Type at least 2 letters to search store inventory
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT VARIATION TEXT INLINE */}
      <Modal
        visible={variantModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVariantModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContentSmall, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Variation</Text>
              <TouchableOpacity onPress={() => setVariantModalVisible(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              VARIATION / ATTRIBUTE (e.g. Size: XL, Color: Navy)
            </Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, backgroundColor: colors.subtle, borderColor: colors.border }]}
              value={variantInputText}
              onChangeText={setVariantInputText}
              placeholder="e.g. Size: XL, Color: Black"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.subtle }]}
                onPress={() => setVariantModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalApplyBtn} onPress={handleSaveVariant}>
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>Apply</Text>
              </TouchableOpacity>
            </View>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    marginHorizontal: 8,
  },
  topBarTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  topBarSub: {
    fontSize: 10,
    marginTop: 1,
  },
  saveHeaderBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 10,
    gap: 10,
    paddingBottom: 80,
  },
  sectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  addProductBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyBox: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11.5,
  },
  itemsList: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  variantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  variantText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemUnitPrice: {
    fontSize: 10.5,
    marginTop: 2,
  },
  itemRightActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  deleteBtn: {
    padding: 3,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  textInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  textInputMultiline: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  zoneButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  zoneBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  zoneBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryValue: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomTotalLabel: {
    fontSize: 9.5,
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 7,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 14,
    gap: 10,
  },
  modalContentSmall: {
    margin: 20,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignSelf: 'center',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    gap: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  searchResultCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  searchResultMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  addSingleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  variantsGrid: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
  },
  variantHeading: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  variantChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  variantSelectChip: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  variantSelectChipText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalApplyBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
