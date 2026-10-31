import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import {
  Tag,
  Plus,
  Search,
  ArrowLeft,
  Copy,
  Check,
  Calendar,
  Layers,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  Banknote,
  AlertCircle,
} from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';

export interface CouponItem {
  id: number;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_valid: boolean;
  type_label: string;
  value_label: string;
  created_at: string;
}

export default function CouponsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const currencySymbol = activeStore?.currency || '৳';

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 1. Fetch Coupons
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['coupons', activeStore?.id, activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {
        status: activeTab,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await apiClient.get('/api/v1/coupons', { params });
      return response.data;
    },
    enabled: !!activeStore,
  });

  const coupons: CouponItem[] = Array.isArray(data)
    ? data
    : (data?.data ?? []);

  // 2. Toggle Status Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.patch(`/api/v1/coupons/${id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to update coupon status.');
    },
  });

  // 3. Delete Coupon Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/api/v1/coupons/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to delete coupon.');
    },
  });

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const confirmDelete = (coupon: CouponItem) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete coupon ${coupon.code}?`)) {
        deleteMutation.mutate(coupon.id);
      }
      return;
    }
    Alert.alert(
      'Delete Coupon',
      `Are you sure you want to permanently delete "${coupon.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(coupon.id),
        },
      ]
    );
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'No expiry';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderCouponCard = ({ item }: { item: CouponItem }) => {
    const isCopied = copiedCode === item.code;
    const progressPercent = item.max_uses
      ? Math.min(100, Math.round((item.used_count / item.max_uses) * 100))
      : 0;

    return (
      <View style={styles.card}>
        {/* Top Header: Code Badge & Status */}
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.codeBadge}
            onPress={() => handleCopyCode(item.code)}
            activeOpacity={0.7}
          >
            <Tag size={13} color="#0284c7" />
            <Text style={styles.codeText}>{item.code}</Text>
            {isCopied ? (
              <Check size={12} color="#16a34a" />
            ) : (
              <Copy size={12} color="#94a3b8" />
            )}
          </TouchableOpacity>

          <View style={styles.headerRightActions}>
            <View
              style={[
                styles.statusBadge,
                item.is_active && item.is_valid
                  ? styles.statusActive
                  : styles.statusExpired,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  item.is_active && item.is_valid
                    ? styles.statusTextActive
                    : styles.statusTextExpired,
                ]}
              >
                {item.is_active && item.is_valid ? 'Active' : 'Expired'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={() => toggleMutation.mutate(item.id)}
              disabled={toggleMutation.isPending}
            >
              {item.is_active ? (
                <ToggleRight size={26} color="#16a34a" />
              ) : (
                <ToggleLeft size={26} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Value Banner */}
        <View style={styles.discountRow}>
          <View style={styles.discountIconBox}>
            {item.type === 'percentage' ? (
              <Percent size={18} color="#0284c7" />
            ) : (
              <Banknote size={18} color="#0284c7" />
            )}
          </View>
          <View style={styles.discountInfo}>
            <Text style={styles.discountValue}>
              {item.type === 'percentage'
                ? `${item.value}% OFF`
                : `${currencySymbol}${item.value.toLocaleString()} OFF`}
            </Text>
            {item.description ? (
              <Text style={styles.descriptionText} numberOfLines={1}>
                {item.description}
              </Text>
            ) : (
              <Text style={styles.descriptionText}>
                {item.type === 'percentage' ? 'Percentage cart discount' : 'Fixed order discount'}
              </Text>
            )}
          </View>
        </View>

        {/* Rules & Limits Row */}
        <View style={styles.rulesGrid}>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Min Order</Text>
            <Text style={styles.ruleValue}>
              {item.min_order_amount !== null
                ? `${currencySymbol}${item.min_order_amount.toLocaleString()}`
                : 'None'}
            </Text>
          </View>

          {item.type === 'percentage' && item.max_discount !== null ? (
            <View style={styles.ruleItem}>
              <Text style={styles.ruleLabel}>Max Discount</Text>
              <Text style={styles.ruleValue}>
                {currencySymbol}{item.max_discount.toLocaleString()}
              </Text>
            </View>
          ) : null}

          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Expires</Text>
            <Text style={styles.ruleValue}>{formatDate(item.expires_at)}</Text>
          </View>
        </View>

        {/* Usage Progress Bar */}
        <View style={styles.usageContainer}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageLabel}>Usage Limit</Text>
            <Text style={styles.usageCount}>
              {item.used_count}{' '}
              {item.max_uses ? `/ ${item.max_uses} used` : 'uses'}
            </Text>
          </View>
          {item.max_uses ? (
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor:
                      progressPercent >= 100 ? '#ef4444' : '#0284c7',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>

        {/* Footer Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.dateInfo}>
            <Calendar size={12} color="#94a3b8" />
            <Text style={styles.createdText}>
              Created {formatDate(item.created_at)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDelete(item)}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color="#ef4444" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.screenTitle}>Coupons</Text>
            <Text style={styles.screenSubtitle}>
              Manage promotions & discounts
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createHeaderBtn}
          onPress={() => router.push('/hub/coupons/create')}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.createHeaderBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search coupon code or description..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['all', 'active', 'expired'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          const label =
            tab === 'all'
              ? 'All Coupons'
              : tab === 'active'
              ? 'Active'
              : 'Expired';

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabText, isSelected && styles.tabTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading coupons...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={36} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to load coupons</Text>
          <Text style={styles.errorSubtitle}>
            {(error as any)?.message || 'Check your internet connection.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={coupons}
          renderItem={renderCouponCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            coupons.length === 0 && styles.listContainerEmpty,
          ]}
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
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Tag size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Coupons Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No results match "${searchQuery}".`
                  : activeTab !== 'all'
                  ? `There are no ${activeTab} coupons right now.`
                  : 'Start offering deals and boost sales with discount codes.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => router.push('/hub/coupons/create')}
              >
                <Plus size={16} color="#ffffff" />
                <Text style={styles.emptyActionBtnText}>Create New Coupon</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/hub/coupons/create')}
        activeOpacity={0.85}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createHeaderBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    height: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusExpired: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextExpired: {
    color: '#64748b',
  },
  toggleBtn: {
    padding: 2,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  discountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountInfo: {
    flex: 1,
  },
  discountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  descriptionText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  rulesGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  ruleItem: {
    flex: 1,
  },
  ruleLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  ruleValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  usageContainer: {
    marginBottom: 12,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  usageCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  createdText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
