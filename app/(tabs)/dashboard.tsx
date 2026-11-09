import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Store,
  RefreshCw,
  Plus,
  ChevronRight,
  Clock,
  AlertTriangle,
  Package,
  TrendingUp,
  Share2,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react-native';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import InteractiveRevenueChart, {
  TimelineDataPoint,
} from '../../src/components/InteractiveRevenueChart';
import StatusBadge from '../../src/components/ui/StatusBadge';
import CurrencyText, { formatBanglaCurrency } from '../../src/components/ui/CurrencyText';
import QuickActionButton from '../../src/components/ui/QuickActionButton';
import { resolveProductImage } from '../../src/utils/image';

const PERIOD_TABS = [
  { key: 'today', label: 'Today' },
  { key: '7days', label: '7 Days' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year', label: 'This Year' },
] as const;

export default function DashboardScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const colors = useThemeStore((s) => s.colors);
  const currencySymbol = activeStore?.currency || '৳';

  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');

  // Fetch Live Real Dashboard & Orders Data
  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['dashboard_metrics', activeStore?.id, selectedPeriod],
    queryFn: async () => {
      // 1. Fetch dashboard analytics
      let analytics: any = null;
      try {
        const res = await apiClient.get('/api/v1/dashboard', {
          params: { period: selectedPeriod },
        });
        analytics = res.data?.data || res.data;
      } catch (err) {
        console.warn('[Dashboard] API endpoint warning:', err);
      }

      // 2. Fetch live recent orders for fallback / real-time accuracy
      let liveOrders: any[] = [];
      try {
        const ordRes = await apiClient.get('/api/v1/orders', {
          params: { per_page: 30 },
        });
        liveOrders = Array.isArray(ordRes.data) ? ordRes.data : ordRes.data?.data ?? [];
      } catch {}

      // 3. Fetch products for low stock alert
      let liveProducts: any[] = [];
      try {
        const prodRes = await apiClient.get('/api/v1/products', {
          params: { per_page: 50 },
        });
        liveProducts = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data ?? [];
      } catch {}

      // Calculate Total Revenue
      const ordersSum = liveOrders.reduce(
        (sum, o) => sum + Number(o.total_amount ?? o.total ?? 0),
        0
      );
      const totalRevenue =
        analytics?.total_revenue && Number(analytics.total_revenue) > 0
          ? Number(analytics.total_revenue)
          : ordersSum;

      const ordersCount =
        analytics?.orders_count && Number(analytics.orders_count) > 0
          ? Number(analytics.orders_count)
          : liveOrders.length;

      const pendingOrdersCount = liveOrders.filter((o) => {
        const s = String(o.status || '').toLowerCase();
        return s === 'pending' || s === 'processing' || s === 'confirmed';
      }).length;

      const lowStockList = liveProducts.filter((p) => Number(p.stock_quantity ?? 0) <= 5);

      // Top Selling Products
      const productSalesMap: Record<string, { id: number; name: string; qty: number; rev: number; img?: string }> = {};
      liveOrders.forEach((o) => {
        (o.items || []).forEach((item: any) => {
          const key = item.product_name || `p_${item.product_id}`;
          if (!productSalesMap[key]) {
            productSalesMap[key] = {
              id: item.product_id || 0,
              name: item.product_name || 'Product',
              qty: 0,
              rev: 0,
              img: resolveProductImage(item) || undefined,
            };
          }
          productSalesMap[key].qty += Number(item.quantity || 1);
          productSalesMap[key].rev +=
            Number(item.total_price) || (Number(item.unit_price || 0) * Number(item.quantity || 1));
        });
      });

      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 4);

      // Timeline fallback
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyBuckets: Record<string, number> = {};
      months.forEach((m) => (monthlyBuckets[m] = 0));
      liveOrders.forEach((o) => {
        if (o.created_at) {
          const m = months[new Date(o.created_at).getMonth()];
          if (m) monthlyBuckets[m] += Number(o.total_amount ?? o.total ?? 0);
        }
      });

      const timeline: TimelineDataPoint[] =
        analytics?.timeline && analytics.timeline.length > 0 && analytics.timeline.some((t: any) => (t.revenue || 0) > 0)
          ? analytics.timeline
          : months.map((m) => ({ label: m, key: m, revenue: monthlyBuckets[m] }));

      return {
        totalRevenue,
        ordersCount,
        pendingOrdersCount,
        lowStockCount: lowStockList.length,
        lowStockList: lowStockList.slice(0, 4),
        recentOrders: liveOrders.slice(0, 5),
        topProducts,
        timeline,
      };
    },
    enabled: !!activeStore,
    refetchInterval: 30000,
  });

  const handleShareStore = async () => {
    try {
      const url = activeStore?.store_url;
      if (!url) return;
      await Share.share({
        title: activeStore?.store_name || 'My Store',
        message: `Visit our store: ${url}`,
        url,
      });
    } catch {}
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* 1. Slim Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.storeIdentityRow}>
          <View style={styles.storeAvatar}>
            <Store size={15} color="#ffffff" />
          </View>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.storeNameWithLive}>
              <Text style={[styles.storeTitleText, { color: colors.text }]} numberOfLines={1}>
                {activeStore?.store_name || 'Tyro Store'}
              </Text>
              <View style={styles.liveIndicatorDot} />
            </View>
            <Text style={[styles.storeUrlText, { color: colors.textSecondary }]} numberOfLines={1}>
              {activeStore?.store_url ? activeStore.store_url.replace(/^https?:\/\//, '') : 'Online'}
            </Text>
          </View>
        </View>

        {/* Action icons */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: colors.subtle }]}
            onPress={handleShareStore}
            activeOpacity={0.7}
          >
            <Share2 size={15} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconButton, { backgroundColor: colors.subtle }]}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <RefreshCw size={15} color={isRefetching ? '#7c3aed' : colors.text} />
          </TouchableOpacity>
        </View>
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
        {/* 2. Compact Period Switcher */}
        <View style={[styles.periodBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {PERIOD_TABS.map((tab) => {
            const isActive = selectedPeriod === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.periodTab,
                  isActive && {
                    backgroundColor: colors.isDark ? '#312e81' : '#ede9fe',
                  },
                ]}
                onPress={() => setSelectedPeriod(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodTabText,
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
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Hero Sales Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
                Total Sales Revenue
              </Text>
              <View style={styles.heroAmountRow}>
                <CurrencyText
                  amount={dashboardData?.totalRevenue ?? 0}
                  currencySymbol={currencySymbol}
                  size="hero"
                  color={colors.text}
                  weight="800"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.analyticsLinkBtn, { backgroundColor: colors.isDark ? '#1e1b4b' : '#f5f3ff' }]}
              onPress={() => router.push('/analytics')}
              activeOpacity={0.7}
            >
              <TrendingUp size={13} color="#7c3aed" />
              <Text style={styles.analyticsLinkText}>Analytics</Text>
              <ChevronRight size={13} color="#7c3aed" />
            </TouchableOpacity>
          </View>

          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

          {/* Quick summary numbers row */}
          <View style={styles.heroMetricsSummaryRow}>
            <View style={styles.miniMetricItem}>
              <Text style={[styles.miniMetricValue, { color: colors.text }]}>
                {dashboardData?.ordersCount ?? 0}
              </Text>
              <Text style={[styles.miniMetricLabel, { color: colors.textSecondary }]}>Orders</Text>
            </View>

            <View style={[styles.miniMetricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.miniMetricItem}>
              <Text style={[styles.miniMetricValue, { color: '#d97706' }]}>
                {dashboardData?.pendingOrdersCount ?? 0}
              </Text>
              <Text style={[styles.miniMetricLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>

            <View style={[styles.miniMetricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.miniMetricItem}>
              <Text style={[styles.miniMetricValue, { color: '#059669' }]}>
                {dashboardData?.ordersCount && dashboardData.ordersCount > 0
                  ? formatBanglaCurrency(
                      Math.round((dashboardData.totalRevenue || 0) / dashboardData.ordersCount)
                    ) + ' ' + currencySymbol
                  : `0 ${currencySymbol}`}
              </Text>
              <Text style={[styles.miniMetricLabel, { color: colors.textSecondary }]}>Avg Order</Text>
            </View>
          </View>
        </View>

        {/* 4. Action Tiles (Pending Delivery, Low Stock, POS) */}
        <View style={styles.actionTilesRow}>
          {/* Pending Orders Card */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/orders')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileBadge, { backgroundColor: '#fef3c7' }]}>
              <Clock size={14} color="#b45309" />
              <Text style={[styles.actionTileBadgeText, { color: '#b45309' }]}>
                {dashboardData?.pendingOrdersCount ?? 0}
              </Text>
            </View>
            <Text style={[styles.actionTileTitle, { color: colors.text }]}>Pending</Text>
            <Text style={[styles.actionTileSub, { color: colors.textSecondary }]}>Need Action</Text>
          </TouchableOpacity>

          {/* Low Stock Card */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/products')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileBadge, { backgroundColor: '#fee2e2' }]}>
              <AlertTriangle size={14} color="#dc2626" />
              <Text style={[styles.actionTileBadgeText, { color: '#dc2626' }]}>
                {dashboardData?.lowStockCount ?? 0}
              </Text>
            </View>
            <Text style={[styles.actionTileTitle, { color: colors.text }]}>Low Stock</Text>
            <Text style={[styles.actionTileSub, { color: colors.textSecondary }]}>≤ 5 units left</Text>
          </TouchableOpacity>

          {/* Create POS Order Card */}
          <TouchableOpacity
            style={[styles.actionTile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/orders/create')}
            activeOpacity={0.75}
          >
            <View style={[styles.actionTileBadge, { backgroundColor: '#e0f2fe' }]}>
              <Plus size={14} color="#0284c7" />
              <Text style={[styles.actionTileBadgeText, { color: '#0284c7' }]}>New</Text>
            </View>
            <Text style={[styles.actionTileTitle, { color: colors.text }]}>New Order</Text>
            <Text style={[styles.actionTileSub, { color: colors.textSecondary }]}>Manual / POS</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Compact Revenue Chart */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Sales Trend</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Revenue performance over time
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => router.push('/analytics')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>Full Report</Text>
              <ChevronRight size={13} color="#7c3aed" />
            </TouchableOpacity>
          </View>

          <InteractiveRevenueChart
            data={dashboardData?.timeline || []}
            currencySymbol={currencySymbol}
            height={135}
            accentColor="#7c3aed"
            isDark={colors.isDark}
          />
        </View>

        {/* 6. Recent Orders Preview */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Latest customer purchases
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => router.push('/(tabs)/orders')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={13} color="#7c3aed" />
            </TouchableOpacity>
          </View>

          {(!dashboardData?.recentOrders || dashboardData.recentOrders.length === 0) ? (
            <View style={styles.emptyStateBox}>
              <Package size={26} color={colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No orders placed yet.
              </Text>
            </View>
          ) : (
            <View style={styles.ordersListContainer}>
              {dashboardData.recentOrders.map((order: any, idx: number) => {
                const isLast = idx === dashboardData.recentOrders.length - 1;
                const invoice = `#${order.invoice_no || order.order_number || order.id}`;
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[
                      styles.orderRowItem,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                    onPress={() => router.push(`/orders/${order.id}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Left details */}
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.orderInvoiceRow}>
                        <Text style={[styles.orderInvoiceText, { color: colors.text }]}>
                          {invoice}
                        </Text>
                        <Text style={[styles.orderCustomerText, { color: colors.textSecondary }]} numberOfLines={1}>
                          • {order.customer_name || 'Customer'}
                        </Text>
                      </View>

                      {/* Phone & 1-tap call/whatsapp buttons */}
                      <View style={styles.orderActionsLine}>
                        {order.customer_phone ? (
                          <>
                            <QuickActionButton type="call" phone={order.customer_phone} />
                            <QuickActionButton type="whatsapp" phone={order.customer_phone} />
                          </>
                        ) : (
                          <Text style={[styles.noPhoneText, { color: colors.textMuted }]}>
                            No phone provided
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Right amount and status */}
                    <View style={styles.orderRightCol}>
                      <CurrencyText
                        amount={order.total_amount ?? order.total ?? 0}
                        currencySymbol={currencySymbol}
                        size="sm"
                        color={colors.text}
                        weight="700"
                      />
                      <StatusBadge status={order.status || 'processing'} size="sm" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 7. Top Selling Products */}
        {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Selling Items</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                  High-demand products
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllRow}
                onPress={() => router.push('/(tabs)/products')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>All Products</Text>
                <ChevronRight size={13} color="#7c3aed" />
              </TouchableOpacity>
            </View>

            <View style={styles.topProductsList}>
              {dashboardData.topProducts.map((prod, pIdx) => {
                const isLast = pIdx === dashboardData.topProducts.length - 1;
                return (
                  <View
                    key={prod.id || pIdx}
                    style={[
                      styles.topProductRow,
                      !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <View style={[styles.productThumbBox, { backgroundColor: colors.subtle }]}>
                      {(() => {
                        const prodImgUri = resolveProductImage(prod.img || prod);
                        return prodImgUri ? (
                          <Image source={{ uri: prodImgUri }} style={styles.productThumb} resizeMode="cover" />
                        ) : (
                          <Package size={16} color={colors.textMuted} />
                        );
                      })()}
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <Text style={[styles.topProdName, { color: colors.text }]} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={[styles.topProdUnits, { color: colors.textSecondary }]}>
                        {prod.qty} units sold
                      </Text>
                    </View>

                    <CurrencyText
                      amount={prod.rev}
                      currencySymbol={currencySymbol}
                      size="sm"
                      color={colors.text}
                      weight="700"
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={{ height: 20 }} />
      </ScrollView>
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
  storeIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  storeNameWithLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  storeTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  storeUrlText: {
    fontSize: 10.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 8,
  },
  periodBar: {
    flexDirection: 'row',
    borderRadius: 9,
    borderWidth: 1,
    padding: 2.5,
    justifyContent: 'space-between',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabText: {
    fontSize: 11,
  },
  heroCard: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 11,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  heroAmountRow: {
    marginTop: 2,
  },
  analyticsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  analyticsLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
  },
  heroDivider: {
    height: 1,
    marginVertical: 9,
  },
  heroMetricsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  miniMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  miniMetricValue: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  miniMetricLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  miniMetricDivider: {
    width: 1,
    height: 22,
  },
  actionTilesRow: {
    flexDirection: 'row',
    gap: 7,
  },
  actionTile: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    alignItems: 'flex-start',
  },
  actionTileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5.5,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 5,
  },
  actionTileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionTileTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionTileSub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  sectionCard: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 10,
    marginTop: 0.5,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7c3aed',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 4,
  },
  emptyStateText: {
    fontSize: 11.5,
  },
  ordersListContainer: {
    marginTop: 2,
  },
  orderRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7.5,
  },
  orderInvoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderInvoiceText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  orderCustomerText: {
    fontSize: 11.5,
    flexShrink: 1,
  },
  orderActionsLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  noPhoneText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  orderRightCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  topProductsList: {
    marginTop: 2,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  productThumbBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productThumb: {
    width: 32,
    height: 32,
  },
  topProdName: {
    fontSize: 12,
    fontWeight: '600',
  },
  topProdUnits: {
    fontSize: 10,
    marginTop: 1,
  },
});
