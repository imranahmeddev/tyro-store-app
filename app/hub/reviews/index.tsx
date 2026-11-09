import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Star,
  Search,
  CheckCircle2,
  Trash2,
  AlertOctagon,
  MessageSquare,
  ShieldCheck,
  Calendar,
  AlertCircle,
  X,
  Send,
  CornerDownRight,
  Package,
} from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';
import { resolveProductImage } from '../../../src/utils/image';

export interface ReviewItem {
  id: number;
  product_id: number;
  product_name: string;
  product_thumbnail: string | null;
  author_name: string;
  author_email: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: 'pending' | 'approved' | 'spam' | 'rejected';
  is_verified_purchase: boolean;
  approved_at: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function ReviewModerationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'spam'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Modal State
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [replyText, setReplyText] = useState('');

  // 1. Fetch Reviews
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['reviews', activeStore?.id, activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {
        status: activeTab,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      const response = await apiClient.get('/api/v1/reviews', { params });
      return response.data;
    },
    enabled: !!activeStore,
  });

  const reviews: ReviewItem[] = data?.data ?? [];
  const counts = data?.counts ?? {
    pending: 0,
    approved: 0,
    spam: 0,
    all: 0,
  };

  // 2. Status Mutation (Approve / Spam)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiClient.patch(`/api/v1/reviews/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update review status.';
      Alert.alert('Error', String(msg));
    },
  });

  // 3. Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async ({ id, reply }: { id: number; reply: string }) => {
      const response = await apiClient.post(`/api/v1/reviews/${id}/reply`, { reply });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setReplyModalVisible(false);
      setSelectedReview(null);
      setReplyText('');
      if (Platform.OS === 'web') {
        alert('Reply posted successfully.');
      } else {
        Alert.alert('Success', 'Reply posted successfully.');
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to send reply.';
      Alert.alert('Error', String(msg));
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/api/v1/reviews/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete review.';
      Alert.alert('Error', String(msg));
    },
  });

  const openReplyModal = (review: ReviewItem) => {
    setSelectedReview(review);
    setReplyText(review.reply || '');
    setReplyModalVisible(true);
  };

  const handleSendReply = () => {
    if (!selectedReview || !replyText.trim()) {
      Alert.alert('Validation Error', 'Please type a reply before sending.');
      return;
    }
    replyMutation.mutate({
      id: selectedReview.id,
      reply: replyText.trim(),
    });
  };

  const confirmDelete = (review: ReviewItem) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete this review by ${review.author_name}?`)) {
        deleteMutation.mutate(review.id);
      }
      return;
    }
    Alert.alert(
      'Delete Review',
      `Are you sure you want to permanently delete this review by "${review.author_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(review.id),
        },
      ]
    );
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '';
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

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            color={star <= rating ? '#f59e0b' : '#cbd5e1'}
            fill={star <= rating ? '#f59e0b' : 'none'}
          />
        ))}
      </View>
    );
  };

  const renderReviewCard = ({ item }: { item: ReviewItem }) => {
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'approved';
    const isSpam = item.status === 'spam' || item.status === 'rejected';

    return (
      <View style={styles.card}>
        {/* Card Header: Rating, Status, Date */}
        <View style={styles.cardHeader}>
          <View style={styles.ratingBox}>
            {renderStars(item.rating)}
            <Text style={styles.ratingNum}>{item.rating}.0</Text>
          </View>

          <View style={styles.headerRight}>
            <View
              style={[
                styles.statusBadge,
                isApproved
                  ? styles.statusApproved
                  : isSpam
                  ? styles.statusSpam
                  : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isApproved
                    ? styles.statusTextApproved
                    : isSpam
                    ? styles.statusTextSpam
                    : styles.statusTextPending,
                ]}
              >
                {isApproved ? 'Approved' : isSpam ? 'Spam' : 'Pending'}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Reviewer Info */}
        <View style={styles.authorRow}>
          <Text style={styles.authorName}>{item.author_name}</Text>
          {item.is_verified_purchase ? (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={11} color="#16a34a" />
              <Text style={styles.verifiedText}>Verified Buyer</Text>
            </View>
          ) : null}
        </View>

        {item.author_email ? (
          <Text style={styles.authorEmail}>{item.author_email}</Text>
        ) : null}

        {/* Product Reference Card */}
        <View style={styles.productSnippet}>
          {(() => {
            const rImg = resolveProductImage(item.product_thumbnail || item);
            return rImg ? (
              <Image
                source={{ uri: rImg }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.productPlaceholder}>
                <Package size={16} color="#94a3b8" />
              </View>
            );
          })()}
          <View style={styles.productSnippetInfo}>
            <Text style={styles.productSnippetLabel}>Product</Text>
            <Text style={styles.productSnippetName} numberOfLines={1}>
              {item.product_name}
            </Text>
          </View>
        </View>

        {/* Review Text Content */}
        {item.title ? (
          <Text style={styles.reviewTitle}>{item.title}</Text>
        ) : null}
        <Text style={styles.reviewBody}>{item.body}</Text>

        {/* Existing Store Reply Bubble */}
        {item.reply ? (
          <View style={styles.replyBubble}>
            <View style={styles.replyHeader}>
              <CornerDownRight size={13} color="#0284c7" />
              <Text style={styles.replyAuthorText}>Merchant Response</Text>
              {item.replied_at ? (
                <Text style={styles.replyDateText}>
                  • {formatDate(item.replied_at)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.replyBodyText}>{item.reply}</Text>
          </View>
        ) : null}

        {/* 1-Tap Quick Actions Bar */}
        <View style={styles.actionsBar}>
          {/* Approve Button */}
          {!isApproved ? (
            <TouchableOpacity
              style={styles.actionBtnApprove}
              onPress={() =>
                statusMutation.mutate({ id: item.id, status: 'approved' })
              }
              disabled={statusMutation.isPending}
              activeOpacity={0.7}
            >
              <CheckCircle2 size={14} color="#16a34a" />
              <Text style={styles.actionTextApprove}>Approve</Text>
            </TouchableOpacity>
          ) : null}

          {/* Spam Button */}
          {!isSpam ? (
            <TouchableOpacity
              style={styles.actionBtnSpam}
              onPress={() =>
                statusMutation.mutate({ id: item.id, status: 'spam' })
              }
              disabled={statusMutation.isPending}
              activeOpacity={0.7}
            >
              <AlertOctagon size={14} color="#ea580c" />
              <Text style={styles.actionTextSpam}>Spam</Text>
            </TouchableOpacity>
          ) : null}

          {/* Reply Button */}
          <TouchableOpacity
            style={styles.actionBtnReply}
            onPress={() => openReplyModal(item)}
            activeOpacity={0.7}
          >
            <MessageSquare size={14} color="#0284c7" />
            <Text style={styles.actionTextReply}>
              {item.reply ? 'Edit Reply' : 'Reply'}
            </Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.actionBtnDelete}
            onPress={() => confirmDelete(item)}
            disabled={deleteMutation.isPending}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
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
            <Text style={styles.screenTitle}>Review Moderation</Text>
            <Text style={styles.screenSubtitle}>
              Approve customer feedback & ratings
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={16} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reviewer, product, or comment..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {(['pending', 'approved', 'spam'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          const count =
            tab === 'pending'
              ? counts.pending
              : tab === 'approved'
              ? counts.approved
              : counts.spam;

          const label =
            tab === 'pending'
              ? 'Pending'
              : tab === 'approved'
              ? 'Approved'
              : 'Spam';

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
                {label} ({count ?? 0})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading reviews queue...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertCircle size={36} color="#ef4444" />
          <Text style={styles.errorTitle}>Failed to load reviews</Text>
          <Text style={styles.errorSubtitle}>
            {(error as any)?.message || 'Check your internet connection.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContainer,
            reviews.length === 0 && styles.listContainerEmpty,
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
                <Star size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>Queue Is Clear!</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No reviews match "${searchQuery}".`
                  : `There are no ${activeTab} reviews waiting for moderation.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reply to Review</Text>
                <Text style={styles.modalSubtitle}>
                  For {selectedReview?.author_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setReplyModalVisible(false)}
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Customer Review Quote */}
            <View style={styles.modalQuoteBox}>
              <Text style={styles.modalQuoteText} numberOfLines={3}>
                "{selectedReview?.body}"
              </Text>
            </View>

            {/* Reply TextInput */}
            <Text style={styles.replyInputLabel}>Your Official Response</Text>
            <TextInput
              style={styles.replyTextInput}
              placeholder="Write a helpful response to the customer..."
              placeholderTextColor="#94a3b8"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Modal Footer Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setReplyModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSendBtn,
                  replyMutation.isPending && styles.modalSendBtnDisabled,
                ]}
                onPress={handleSendReply}
                disabled={replyMutation.isPending}
                activeOpacity={0.8}
              >
                {replyMutation.isPending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Send size={15} color="#ffffff" />
                    <Text style={styles.modalSendBtnText}>Post Reply</Text>
                  </>
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
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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
    paddingBottom: 40,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusApproved: {
    backgroundColor: '#dcfce7',
  },
  statusSpam: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextPending: {
    color: '#d97706',
  },
  statusTextApproved: {
    color: '#16a34a',
  },
  statusTextSpam: {
    color: '#dc2626',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  authorEmail: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  productSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  productImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  productPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productSnippetInfo: {
    flex: 1,
  },
  productSnippetLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  productSnippetName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  reviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 12,
  },
  replyBubble: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  replyAuthorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  replyDateText: {
    fontSize: 10,
    color: '#64748b',
  },
  replyBodyText: {
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 17,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  actionBtnApprove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  actionTextApprove: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  actionBtnSpam: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  actionTextSpam: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ea580c',
  },
  actionBtnReply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  actionTextReply: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  actionBtnDelete: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalQuoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#cbd5e1',
    marginBottom: 14,
  },
  modalQuoteText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  replyInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  replyTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    height: 100,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSendBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalSendBtnDisabled: {
    opacity: 0.7,
  },
  modalSendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
