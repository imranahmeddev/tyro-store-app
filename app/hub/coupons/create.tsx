import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Sparkles,
  Percent,
  Banknote,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import apiClient from '../../../src/api/client';
import { useAuthStore } from '../../../src/store/authStore';

export default function CreateCouponScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeStore = useAuthStore((s) => s.getActiveStore());
  const currencySymbol = activeStore?.currency || '৳';

  // Form State
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  // 1. Random Code Generator
  const generateRandomCode = () => {
    const prefixes = ['SAVE', 'TYRO', 'FLASH', 'OFF', 'MEGA', 'DEAL'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCode(`${prefix}-${randomChars}`);
  };

  // 2. Date Quick Presets
  const setExpiryDays = (days: number) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setExpiresAt(`${yyyy}-${mm}-${dd}`);
  };

  // 3. Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        type,
        value: parseFloat(value),
        min_order_amount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
        max_uses: maxUses ? parseInt(maxUses, 10) : null,
        expires_at: expiresAt.trim() || null,
        is_active: isActive,
      };

      const response = await apiClient.post('/api/v1/coupons', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      if (Platform.OS === 'web') {
        alert('Coupon created successfully!');
      } else {
        Alert.alert('Success', 'Coupon created successfully!');
      }
      router.back();
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})[0] ||
        'Failed to create coupon.';
      if (Platform.OS === 'web') {
        alert(String(msg));
      } else {
        Alert.alert('Error', String(msg));
      }
    },
  });

  const handleSubmit = () => {
    if (!code.trim()) {
      Alert.alert('Validation Error', 'Please enter or generate a coupon code.');
      return;
    }
    const val = parseFloat(value);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid discount value greater than 0.');
      return;
    }
    if (type === 'percentage' && val > 100) {
      Alert.alert('Validation Error', 'Percentage discount cannot exceed 100%.');
      return;
    }

    createMutation.mutate();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.screenHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.screenTitle}>Create Coupon</Text>
            <Text style={styles.screenSubtitle}>Configure a new discount code</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveHeaderBtn,
            createMutation.isPending && styles.saveHeaderBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          activeOpacity={0.8}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1: Code & Identity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coupon Code</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="e.g. FLASH20"
              placeholderTextColor="#94a3b8"
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={generateRandomCode}
              activeOpacity={0.7}
            >
              <Sparkles size={16} color="#0284c7" />
              <Text style={styles.generateBtnText}>Random</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Description (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 20% off for Summer clearance campaign"
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Section 2: Discount Type & Amount */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Discount Type & Value</Text>

          {/* Type Switcher */}
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'percentage' && styles.typeOptionActive,
              ]}
              onPress={() => setType('percentage')}
              activeOpacity={0.7}
            >
              <Percent
                size={16}
                color={type === 'percentage' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'percentage' && styles.typeOptionTextActive,
                ]}
              >
                Percentage (%)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                type === 'fixed' && styles.typeOptionActive,
              ]}
              onPress={() => setType('fixed')}
              activeOpacity={0.7}
            >
              <Banknote
                size={16}
                color={type === 'fixed' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.typeOptionText,
                  type === 'fixed' && styles.typeOptionTextActive,
                ]}
              >
                Fixed Cart ({currencySymbol})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Value Input */}
          <Text style={styles.inputLabel}>
            Discount Value {type === 'percentage' ? '(%)' : `(${currencySymbol})`} *
          </Text>
          <View style={styles.amountInputRow}>
            <TextInput
              style={styles.amountInput}
              placeholder={type === 'percentage' ? '20' : '250'}
              placeholderTextColor="#94a3b8"
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
            />
            <Text style={styles.amountUnit}>
              {type === 'percentage' ? '%' : currencySymbol}
            </Text>
          </View>

          {/* Maximum Discount Ceiling for Percentage */}
          {type === 'percentage' ? (
            <View style={styles.mt12}>
              <Text style={styles.inputLabel}>
                Maximum Discount Ceiling ({currencySymbol}) (Optional)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 500 (Leave empty for no limit)"
                placeholderTextColor="#94a3b8"
                value={maxDiscount}
                onChangeText={setMaxDiscount}
                keyboardType="numeric"
              />
            </View>
          ) : null}
        </View>

        {/* Section 3: Usage Restrictions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Usage Restrictions</Text>

          <Text style={styles.inputLabel}>
            Minimum Cart Spend ({currencySymbol}) (Optional)
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. 1000 (0 for no minimum)"
            placeholderTextColor="#94a3b8"
            value={minOrderAmount}
            onChangeText={setMinOrderAmount}
            keyboardType="numeric"
          />

          <View style={styles.mt12}>
            <Text style={styles.inputLabel}>
              Total Usage Limit (Total times code can be used)
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 100 (Leave empty for unlimited)"
              placeholderTextColor="#94a3b8"
              value={maxUses}
              onChangeText={setMaxUses}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Section 4: Expiration & Presets */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expiration Date</Text>

          <View style={styles.presetRow}>
            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setExpiryDays(7)}
            >
              <Text style={styles.presetBtnText}>+7 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setExpiryDays(30)}
            >
              <Text style={styles.presetBtnText}>+30 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setExpiryDays(90)}
            >
              <Text style={styles.presetBtnText}>+90 Days</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.presetBtn}
              onPress={() => setExpiresAt('')}
            >
              <Text style={styles.presetBtnText}>No Expiry</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Custom Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            value={expiresAt}
            onChangeText={setExpiresAt}
          />
        </View>

        {/* Section 5: Activation Status */}
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchTitle}>Enable Coupon Immediately</Text>
              <Text style={styles.switchSubtitle}>
                Customers can apply this coupon as soon as it is created
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
              thumbColor={isActive ? '#0284c7' : '#f1f5f9'}
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            createMutation.isPending && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          activeOpacity={0.85}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Coupon</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerLeft: {
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
  saveHeaderBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  saveHeaderBtnDisabled: {
    opacity: 0.7,
  },
  saveHeaderBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
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
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  codeInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#0284c7',
    backgroundColor: '#f0f9ff',
    letterSpacing: 0.8,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284c7',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeOptionActive: {
    backgroundColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeOptionTextActive: {
    color: '#ffffff',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    height: 48,
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    height: '100%',
  },
  amountUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 8,
  },
  mt12: {
    marginTop: 12,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: '85%',
  },
  submitButton: {
    backgroundColor: '#0284c7',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

