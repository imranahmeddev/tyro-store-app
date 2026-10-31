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
  SafeAreaView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Search,
  Plus,
  Minus,
  X,
  AlertCircle,
  Tag,
  CheckCircle,
  XCircle,
  Layers,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

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
  slug?: string;
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
  { key: 'all', label: 'All Products' },
  { key: 'in', label: 'In Stock' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
] as const;

export default function ProductsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const currencySymbol = activeStore?.currency || '৳';

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockInput, setStockInput] = useState<string>('0');
  const [isStockModalVisible, setIsStockModalVisible] = useState(false);

  // 1. Fetch Products Catalog (Zero N+1)
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', activeStore?.id, searchQuery, stockFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
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

  // 2. Stock Update Mutation with Immediate Invalidation
  const updateStockMutation = useMutation({
    mutationFn: async ({ productId, stock }: { productId: number; stock: number }) => {
      const response = await apiClient.patch(`/api/v1/inventory/${productId}/stock`, {
        stock_quantity: stock,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_analytics'] });
      setIsStockModalVisible(false);
      setSelectedProduct(null);
    },
    onError: (err: any) => {
      console.error('[Products] Stock update failed:', err);
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

  const renderProductItem = ({ item: product }: { item: Product }) => {
    const hasSalePrice =
      product.sale_price !== null &&
      product.sale_price !== undefined &&
      Number(product.sale_price) > 0 &&
      Number(product.sale_price) < product.price;

    const isOutOfStock = product.stock_quantity <= 0;
    const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
    const hasVariants = product.variants && product.variants.length > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/products/${product.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardRow}>
          {/* Thumbnail Image */}
          <View style={styles.thumbnailWrapper}>
            {product.image_url ? (
              <Image
                source={{ uri: product.image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Package size={24} color="#94a3b8" />
              </View>
            )}
          </View>

          {/* Details Column */}
          <View style={styles.detailsCol}>
            {/* Title & Active Badge */}
            <View style={styles.titleRow}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              <View
                style={[
                  styles.activeBadge,
                  { backgroundColor: product.is_active ? '#dcfce7' : '#f1f5f9' },
                ]}
              >
                {product.is_active ? (
                  <CheckCircle size={10} color="#16a34a" />
                ) : (
                  <XCircle size={10} color="#64748b" />
                )}
                <Text
                  style={[
                    styles.activeBadgeText,
                    { color: product.is_active ? '#15803d' : '#64748b' },
                  ]}
                >
                  {product.is_active ? 'Active' : 'Draft'}
                </Text>
              </View>
            </View>

            {/* SKU & Category & Variable tags */}
            <View style={styles.metaRow}>
              {product.sku ? (
                <View style={styles.skuTag}>
                  <Tag size={10} color="#64748b" />
                  <Text style={styles.skuText}>{product.sku}</Text>
                </View>
              ) : null}

              {hasVariants ? (
                <View style={styles.variableTag}>
                  <Layers size={10} color="#7c3aed" />
                  <Text style={styles.variableTagText}>
                    {product.variants?.length} variants
                  </Text>
                </View>
              ) : null}

              {product.category_name ? (
                <Text style={styles.categoryText} numberOfLines={1}>
                  • {product.category_name}
                </Text>
              ) : null}
            </View>

            {/* Pricing */}
            <View style={styles.priceRow}>
              {hasSalePrice ? (
                <>
                  <Text style={styles.salePrice}>
                    {currencySymbol} {Number(product.sale_price).toFixed(2)}
                  </Text>
                  <Text style={styles.regularPriceStrikethrough}>
                    {currencySymbol} {Number(product.price).toFixed(2)}
                  </Text>
                </>
              ) : (
                <Text style={styles.salePrice}>
                  {currencySymbol} {Number(product.price).toFixed(2)}
                </Text>
              )}
            </View>

            {/* Stock Indicator Pill & Quick Edit Button */}
            <View style={styles.actionRow}>
              <View
                style={[
                  styles.stockBadge,
                  isOutOfStock
                    ? styles.stockOut
                    : isLowStock
                    ? styles.stockLow
                    : styles.stockIn,
                ]}
              >
                {isLowStock && <AlertTriangle size={11} color="#d97706" style={{ marginRight: 3 }} />}
                <Text
                  style={[
                    styles.stockBadgeText,
                    isOutOfStock
                      ? styles.stockOutText
                      : isLowStock
                      ? styles.stockLowText
                      : styles.stockInText,
                  ]}
                >
                  {isOutOfStock
                    ? 'Out of Stock'
                    : isLowStock
                    ? `Low Stock (${product.stock_quantity})`
                    : `In Stock: ${product.stock_quantity}`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.editStockButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenStockModal(product);
                }}
                activeOpacity={0.7}
              >
                <Layers size={12} color="#0284c7" />
                <Text style={styles.editStockText}>Quick Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <View>
          <Text style={styles.screenTitle}>Products Engine</Text>
          <Text style={styles.screenSubtitle}>
            {products.length} {products.length === 1 ? 'item' : 'items'} in catalog • {activeStore?.store_name || 'Store'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerAddBtn}
          onPress={() => router.push('/products/create')}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.headerAddBtnText}>Add Product</Text>
        </TouchableOpacity>
      </View>

      {/* Real-time Search Input */}
      <View style={styles.searchBarWrapper}>
        <Search size={16} color="#94a3b8" style={styles.searchBarIcon} />
        <TextInput
          style={styles.searchBarInput}
          placeholder="Search catalog by name or SKU..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <X size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Stock Filter Tabs */}
      <View style={styles.stockFilterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STOCK_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.stockFilterContent}
          renderItem={({ item }) => {
            const isActive = stockFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.stockFilterPill, isActive && styles.stockFilterPillActive]}
                onPress={() => setStockFilter(item.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.stockFilterPillText,
                    isActive && styles.stockFilterPillTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Virtualized Products Feed */}
      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Fetching product catalog...</Text>
        </View>
      )}

      {error && (
        <View style={styles.centerContainer}>
          <AlertCircle size={36} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to load products</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={Platform.OS !== 'web'}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor="#0284c7"
              colors={['#0284c7']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No items matching '${searchQuery}'`
                  : 'Tap the + button to add your first product to this store.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button (FAB) to Add Product */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/products/create')}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Inline Quick Stock Update Modal */}
      <Modal
        visible={isStockModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalTitle}>Quick Update Stock</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {selectedProduct?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsStockModalVisible(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Stepper Controls */}
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleAdjustStock(-5)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>-5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleAdjustStock(-1)}
                activeOpacity={0.7}
              >
                <Minus size={16} color="#0f172a" />
              </TouchableOpacity>

              <TextInput
                style={styles.modalStockInput}
                keyboardType="numeric"
                value={stockInput}
                onChangeText={setStockInput}
                selectTextOnFocus
              />

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleAdjustStock(1)}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#0f172a" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => handleAdjustStock(5)}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>+5</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsStockModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  updateStockMutation.isPending && styles.buttonDisabled,
                ]}
                onPress={handleSaveStock}
                disabled={updateStockMutation.isPending}
                activeOpacity={0.8}
              >
                {updateStockMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSaveText}>Update Stock</Text>
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
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  stockFilterWrapper: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  stockFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  stockFilterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  stockFilterPillActive: {
    backgroundColor: '#0284c7',
  },
  stockFilterPillText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  stockFilterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
  },
  productName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  skuTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skuText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  variableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  variableTagText: {
    fontSize: 10,
    color: '#7c3aed',
    fontWeight: '700',
  },
  categoryText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  salePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  regularPriceStrikethrough: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockIn: {
    backgroundColor: '#f0fdf4',
  },
  stockLow: {
    backgroundColor: '#fef3c7',
  },
  stockOut: {
    backgroundColor: '#fef2f2',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockInText: {
    color: '#16a34a',
  },
  stockLowText: {
    color: '#d97706',
  },
  stockOutText: {
    color: '#dc2626',
  },
  editStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  editStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    color: '#64748b',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalStockInput: {
    width: 80,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f0f9ff',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
