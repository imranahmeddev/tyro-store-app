import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Search,
  Plus,
  Minus,
  X,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import CurrencyText, { formatBanglaCurrency } from '../../src/components/ui/CurrencyText';

export interface ProductVariant {
  id: number;
  type: string;
  value: string;
  price: number;
  sale_price: number | null;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  sale_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  image_url: string | null;
  category_name?: string | null;
  variants?: ProductVariant[];
}

const STOCK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'In Stock' },
  { key: 'low', label: 'Low Stock (≤5)' },
  { key: 'out', label: 'Out of Stock' },
] as const;

export default function ProductsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockInput, setStockInput] = useState<string>('0');
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);

  // 1. Fetch Products Catalog
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['products', activeStore?.id, searchQuery, stockFilter],
    queryFn: async () => {
      const params: Record<string, string> = { per_page: '50' };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (stockFilter !== 'all') {
        params.stock = stockFilter;
      }
      const response = await apiClient.get('/api/v1/products', { params });
      return response.data;
    },
    enabled: !!activeStore,
  });

  const products: Product[] = Array.isArray(data) ? data : data?.data ?? [];

  // 2. Stock Update Mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, stock }: { productId: number; stock: number }) => {
      const response = await apiClient.patch(`/api/v1/inventory/${productId}/stock`, {
        stock_quantity: stock,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      setIsStockModalVisible(false);
      setSelectedProduct(null);
    },
  });

  const handleOpenStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockInput(String(product.stock_quantity ?? 0));
    setIsStockModalVisible(true);
  };

  const handleAdjustStock = (delta: number) => {
    const current = parseInt(stockInput, 10) || 0;
    const next = Math.max(0, current + delta);
    setStockInput(String(next));
  };

  const handleSaveStock = () => {
    if (!selectedProduct) return;
    const stockNum = parseInt(stockInput, 10);
    if (isNaN(stockNum) || stockNum < 0) return;

    updateStockMutation.mutate({
      productId: selectedProduct.id,
      stock: stockNum,
    });
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isOut = item.stock_quantity <= 0;
    const isLow = item.stock_quantity > 0 && item.stock_quantity <= 5;
    const hasSale =
      item.sale_price !== null &&
      Number(item.sale_price) > 0 &&
      Number(item.sale_price) < item.price;

    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push(`/products/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardMainRow}>
          {/* 40x40 Thumbnail */}
          <View style={[styles.thumbBox, { backgroundColor: colors.subtle }]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.thumbImg} resizeMode="cover" />
            ) : (
              <Package size={18} color={colors.textMuted} />
            )}
          </View>

          {/* Title & Category */}
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.productMetaRow}>
              {item.category_name ? (
                <Text style={[styles.metaCategory, { color: colors.textSecondary }]}>
                  {item.category_name}
                </Text>
              ) : null}
              {item.sku ? (
                <Text style={[styles.metaSku, { color: colors.textMuted }]}>
                  • SKU: {item.sku}
                </Text>
              ) : null}
            </View>

            {/* Price */}
            <View style={styles.priceRow}>
              <CurrencyText
                amount={hasSale ? item.sale_price : item.price}
                currencySymbol={currencySymbol}
                size="sm"
                color={colors.text}
                weight="700"
              />
              {hasSale && (
                <Text style={[styles.strikePrice, { color: colors.textMuted }]}>
                  {formatBanglaCurrency(item.price)}
                </Text>
              )}
            </View>
          </View>

          {/* Quick Stock Indicator and Trigger */}
          <TouchableOpacity
            style={[
              styles.stockPillBtn,
              isOut
                ? { backgroundColor: '#fee2e2' }
                : isLow
                ? { backgroundColor: '#fef3c7' }
                : { backgroundColor: '#dcfce7' },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenStockModal(item);
            }}
            activeOpacity={0.7}
          >
            {isLow && <AlertTriangle size={11} color="#b45309" style={{ marginRight: 2 }} />}
            <Text
              style={[
                styles.stockPillText,
                {
                  color: isOut ? '#dc2626' : isLow ? '#b45309' : '#15803d',
                },
              ]}
            >
              {isOut ? 'Out of Stock' : `Stock: ${item.stock_quantity}`}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* 1. Slim Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.titleWithCount}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Products</Text>
          <View style={[styles.countPill, { backgroundColor: colors.isDark ? '#312e81' : '#ede9fe' }]}>
            <Text style={[styles.countPillText, { color: colors.isDark ? '#c4b5fd' : '#6d28d9' }]}>
              {products.length}
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

          <TouchableOpacity
            style={styles.addProductBtn}
            onPress={() => router.push('/products/create')}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#ffffff" />
            <Text style={styles.addProductText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {isSearchActive && (
        <View style={[styles.searchBarBox, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Search size={14} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search product name or SKU..."
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

      {/* 2. Stock Filter Carousel */}
      <View style={[styles.filterBarWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {STOCK_FILTERS.map((f) => {
            const isActive = stockFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  isActive
                    ? { backgroundColor: colors.isDark ? '#312e81' : '#ede9fe', borderColor: '#7c3aed' }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setStockFilter(f.key)}
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

      {/* 3. Products List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProductItem}
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
              <Package size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No products found.
              </Text>
            </View>
          }
        />
      )}

      {/* Quick Stock Modal */}
      <Modal
        visible={isStockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Quick Stock Adjust</Text>
              <TouchableOpacity onPress={() => setIsStockModalVisible(false)} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalProdName, { color: colors.textSecondary }]} numberOfLines={1}>
              {selectedProduct?.name}
            </Text>

            {/* Stepper Controls */}
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.subtle }]}
                onPress={() => handleAdjustStock(-5)}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperBtnText, { color: colors.text }]}>-5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.subtle }]}
                onPress={() => handleAdjustStock(-1)}
                activeOpacity={0.7}
              >
                <Minus size={14} color={colors.text} />
              </TouchableOpacity>

              <TextInput
                style={[styles.stepperInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={stockInput}
                onChangeText={setStockInput}
                selectTextOnFocus
              />

              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.subtle }]}
                onPress={() => handleAdjustStock(1)}
                activeOpacity={0.7}
              >
                <Plus size={14} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: colors.subtle }]}
                onPress={() => handleAdjustStock(5)}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperBtnText, { color: colors.text }]}>+5</Text>
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.subtle }]}
                onPress={() => setIsStockModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, updateStockMutation.isPending && { opacity: 0.7 }]}
                onPress={handleSaveStock}
                disabled={updateStockMutation.isPending}
                activeOpacity={0.8}
              >
                {updateStockMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
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
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 7,
  },
  addProductText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
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
  productCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbBox: {
    width: 38,
    height: 38,
    borderRadius: 7,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: {
    width: 38,
    height: 38,
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  metaCategory: {
    fontSize: 10,
  },
  metaSku: {
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  strikePrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  stockPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockPillText: {
    fontSize: 10.5,
    fontWeight: '700',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalProdName: {
    fontSize: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepperInput: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderRadius: 7,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#7c3aed',
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
