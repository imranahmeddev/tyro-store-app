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
  Alert,
} from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Store, Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const addStore = useAuthStore((s) => s.addStore);

  const [storeUrl, setStoreUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Hidden/Auto-detected Device Name
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
      setErrorMessage('Store URL is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required.');
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

      // 2. Fetch Store Metadata (Currency, Store Name, Logo)
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
      } catch (infoErr) {
        console.warn('[Login] Failed to load store info, using defaults.', infoErr);
      }

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
      console.error('[Login] Authentication error:', err);
      let message = 'Connection failed. Please check the Store URL and your network.';
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
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Store size={36} color="#0284c7" />
          </View>
          <Text style={styles.headerTitle}>Connect Your Store</Text>
          <Text style={styles.headerSubtitle}>
            Manage orders, inventory, and analytics in real time.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <AlertCircle size={20} color="#b91c1c" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Store URL */}
          <Text style={styles.label}>Store URL</Text>
          <View style={styles.inputWrapper}>
            <Store size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. ghorerbzer.com or https://yourstore.com"
              placeholderTextColor="#94a3b8"
              value={storeUrl}
              onChangeText={setStoreUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isSubmitting}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Staff / Admin Email</Text>
          <View style={styles.inputWrapper}>
            <Mail size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="admin@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isSubmitting}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Lock size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          {/* Hidden/Device Info Badge */}
          <View style={styles.deviceBadge}>
            <ShieldCheck size={16} color="#0284c7" />
            <Text style={styles.deviceBadgeText}>
              Device Identification: {deviceName}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Connect & Log In</Text>
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
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#b91c1c',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#0f172a',
  },
  deviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 24,
    gap: 6,
  },
  deviceBadgeText: {
    fontSize: 12,
    color: '#0369a1',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0284c7',
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
