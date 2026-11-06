import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Store, Mail, Lock, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { useThemeStore } from '../src/store/themeStore';

export default function LoginScreen() {
  const router = useRouter();
  const addStore = useAuthStore((s) => s.addStore);
  const colors = useThemeStore((s) => s.colors);

  const [storeUrl, setStoreUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deviceName =
    Constants.deviceName ||
    `${Platform.OS.toUpperCase()}-${Platform.Version || 'Device'}`;

  const formatUrl = (input: string): string => {
    let clean = input.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    return clean;
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!storeUrl.trim()) {
      setErrorMessage('Please enter your Store URL.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    const targetBaseUrl = formatUrl(storeUrl);
    setIsSubmitting(true);

    try {
      // 1. Authenticate and obtain Sanctum Bearer token
      const tokenResponse = await axios.post(
        `${targetBaseUrl}/api/v1/auth/token`,
        {
          email: email.trim(),
          password,
          device_name: deviceName,
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const { access_token, user } = tokenResponse.data;

      // 2. Fetch Store Metadata
      let storeName = 'Tyro Store';
      let currency = '৳';
      let logo: string | null = null;

      try {
        const infoResponse = await axios.get(`${targetBaseUrl}/api/v1/store-info`, {
          headers: { Accept: 'application/json' },
          timeout: 8000,
        });

        if (infoResponse.data) {
          storeName = infoResponse.data.store_name || storeName;
          currency = infoResponse.data.currency || currency;
          logo = infoResponse.data.logo || null;
        }
      } catch {}

      // 3. Persist into multi-store Zustand auth store + SecureStore
      await addStore({
        store_name: storeName,
        store_url: targetBaseUrl,
        access_token,
        currency,
        logo,
        user_info: user,
      });

      // 4. Navigate to main tab dashboard
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      let message = 'Connection failed. Please check the Store URL and credentials.';
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardContainer, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Store size={26} color="#ffffff" />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>Tyro eComm</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
            Store Management Companion
          </Text>
        </View>

        {/* Error Alert */}
        {errorMessage && (
          <View style={[styles.errorBox, { backgroundColor: colors.isDark ? '#450a0a' : '#fee2e2' }]}>
            <AlertCircle size={15} color="#dc2626" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Input Form */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Store URL */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>STORE URL</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
            <Store size={15} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. aamzo.com"
              placeholderTextColor={colors.textMuted}
              value={storeUrl}
              onChangeText={setStoreUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isSubmitting}
            />
          </View>

          {/* Email */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
            <Mail size={15} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="admin@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isSubmitting}
            />
          </View>

          {/* Password */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PASSWORD</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.subtle, borderColor: colors.border }]}>
            <Lock size={15} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          {/* Device verification badge */}
          <View style={[styles.deviceBadge, { backgroundColor: colors.subtle }]}>
            <ShieldCheck size={13} color="#7c3aed" />
            <Text style={[styles.deviceText, { color: colors.textSecondary }]}>
              Secure Terminal: {deviceName}
            </Text>
          </View>

          {/* Connect Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Connect Store</Text>
                <ArrowRight size={14} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11.5,
    color: '#dc2626',
    flex: 1,
  },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  inputIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    height: 38,
    fontSize: 12.5,
    padding: 0,
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
  },
  deviceText: {
    fontSize: 10.5,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
