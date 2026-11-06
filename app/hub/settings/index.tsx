import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ChevronLeft,
  Moon,
  Sun,
  Smartphone,
  Volume2,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  Shield,
  Store,
  LogOut,
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
  message?: string;
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
  } = useQuery<UpdateCheckResponse>({
    queryKey: ['system_update_check', activeStore?.id],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/update/check');
      return response.data;
    },
    enabled: !!activeStore && isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // 2. Run Update Mutation
  const runUpdateMutation = useMutation({
    mutationFn: async ({ download_url }: { download_url?: string | null }) => {
      setUpdateStatus('Deploying update pipeline...');
      const response = await apiClient.post('/api/v1/update/run', { download_url });
      return response.data;
    },
    onSuccess: (res: any) => {
      setUpdateStatus(null);
      const msg = res.message || `System updated successfully to v${res.new_version || 'latest'}!`;
      Alert.alert('Update Completed', msg);
      checkForUpdates();
    },
    onError: (err: any) => {
      setUpdateStatus(null);
      const msg = err?.response?.data?.message || 'Update failed.';
      Alert.alert('Update Failed', String(msg));
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
      Alert.alert('System Current', 'Your backend is already running the newest release.');
      return;
    }

    Alert.alert(
      'Confirm Update',
      `Execute zero-downtime update to v${updateData.latest_version}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update Now',
          style: 'default',
          onPress: () => runUpdateMutation.mutate({ download_url: updateData.download_url }),
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Slim Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.subtle }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Appearance */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
            APPEARANCE & DISPLAY
          </Text>

          <View style={[styles.segmentContainer, { backgroundColor: colors.subtle }]}>
            {(
              [
                { key: 'system', label: 'System', icon: Smartphone },
                { key: 'light', label: 'Light', icon: Sun },
                { key: 'dark', label: 'OLED Black', icon: Moon },
              ] as const
            ).map((opt) => {
              const isSelected = currentThemeMode === opt.key;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.segmentBtn,
                    isSelected && {
                      backgroundColor: colors.surface,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    },
                  ]}
                  onPress={() => setThemeMode(opt.key)}
                  activeOpacity={0.7}
                >
                  <IconComp size={13} color={isSelected ? '#7c3aed' : colors.textSecondary} />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      {
                        color: isSelected ? (colors.isDark ? '#c4b5fd' : '#6d28d9') : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Audio & Alerts */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
            ORDER ALERTS & SOUND
          </Text>

          <View style={styles.soundRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.settingRowTitle, { color: colors.text }]}>
                "Cha-ching!" Cash Register Chime
              </Text>
              <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>
                Plays automatically when a new order arrives
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.testSoundBtn,
                { backgroundColor: colors.isDark ? '#312e81' : '#ede9fe' },
                soundPlaying && { opacity: 0.6 },
              ]}
              onPress={handleTestSound}
              disabled={soundPlaying}
              activeOpacity={0.7}
            >
              <Volume2 size={13} color="#7c3aed" />
              <Text style={styles.testSoundText}>{soundPlaying ? 'Playing' : 'Test Sound'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Self-Hosted Auto Updater */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.updaterHeaderRow}>
            <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
              SYSTEM UPDATES
            </Text>
            <View style={[styles.versionPill, { backgroundColor: colors.subtle }]}>
              <Text style={[styles.versionText, { color: '#7c3aed' }]}>
                v{updateData?.current_version || '1.0.0'}
              </Text>
            </View>
          </View>

          {isSuperAdmin ? (
            <View style={{ gap: 8 }}>
              {updateStatus ? (
                <View style={[styles.statusBox, { backgroundColor: colors.subtle }]}>
                  <ActivityIndicator size="small" color="#7c3aed" />
                  <Text style={[styles.statusText, { color: '#7c3aed' }]}>{updateStatus}</Text>
                </View>
              ) : updateData?.has_update ? (
                <View style={[styles.statusBox, { backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1 }]}>
                  <Sparkles size={14} color="#b45309" />
                  <Text style={[styles.statusText, { color: '#b45309' }]}>
                    New release v{updateData.latest_version} available
                  </Text>
                </View>
              ) : (
                <View style={[styles.statusBox, { backgroundColor: colors.subtle }]}>
                  <CheckCircle2 size={14} color="#16a34a" />
                  <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                    Store backend is up to date
                  </Text>
                </View>
              )}

              <View style={styles.updaterBtnsRow}>
                <TouchableOpacity
                  style={[styles.checkBtn, { backgroundColor: colors.subtle }]}
                  onPress={() => checkForUpdates()}
                  disabled={isCheckingUpdate}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={13} color={colors.text} />
                  <Text style={[styles.checkBtnText, { color: colors.text }]}>Check Update</Text>
                </TouchableOpacity>

                {updateData?.has_update ? (
                  <TouchableOpacity
                    style={styles.updateNowBtn}
                    onPress={handleTriggerUpdate}
                    disabled={runUpdateMutation.isPending}
                    activeOpacity={0.8}
                  >
                    <DownloadCloud size={13} color="#ffffff" />
                    <Text style={styles.updateNowText}>Update to v{updateData.latest_version}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>
              Only Super Administrators can manage updates.
            </Text>
          )}
        </View>

        {/* Section 4: Store & Session */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardHeaderTitle, { color: colors.textSecondary }]}>
            CONNECTED STORE
          </Text>

          <View style={styles.storeDetailLine}>
            <Text style={[styles.storeLabel, { color: colors.textSecondary }]}>Store Name</Text>
            <Text style={[styles.storeValue, { color: colors.text }]}>{activeStore?.store_name}</Text>
          </View>

          <View style={styles.storeDetailLine}>
            <Text style={[styles.storeLabel, { color: colors.textSecondary }]}>Endpoint</Text>
            <Text style={[styles.storeValue, { color: colors.text }]} numberOfLines={1}>
              {activeStore?.store_url}
            </Text>
          </View>

          <View style={styles.storeDetailLine}>
            <Text style={[styles.storeLabel, { color: colors.textSecondary }]}>User</Text>
            <Text style={[styles.storeValue, { color: colors.text }]}>
              {activeStore?.user_info?.name} ({activeStore?.user_info?.role || 'Admin'})
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.isDark ? '#450a0a' : '#fee2e2' }]}
            onPress={() => logout()}
            activeOpacity={0.7}
          >
            <LogOut size={14} color="#dc2626" />
            <Text style={styles.logoutBtnText}>Sign Out & Disconnect</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
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
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
  },
  sectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  cardHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2.5,
    marginTop: 2,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentBtnText: {
    fontSize: 11,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  settingRowTitle: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  settingRowSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  testSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 6,
  },
  testSoundText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  updaterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionPill: {
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  updaterBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 6,
  },
  checkBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  updateNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 6,
  },
  updateNowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  storeDetailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  storeLabel: {
    fontSize: 11.5,
  },
  storeValue: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    borderRadius: 7,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
});
