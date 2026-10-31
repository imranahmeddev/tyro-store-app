import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  BellRing,
  Volume2,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Shield,
  Store,
  LogOut,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';
import { useThemeStore, ThemeMode } from '../../../src/store/themeStore';
import { playChaChingSound } from '../../../src/services/soundService';

interface UpdateCheckResponse {
  current_version: string;
  latest_version: string;
  has_update: boolean;
  download_url?: string | null;
  changelog?: string[] | string | null;
  message?: string;
}

interface UpdateRunResponse {
  success: boolean;
  old_version?: string;
  new_version?: string;
  message: string;
  logs?: string[];
}

export default function HubSettingsScreen() {
  const router = useRouter();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const logout = useAuthStore((s) => s.logout);
  const isSuperAdmin = activeStore?.user_info?.is_super_admin ?? false;

  const { mode: currentThemeMode, setMode: setThemeMode, colors } = useThemeStore();

  const [soundPlaying, setSoundPlaying] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  // 1. Check Update Query
  const {
    data: updateData,
    isLoading: isCheckingUpdate,
    refetch: checkForUpdates,
    error: updateCheckError,
  } = useQuery<UpdateCheckResponse>({
    queryKey: ['system_update_check', activeStore?.id],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/update/check');
      return response.data;
    },
    enabled: !!activeStore && isSuperAdmin,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // 2. Run Update Mutation
  const runUpdateMutation = useMutation<UpdateRunResponse, any, { download_url?: string | null }>({
    mutationFn: async ({ download_url }) => {
      setUpdateStatus('Deploying zero-downtime update pipeline...');
      const response = await apiClient.post('/api/v1/update/run', { download_url });
      return response.data;
    },
    onSuccess: (res) => {
      setUpdateStatus(null);
      const msg = res.message || `System updated successfully to v${res.new_version || 'latest'}!`;
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Update Completed', msg);
      }
      checkForUpdates();
    },
    onError: (err: any) => {
      setUpdateStatus(null);
      const msg = err?.response?.data?.message || 'Update failed to execute.';
      if (Platform.OS === 'web') {
        alert(`Update Failed: ${msg}`);
      } else {
        Alert.alert('Update Failed', String(msg));
      }
    },
  });

  const handleTestSound = async () => {
    try {
      setSoundPlaying(true);
      await playChaChingSound();
    } finally {
      setTimeout(() => setSoundPlaying(false), 800);
    }
  };

  const handleTriggerUpdate = () => {
    if (!updateData?.has_update) {
      Alert.alert('System Current', 'Your backend is already running the newest available release.');
      return;
    }

    const run = () => {
      runUpdateMutation.mutate({ download_url: updateData.download_url });
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Start zero-downtime update to v${updateData.latest_version}?`)) {
        run();
      }
      return;
    }

    Alert.alert(
      'Confirm Update',
      `Execute zero-downtime update to v${updateData.latest_version}? The updater protects your .env, databases, and media folders.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update Now', style: 'default', onPress: run },
      ]
    );
  };

  const themeOptions: { key: ThemeMode; label: string; desc: string; icon: any }[] = [
    {
      key: 'system',
      label: 'System Match',
      desc: 'Follows iOS / Android appearance',
      icon: Smartphone,
    },
    {
      key: 'light',
      label: 'Clean Light',
      desc: 'Crisp high-contrast day theme',
      icon: Sun,
    },
    {
      key: 'dark',
      label: 'OLED Pure Black',
      desc: 'Deep #000000 black for AMOLED battery saving',
      icon: Moon,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.screenHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.subtle }]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/dashboard');
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Settings & System</Text>
            <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
              Theme engine, sounds & updater
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Section 1: Appearance & OLED Dark Mode */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: colors.primarySubtle }]}>
              <Moon size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance & Theme</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                OLED Pure Black (#000000) saves battery
              </Text>
            </View>
          </View>

          <View style={styles.themeOptionsGrid}>
            {themeOptions.map((opt) => {
              const isSelected = currentThemeMode === opt.key;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.themeOptionCard,
                    { backgroundColor: colors.subtle, borderColor: colors.border },
                    isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                  onPress={() => setThemeMode(opt.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.themeOptionHeader}>
                    <IconComp
                      size={20}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    {isSelected ? (
                      <CheckCircle2 size={16} color={colors.primary} />
                    ) : null}
                  </View>
                  <Text style={[styles.themeOptionTitle, { color: colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.themeOptionDesc, { color: colors.textSecondary }]}>
                    {opt.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Native Audio & "Cha-ching!" Sound */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: colors.warningBg }]}>
              <BellRing size={18} color={colors.warning} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Order Alerts & Audio</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Signature cash register "Cha-ching!" chime
              </Text>
            </View>
          </View>

          <View style={[styles.soundBanner, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
            <View style={styles.soundBannerLeft}>
              <Volume2 size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.soundBannerTitle, { color: colors.text }]}>
                  Cash Register Chime
                </Text>
                <Text style={[styles.soundBannerDesc, { color: colors.textSecondary }]}>
                  Plays automatically when a new customer order arrives
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.testSoundBtn,
                { backgroundColor: colors.primary },
                soundPlaying && { opacity: 0.7 },
              ]}
              onPress={handleTestSound}
              disabled={soundPlaying}
              activeOpacity={0.8}
            >
              <Zap size={14} color="#ffffff" />
              <Text style={styles.testSoundBtnText}>
                {soundPlaying ? 'Playing...' : 'Test Sound'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Self-Hosted Auto-Updater */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: colors.successBg }]}>
              <RefreshCw size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Self-Hosted Auto-Updater</Text>
                <View style={[styles.versionPill, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.versionPillText, { color: colors.primary }]}>
                    v{updateData?.current_version || '1.0.0'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                Zero-downtime, zero-data-loss system pipeline
              </Text>
            </View>
          </View>

          {isSuperAdmin ? (
            <View>
              {/* Updater Status Card */}
              {updateStatus ? (
                <View style={[styles.updaterStatusBox, { backgroundColor: colors.primarySubtle }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.updaterStatusText, { color: colors.primary }]}>
                    {updateStatus}
                  </Text>
                </View>
              ) : updateData?.has_update ? (
                <View style={[styles.updateAvailableBox, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}>
                  <Sparkles size={18} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.updateAvailableTitle, { color: colors.text }]}>
                      New Release Available: v{updateData.latest_version}
                    </Text>
                    <Text style={[styles.updateAvailableDesc, { color: colors.textSecondary }]}>
                      {updateData.message || 'Performance optimizations and database integrity patches.'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.upToDateBox, { backgroundColor: colors.subtle }]}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[styles.upToDateText, { color: colors.textSecondary }]}>
                    Your store is running the latest production build.
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.updaterActionsRow}>
                <TouchableOpacity
                  style={[styles.checkUpdateBtn, { backgroundColor: colors.subtle, borderColor: colors.border }]}
                  onPress={() => checkForUpdates()}
                  disabled={isCheckingUpdate}
                  activeOpacity={0.7}
                >
                  {isCheckingUpdate ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <RefreshCw size={14} color={colors.text} />
                      <Text style={[styles.checkUpdateBtnText, { color: colors.text }]}>
                        Check for Updates
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {updateData?.has_update ? (
                  <TouchableOpacity
                    style={[styles.runUpdateBtn, { backgroundColor: colors.primary }]}
                    onPress={handleTriggerUpdate}
                    disabled={runUpdateMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {runUpdateMutation.isPending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <DownloadCloud size={16} color="#ffffff" />
                        <Text style={styles.runUpdateBtnText}>
                          Update to v{updateData.latest_version}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={[styles.restrictedBox, { backgroundColor: colors.subtle }]}>
              <Shield size={16} color={colors.textSecondary} />
              <Text style={[styles.restrictedText, { color: colors.textSecondary }]}>
                Only Super Administrators can execute core system auto-updates.
              </Text>
            </View>
          )}
        </View>

        {/* Section 4: Store & Session Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: colors.primarySubtle }]}>
              <Store size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Connected Store</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {activeStore?.store_name}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Endpoint</Text>
            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
              {activeStore?.store_url}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Active User</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {activeStore?.user_info?.name} ({activeStore?.user_info?.role})
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.danger, backgroundColor: colors.dangerBg }]}
            onPress={() => logout()}
            activeOpacity={0.7}
          >
            <LogOut size={16} color={colors.danger} />
            <Text style={[styles.logoutBtnText, { color: colors.danger }]}>
              Disconnect & Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  themeOptionsGrid: {
    gap: 10,
  },
  themeOptionCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  themeOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  themeOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  soundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  soundBannerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  soundBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  soundBannerDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  testSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testSoundBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  versionPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  updaterStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  updaterStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  updateAvailableBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  updateAvailableTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  updateAvailableDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  upToDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  upToDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  updaterActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkUpdateBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkUpdateBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  runUpdateBtn: {
    flex: 1.2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  runUpdateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  restrictedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  restrictedText: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '65%',
  },
  logoutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

