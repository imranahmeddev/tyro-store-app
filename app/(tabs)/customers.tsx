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
  Linking,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  PhoneCall,
  UserCheck,
  ChevronRight,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  total_orders?: number;
  total_spent?: number;
  created_at: string;
}

export default function CustomersScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const currencySymbol = activeStore?.currency || '৳';

  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Customers
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customers', activeStore?.id, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await apiClient.get('/api/v1/customers', { params });
      return response.data;
    },
    enabled: !!activeStore,
  });

  const customers: Customer[] = Array.isArray(data) ? data : data?.data ?? [];

  const handleCallCustomer = (phone?: string | null) => {
    if (!phone) return;
    const cleanNumber = phone.replace(/[^0-9+]/g, '');
    if (cleanNumber) {
      Linking.openURL(`tel:${cleanNumber}`).catch((err) =>
        console.error('[Customers] Could not launch phone dialer:', err)
      );
    }
  };

  const handleEmailCustomer = (email?: string | null) => {
    if (!email) return;
    Linking.openURL(`mailto:${email.trim()}`).catch((err) =>
      console.error('[Customers] Could not launch mail client:', err)
    );
  };

  const getInitials = (name?: string): string => {
    if (!name || !name.trim()) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const renderCustomerItem = ({ item: customer }: { item: Customer }) => {
    const initials = getInitials(customer.name);
    const totalOrders = customer.total_orders ?? 0;
    const totalSpent = customer.total_spent ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/customers/${customer.id}` as any)}
        activeOpacity={0.8}
      >
        {/* Card Header: Avatar, Name & Quick Call */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.nameSection}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customer.name || 'Unnamed Customer'}
            </Text>
            <View style={styles.joinedRow}>
              <Calendar size={11} color="#94a3b8" />
              <Text style={styles.joinedText}>Joined {formatDate(customer.created_at)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {customer.phone ? (
              <TouchableOpacity
                style={styles.callActionButton}
                onPress={() => handleCallCustomer(customer.phone)}
                activeOpacity={0.7}
              >
                <PhoneCall size={16} color="#0284c7" />
              </TouchableOpacity>
            ) : null}
            <ChevronRight size={18} color="#cbd5e1" />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          {customer.phone ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => handleCallCustomer(customer.phone)}
              activeOpacity={0.7}
            >
              <Phone size={14} color="#64748b" />
              <Text style={styles.contactTextPhone}>{customer.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {customer.email ? (
            <TouchableOpacity
              style={styles.contactRow}
              onPress={() => handleEmailCustomer(customer.email)}
              activeOpacity={0.7}
            >
              <Mail size={14} color="#64748b" />
              <Text style={styles.contactText} numberOfLines={1}>
                {customer.email}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Lifetime Stats Footer */}
        <View style={styles.statsFooter}>
          {/* Total Orders */}
          <View style={styles.statBox}>
            <ShoppingBag size={14} color="#0284c7" />
            <Text style={styles.statLabel}>Orders:</Text>
            <Text style={styles.statValue}>{totalOrders}</Text>
          </View>

          {/* Total Spent */}
          <View style={styles.statBox}>
            <CreditCard size={14} color="#16a34a" />
            <Text style={styles.statLabel}>Spent:</Text>
            <Text style={styles.statValue}>
              {currencySymbol}{' '}
              {totalSpent.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Customers</Text>
        <Text style={styles.screenSubtitle}>
          {customers.length} {customers.length === 1 ? 'customer' : 'customers'} found
        </Text>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name, phone, or email..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Loading State */}
      {isLoading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.centerContainer}>
          <AlertCircle size={36} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to load customers</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Customers List */}
      {!isLoading && !error && (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCustomerItem}
          contentContainerStyle={styles.listContent}
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
              <UserCheck size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim()
                  ? `No profiles matching "${searchQuery}".`
                  : 'Your customer list will populate as buyers make purchases.'}
              </Text>
            </View>
          }
        />
      )}
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369a1',
  },
  nameSection: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  joinedText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  callActionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  contactSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#475569',
  },
  contactTextPhone: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '600',
  },
  statsFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 10,
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
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});
