import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  ChevronLeft,
  Package,
  DollarSign,
  Layers,
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus,
  Minus,
  Check,
  Tag,
  Sparkles,
  Star,
  Info,
  FolderTree,
  Scan,
} from 'lucide-react-native';
import BarcodeScanner from './BarcodeScanner';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export interface ProductAttribute {
  id: string;
  name: string;      // e.g. "Size"
  values: string[];  // e.g. ["S", "M", "L"]
}

export interface ProductVariantItem {
  id?: number;
  type: string;      // e.g. "Size"
  value: string;     // e.g. "Red - L"
  sku?: string;
  price?: number;
  sale_price?: number | null;
  stock: number;
  digital_file_path?: string | null;
  digital_download_instructions?: string | null;
}

export interface ProductImageItem {
  id?: number;
  path: string;
  url: string;
  is_primary: boolean;
}

interface ProductFormProps {
  initialData?: any;
  isEditing?: boolean;
  productId?: string | number;
}

type TabType = 'general' | 'pricing' | 'inventory' | 'media' | 'variations' | 'taxonomy' | 'digital';

export default function ProductForm({ initialData, isEditing = false, productId }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General Form State
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [productType, setProductType] = useState<'simple' | 'variable' | 'digital'>(
    initialData?.product_type || (initialData?.variants && initialData.variants.length > 0 ? 'variable' : (initialData?.is_digital ? 'digital' : 'simple'))
  );
  const [isSoldIndividually, setIsSoldIndividually] = useState<boolean>(
    initialData?.is_sold_individually ?? false
  );
  const [hasDigitalVariants, setHasDigitalVariants] = useState<boolean>(
    initialData?.has_digital_variants ?? false
  );
  const [digitalFilePath, setDigitalFilePath] = useState<string>(
    initialData?.digital_file_path || ''
  );
  const [digitalInstructions, setDigitalInstructions] = useState<string>(
    initialData?.digital_download_instructions || ''
  );
  const [downloadLimit, setDownloadLimit] = useState<string>(
    initialData?.download_limit !== null && initialData?.download_limit !== undefined ? String(initialData.download_limit) : ''
  );
  const [downloadExpiryDays, setDownloadExpiryDays] = useState<string>(
    initialData?.download_expiry_days !== null && initialData?.download_expiry_days !== undefined ? String(initialData.download_expiry_days) : ''
  );
  const [shortDescription, setShortDescription] = useState(initialData?.short_description || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState<boolean>(initialData?.is_featured ?? false);

  // Pricing Form State
  const [regularPrice, setRegularPrice] = useState(
    initialData?.price ? String(initialData.price) : ''
  );
  const [salePrice, setSalePrice] = useState(
    initialData?.sale_price ? String(initialData.sale_price) : ''
  );

  // Inventory Form State
  const [sku, setSku] = useState(initialData?.sku || '');
  const [skuScannerOpen, setSkuScannerOpen] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(
    initialData?.stock_quantity !== undefined ? String(initialData.stock_quantity) : '10'
  );

  // Taxonomy Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    initialData?.category_id || null
  );

  // Media Form State
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Variable Product Matrix State
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { id: '1', name: 'Size', values: ['S', 'M', 'L'] },
  ]);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValues, setNewAttrValues] = useState('');
  const [variants, setVariants] = useState<ProductVariantItem[]>([]);

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', activeStore?.id],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/categories');
      return res.data?.data || res.data || [];
    },
    enabled: !!activeStore,
  });

  const categories = categoriesData || [];

  // Populate initial data when editing
  useEffect(() => {
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.slug) setSlug(initialData.slug);
      if (initialData.sku) setSku(initialData.sku);
      if (initialData.price) setRegularPrice(String(initialData.price));
      if (initialData.sale_price) setSalePrice(String(initialData.sale_price));
      if (initialData.stock_quantity !== undefined) setStockQuantity(String(initialData.stock_quantity));
      if (initialData.is_active !== undefined) setIsActive(Boolean(initialData.is_active));
      if (initialData.is_featured !== undefined) setIsFeatured(Boolean(initialData.is_featured));
      if (initialData.short_description) setShortDescription(initialData.short_description);
      if (initialData.description) setDescription(initialData.description);
      if (initialData.category_id) setSelectedCategoryId(initialData.category_id);

      if (initialData.product_type) setProductType(initialData.product_type);
      else if (initialData.is_digital) setProductType('digital');
      if (initialData.is_sold_individually !== undefined) setIsSoldIndividually(Boolean(initialData.is_sold_individually));
      if (initialData.has_digital_variants !== undefined) setHasDigitalVariants(Boolean(initialData.has_digital_variants));
      if (initialData.digital_file_path) setDigitalFilePath(initialData.digital_file_path);
      if (initialData.digital_download_instructions) setDigitalInstructions(initialData.digital_download_instructions);
      if (initialData.download_limit !== undefined && initialData.download_limit !== null) setDownloadLimit(String(initialData.download_limit));
      if (initialData.download_expiry_days !== undefined && initialData.download_expiry_days !== null) setDownloadExpiryDays(String(initialData.download_expiry_days));

      if (initialData.images && Array.isArray(initialData.images)) {
        setImages(
          initialData.images.map((img: any, i: number) => ({
            id: img.id,
            path: img.url || img.path,
            url: img.url || img.path,
            is_primary: img.is_primary ?? i === 0,
          }))
        );
      }

      if (initialData.variants && Array.isArray(initialData.variants) && initialData.variants.length > 0) {
        if (!initialData.product_type && !initialData.is_digital) setProductType('variable');
        setVariants(
          initialData.variants.map((v: any) => ({
            id: v.id,
            type: v.type || 'Variant',
            value: v.value || '',
            price: Number(v.price) || Number(initialData.price) || 0,
            sale_price: v.sale_price ? Number(v.sale_price) : null,
            stock: Number(v.stock) || 0,
            digital_file_path: v.digital_file_path || null,
            digital_download_instructions: v.digital_download_instructions || null,
          }))
        );
      }
    }
  }, [initialData]);

  // Auto-generate SKU
  const handleAutoGenerateSku = () => {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setSku(`TYRO-${random}`);
  };

  // Image Selection and Compression Pipeline
  const handlePickImage = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to capture product photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required to pick photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setIsUploadingImage(true);
        const sourceUri = result.assets[0].uri;

        // 1. Client-side compression with expo-image-manipulator
        const manipulated = await ImageManipulator.manipulateAsync(
          sourceUri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. Prepare FormData
        const formData = new FormData();
        const filename = manipulated.uri.split('/').pop() || 'photo.jpg';

        if (Platform.OS === 'web') {
          const res = await fetch(manipulated.uri);
          const blob = await res.blob();
          formData.append('image', blob, filename);
        } else {
          formData.append('image', {
            uri: manipulated.uri,
            name: filename,
            type: 'image/jpeg',
          } as any);
        }

        // 3. Upload to backend
        const response = await apiClient.post('/api/v1/products/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const uploaded = response.data;
        const newImage: ProductImageItem = {
          path: uploaded.path,
          url: uploaded.image_url || uploaded.path,
          is_primary: images.length === 0,
        };

        setImages((prev) => [...prev, newImage]);
        setIsUploadingImage(false);
      }
    } catch (err: any) {
      setIsUploadingImage(false);
      Alert.alert('Upload Failed', err.response?.data?.message || err.message || 'Image processing failed.');
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }))
    );
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Matrix Generator: Cartesian Product Permutation
  const handleAddAttribute = () => {
    if (!newAttrName.trim() || !newAttrValues.trim()) {
      Alert.alert('Validation', 'Attribute name and values (comma separated) are required.');
      return;
    }
    const parsedValues = newAttrValues
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (parsedValues.length === 0) return;

    setAttributes((prev) => [
      ...prev,
      { id: Date.now().toString(), name: newAttrName.trim(), values: parsedValues },
    ]);
    setNewAttrName('');
    setNewAttrValues('');
  };

  const handleRemoveAttribute = (id: string) => {
    setAttributes((prev) => prev.filter((a) => a.id !== id));
  };

  const handleGenerateVariationMatrix = () => {
    if (attributes.length === 0) {
      Alert.alert('No Attributes', 'Please add at least one attribute to generate variations.');
      return;
    }

    const valueArrays = attributes.map((a) => a.values);
    const cartesian = valueArrays.reduce<string[][]>(
      (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
      [[]]
    );

    const basePrice = parseFloat(regularPrice) || 0;
    const baseSale = parseFloat(salePrice) || null;
    const typeLabel = attributes.map((a) => a.name).join(' / ');

    const generated: ProductVariantItem[] = cartesian.map((combo) => ({
      type: typeLabel,
      value: combo.join(' - '),
      sku: `${sku ? sku : 'SKU'}-${combo.join('-').toUpperCase().replace(/\s+/g, '')}`,
      price: basePrice,
      sale_price: baseSale,
      stock: 10,
    }));

    setVariants(generated);
    Alert.alert('Matrix Generated', `Generated ${generated.length} variations successfully.`);
  };

  const handleVariantStockChange = (index: number, delta: number) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i === index) {
          return { ...v, stock: Math.max(0, v.stock + delta) };
        }
        return v;
      })
    );
  };

  const handleVariantPriceChange = (index: number, txt: string) => {
    const parsed = parseFloat(txt) || 0;
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, price: parsed } : v))
    );
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Mutation
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Product Name is required.');
      const regPriceNum = parseFloat(regularPrice);
      if (isNaN(regPriceNum) || regPriceNum < 0) {
        throw new Error('Valid Regular Price is required.');
      }

      const payload: Record<string, any> = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        sku: sku.trim() || undefined,
        category_id: selectedCategoryId || null,
        regular_price: regPriceNum,
        sale_price: salePrice.trim() ? parseFloat(salePrice) : null,
        stock_quantity: parseInt(stockQuantity, 10) || 0,
        is_published: isActive,
        is_featured: isFeatured,
        is_sold_individually: isSoldIndividually,
        product_type: productType,
        is_digital: productType === 'digital',
        has_digital_variants: productType === 'digital' ? hasDigitalVariants : false,
        digital_file_path: productType === 'digital' ? (digitalFilePath.trim() || null) : null,
        digital_download_instructions: productType === 'digital' ? (digitalInstructions.trim() || null) : null,
        download_limit: (productType === 'digital' && downloadLimit.trim()) ? parseInt(downloadLimit, 10) : null,
        download_expiry_days: (productType === 'digital' && downloadExpiryDays.trim()) ? parseInt(downloadExpiryDays, 10) : null,
        short_description: shortDescription.trim() || null,
        description: description.trim() || null,
        images: images.map((img, i) => ({
          path: img.path,
          is_primary: img.is_primary,
          position: i,
        })),
      };

      if (productType === 'variable' || (productType === 'digital' && hasDigitalVariants)) {
        payload.variants = variants.map((v) => ({
          type: v.type,
          value: v.value,
          sku: v.sku,
          price: v.price ?? regPriceNum,
          sale_price: v.sale_price ?? null,
          stock: v.stock,
          digital_file_path: v.digital_file_path ?? null,
          digital_download_instructions: v.digital_download_instructions ?? null,
        }));
      }

      if (isEditing && productId) {
        const res = await apiClient.put(`/api/v1/products/${productId}`, payload);
        return res.data;
      } else {
        const res = await apiClient.post('/api/v1/products', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_analytics'] });
      Alert.alert(
        'Success',
        isEditing ? 'Product updated successfully.' : 'Product created successfully.',
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Save Failed', err.response?.data?.message || err.message || 'Could not save product.');
    },
  });

  return (
    <View style={[styles.formContainer, { backgroundColor: colors.background }]}>
      {/* Top Tabs Segment */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabsContent}
      >
        {(
          [
            { key: 'general' as const, label: 'General' },
            { key: 'pricing' as const, label: 'Pricing' },
            { key: 'inventory' as const, label: 'Inventory' },
            { key: 'media' as const, label: `Media (${images.length})` },
            ...(productType === 'digital' ? [{ key: 'digital' as const, label: 'Digital Assets' }] : []),
            ...(productType === 'variable' || (productType === 'digital' && hasDigitalVariants) ? [{ key: 'variations' as const, label: `Matrix (${variants.length})` }] : []),
            { key: 'taxonomy' as const, label: 'Taxonomy' },
          ]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Tab Content */}
      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        {/* 1. GENERAL TAB */}
        {activeTab === 'general' && (
          <View style={styles.tabCard}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Product Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Premium Cotton T-Shirt"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (!isEditing && !slug) {
                    setSlug(text.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }
                }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>URL Slug</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. premium-cotton-t-shirt"
                placeholderTextColor="#94a3b8"
                value={slug}
                onChangeText={setSlug}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Product Type</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typePill,
                    productType === 'simple' && styles.typePillActive,
                  ]}
                  onPress={() => setProductType('simple')}
                  activeOpacity={0.7}
                >
                  <Package size={14} color={productType === 'simple' ? '#ffffff' : '#64748b'} />
                  <Text
                    style={[
                      styles.typePillText,
                      productType === 'simple' && styles.typePillTextActive,
                    ]}
                  >
                    Simple Product
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typePill,
                    productType === 'variable' && styles.typePillActive,
                  ]}
                  onPress={() => setProductType('variable')}
                  activeOpacity={0.7}
                >
                  <Layers size={14} color={productType === 'variable' ? '#ffffff' : '#64748b'} />
                  <Text
                    style={[
                      styles.typePillText,
                      productType === 'variable' && styles.typePillTextActive,
                    ]}
                  >
                    Variable Matrix
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typePill,
                    productType === 'digital' && styles.typePillActive,
                  ]}
                  onPress={() => setProductType('digital')}
                  activeOpacity={0.7}
                >
                  <Sparkles size={14} color={productType === 'digital' ? '#ffffff' : '#64748b'} />
                  <Text
                    style={[
                      styles.typePillText,
                      productType === 'digital' && styles.typePillTextActive,
                    ]}
                  >
                    Digital Item
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Short Summary</Text>
              <TextInput
                style={[styles.input, styles.textAreaSmall]}
                placeholder="Brief highlight of key product benefits..."
                placeholderTextColor="#94a3b8"
                value={shortDescription}
                onChangeText={setShortDescription}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Description</Text>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                placeholder="Detailed specifications, material details, and size guide..."
                placeholderTextColor="#94a3b8"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Published & Active</Text>
                <Text style={styles.switchSubtitle}>Visible on digital storefront</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={isActive ? '#0284c7' : '#f8fafc'}
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Featured Product</Text>
                <Text style={styles.switchSubtitle}>Highlighted in homepage carousel</Text>
              </View>
              <Switch
                value={isFeatured}
                onValueChange={setIsFeatured}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={isFeatured ? '#0284c7' : '#f8fafc'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Sold Individually</Text>
                <Text style={styles.switchSubtitle}>Limit purchases to 1 item per order (locks qty to 1)</Text>
              </View>
              <Switch
                value={isSoldIndividually}
                onValueChange={setIsSoldIndividually}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={isSoldIndividually ? '#0284c7' : '#f8fafc'}
              />
            </View>
          </View>
        )}

        {/* 2. PRICING TAB */}
        {activeTab === 'pricing' && (
          <View style={styles.tabCard}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Regular Price ({currencySymbol}) <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.pricePrefix}>{currencySymbol}</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  value={regularPrice}
                  onChangeText={setRegularPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Sale Price ({currencySymbol})</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.pricePrefix}>{currencySymbol}</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Optional discount price"
                  placeholderTextColor="#94a3b8"
                  value={salePrice}
                  onChangeText={setSalePrice}
                  keyboardType="numeric"
                />
              </View>
              {salePrice && parseFloat(salePrice) > 0 && parseFloat(regularPrice) > 0 && (
                <View style={styles.discountBadge}>
                  <Sparkles size={12} color="#16a34a" />
                  <Text style={styles.discountBadgeText}>
                    {Math.round(
                      ((parseFloat(regularPrice) - parseFloat(salePrice)) /
                        parseFloat(regularPrice)) *
                        100
                    )}
                    % discount applied
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 3. INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <View style={styles.tabCard}>
            <View style={styles.formGroup}>
              <View style={styles.skuHeaderRow}>
                <Text style={styles.label}>SKU (Stock Keeping Unit)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={styles.generateSkuBtn}
                    onPress={() => setSkuScannerOpen(true)}
                    activeOpacity={0.7}
                  >
                    <Scan size={12} color="#0284c7" />
                    <Text style={styles.generateSkuText}>Scan Barcode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.generateSkuBtn}
                    onPress={handleAutoGenerateSku}
                    activeOpacity={0.7}
                  >
                    <Sparkles size={12} color="#0284c7" />
                    <Text style={styles.generateSkuText}>Auto-Generate</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. TYRO-SHIRT-001"
                placeholderTextColor="#94a3b8"
                value={sku}
                onChangeText={setSku}
                autoCapitalize="characters"
              />
            </View>

            {productType === 'simple' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Stock Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Available units in warehouse"
                  placeholderTextColor="#94a3b8"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  keyboardType="numeric"
                />
              </View>
            )}

            {productType === 'variable' && (
              <View style={styles.infoBox}>
                <Info size={16} color="#0284c7" />
                <Text style={styles.infoBoxText}>
                  Stock quantity for this variable product is computed automatically as the sum of all individual variation stock levels in the Matrix tab.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 4. MEDIA GALLERY PIPELINE */}
        {activeTab === 'media' && (
          <View style={styles.tabCard}>
            <Text style={styles.sectionHeading}>Product Gallery & Thumbnail</Text>
            <Text style={styles.sectionSubtitle}>
              Images are automatically optimized and compressed client-side to WebP/JPEG under 400KB before upload.
            </Text>

            {/* Upload Buttons */}
            <View style={styles.mediaButtonsRow}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => handlePickImage(true)}
                disabled={isUploadingImage}
                activeOpacity={0.75}
              >
                <Camera size={16} color="#0284c7" />
                <Text style={styles.uploadBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => handlePickImage(false)}
                disabled={isUploadingImage}
                activeOpacity={0.75}
              >
                <ImageIcon size={16} color="#0284c7" />
                <Text style={styles.uploadBtnText}>Upload from Library</Text>
              </TouchableOpacity>
            </View>

            {isUploadingImage && (
              <View style={styles.uploadingBox}>
                <ActivityIndicator size="small" color="#0284c7" />
                <Text style={styles.uploadingText}>Compressing & uploading media...</Text>
              </View>
            )}

            {/* Images Grid */}
            <View style={styles.imagesGrid}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageCard}>
                  <Image source={{ uri: img.url }} style={styles.galleryImage} />
                  {img.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Star size={10} color="#ffffff" fill="#ffffff" />
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                  <View style={styles.imageCardActions}>
                    {!img.is_primary && (
                      <TouchableOpacity
                        style={styles.setPrimaryBtn}
                        onPress={() => handleSetPrimaryImage(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.setPrimaryBtnText}>Make Primary</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.deleteImageBtn}
                      onPress={() => handleRemoveImage(index)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5. VARIABLE PRODUCT MATRIX TAB */}
        {activeTab === 'variations' && (
          <View style={styles.tabCard}>
            {(productType !== 'variable' && !(productType === 'digital' && hasDigitalVariants)) ? (
              <View style={styles.upgradeToVariableBox}>
                <Layers size={32} color="#0284c7" />
                <Text style={styles.upgradeTitle}>Matrix Configuration</Text>
                <Text style={styles.upgradeSubtitle}>
                  Switch the product type to 'Variable Matrix' or enable 'Variable Digital Files' to configure attributes and generate variation permutations.
                </Text>
                <TouchableOpacity
                  style={styles.switchTypeButton}
                  onPress={() => setProductType('variable')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.switchTypeButtonText}>Enable Variable Product</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Attribute Builder */}
                <Text style={styles.sectionHeading}>1. Define Attributes</Text>
                <Text style={styles.sectionSubtitle}>
                  Add attributes like Size, Color, or Material with comma-separated values.
                </Text>

                <View style={styles.attributesList}>
                  {attributes.map((attr) => (
                    <View key={attr.id} style={styles.attributeItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attrName}>{attr.name}</Text>
                        <Text style={styles.attrValues}>{attr.values.join(', ')}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveAttribute(attr.id)}
                        activeOpacity={0.7}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Add Attribute Row */}
                <View style={styles.addAttrRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Attribute (e.g. Color)"
                    placeholderTextColor="#94a3b8"
                    value={newAttrName}
                    onChangeText={setNewAttrName}
                  />
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Values (e.g. Red, Blue, Black)"
                    placeholderTextColor="#94a3b8"
                    value={newAttrValues}
                    onChangeText={setNewAttrValues}
                  />
                  <TouchableOpacity
                    style={styles.addAttrBtn}
                    onPress={handleAddAttribute}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Generate Matrix Button */}
                <TouchableOpacity
                  style={styles.generateMatrixBtn}
                  onPress={handleGenerateVariationMatrix}
                  activeOpacity={0.8}
                >
                  <Layers size={16} color="#ffffff" />
                  <Text style={styles.generateMatrixText}>Auto-Generate Variations Matrix</Text>
                </TouchableOpacity>

                {/* Variations Matrix List */}
                <View style={styles.matrixHeaderRow}>
                  <Text style={styles.sectionHeading}>
                    2. Variation Matrix ({variants.length})
                  </Text>
                </View>

                {variants.length === 0 ? (
                  <Text style={styles.emptyMatrixText}>
                    Click 'Auto-Generate Variations Matrix' to create all product variations.
                  </Text>
                ) : (
                  <View style={styles.variantsList}>
                    {variants.map((v, index) => (
                      <View key={index} style={styles.variantRow}>
                        <View style={styles.variantHeader}>
                          <Text style={styles.variantValue}>{v.value}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveVariant(index)}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.variantInputsRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Price ({currencySymbol})</Text>
                            <TextInput
                              style={styles.miniInput}
                              keyboardType="numeric"
                              value={String(v.price ?? regularPrice)}
                              onChangeText={(txt) => handleVariantPriceChange(index, txt)}
                            />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.miniLabel}>Stock</Text>
                            <View style={styles.variantStepper}>
                              <TouchableOpacity
                                style={styles.vStepBtn}
                                onPress={() => handleVariantStockChange(index, -1)}
                              >
                                <Minus size={12} color="#475569" />
                              </TouchableOpacity>
                              <Text style={styles.vStepText}>{v.stock}</Text>
                              <TouchableOpacity
                                style={styles.vStepBtn}
                                onPress={() => handleVariantStockChange(index, 1)}
                              >
                                <Plus size={12} color="#475569" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>

                        {(productType === 'digital' || hasDigitalVariants) && (
                          <View style={{ marginTop: 8, gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                            <View>
                              <Text style={styles.miniLabel}>Variant Download URL</Text>
                              <TextInput
                                style={styles.miniInput}
                                placeholder="https://example.com/file.zip"
                                placeholderTextColor="#94a3b8"
                                value={v.digital_file_path || ''}
                                onChangeText={(txt) => {
                                  setVariants((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, digital_file_path: txt } : item))
                                  );
                                }}
                              />
                            </View>
                            <View>
                              <Text style={styles.miniLabel}>Variant License / Instructions</Text>
                              <TextInput
                                style={[styles.miniInput, { height: 48 }]}
                                placeholder="Serial keys or access details..."
                                placeholderTextColor="#94a3b8"
                                multiline
                                value={v.digital_download_instructions || ''}
                                onChangeText={(txt) => {
                                  setVariants((prev) =>
                                    prev.map((item, i) => (i === index ? { ...item, digital_download_instructions: txt } : item))
                                  );
                                }}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* DIGITAL ASSETS TAB */}
        {activeTab === 'digital' && (
          <View style={styles.tabCard}>
            <Text style={styles.sectionHeading}>Digital Product Delivery</Text>
            <Text style={styles.sectionSubtitle}>
              Configure digital file downloads, software license keys, or access instructions. Pure digital orders automatically receive ৳0 free shipping and optional physical address at checkout.
            </Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.switchLabel}>Variable Digital Files</Text>
                <Text style={styles.switchSubtitle}>Each variant has a separate download file or license key</Text>
              </View>
              <Switch
                value={hasDigitalVariants}
                onValueChange={setHasDigitalVariants}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={hasDigitalVariants ? '#0284c7' : '#f8fafc'}
              />
            </View>

            {!hasDigitalVariants && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Digital File URL / Download Link</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/downloads/file.zip or storage path"
                  placeholderTextColor="#94a3b8"
                  value={digitalFilePath}
                  onChangeText={setDigitalFilePath}
                />
              </View>
            )}

            {!hasDigitalVariants && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>License Keys & Access Instructions</Text>
                <TextInput
                  style={[styles.input, styles.textAreaLarge]}
                  placeholder="Serial keys, secret activation tokens, or direct access steps..."
                  placeholderTextColor="#94a3b8"
                  value={digitalInstructions}
                  onChangeText={setDigitalInstructions}
                  multiline
                />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Download Limit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5 (blank for unlimited)"
                  placeholderTextColor="#94a3b8"
                  value={downloadLimit}
                  onChangeText={setDownloadLimit}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Expiry Days</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 30 (blank for never)"
                  placeholderTextColor="#94a3b8"
                  value={downloadExpiryDays}
                  onChangeText={setDownloadExpiryDays}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* 6. TAXONOMY TAB */}
        {activeTab === 'taxonomy' && (
          <View style={styles.tabCard}>
            <Text style={styles.sectionHeading}>Category Taxonomy</Text>
            <Text style={styles.sectionSubtitle}>
              Select the primary storefront category for this product.
            </Text>

            <View style={styles.categoriesList}>
              {categories.map((cat: any) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      isSelected && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                    activeOpacity={0.7}
                  >
                    <FolderTree
                      size={16}
                      color={isSelected ? '#0284c7' : '#64748b'}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected && styles.categoryNameSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                    {isSelected && <Check size={16} color="#0284c7" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Save Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: '#7c3aed' },
            saveProductMutation.isPending && styles.saveButtonDisabled,
          ]}
          onPress={() => saveProductMutation.mutate()}
          disabled={saveProductMutation.isPending}
          activeOpacity={0.85}
        >
          {saveProductMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Save Product Changes' : 'Create Product'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={skuScannerOpen}
        onClose={() => setSkuScannerOpen(false)}
        onScan={(code) => setSku(code)}
        title="Scan Barcode / SKU"
        subtitle="Align product barcode or label within frame"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabsScroll: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 48,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0284c7',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  tabCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  textAreaSmall: {
    minHeight: 60,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 110,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typePillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  typePillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  typePillTextActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  pricePrefix: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '700',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  skuHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  generateSkuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  generateSkuText: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
  },
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  uploadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#0284c7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  imageCardActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,23,42,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  setPrimaryBtn: {
    padding: 2,
  },
  setPrimaryBtnText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
  deleteImageBtn: {
    padding: 2,
  },
  upgradeToVariableBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  upgradeSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  switchTypeButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  switchTypeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  attributesList: {
    gap: 8,
    marginBottom: 10,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attrName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  attrValues: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  addAttrRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  addAttrBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateMatrixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  generateMatrixText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  matrixHeaderRow: {
    marginBottom: 8,
  },
  emptyMatrixText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  variantsList: {
    gap: 10,
  },
  variantRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  variantInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  miniInput: {
    height: 32,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  variantStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    height: 32,
  },
  vStepBtn: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vStepText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoriesList: {
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryOptionSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: '#0284c7',
  },
  categoryName: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: '#0284c7',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

