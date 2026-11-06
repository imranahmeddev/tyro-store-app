import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Linking,
  ViewStyle,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Phone, MessageCircle, Copy, Check, ExternalLink } from 'lucide-react-native';

export interface QuickActionButtonProps {
  type: 'call' | 'whatsapp' | 'copy' | 'custom';
  phone?: string | null;
  textToCopy?: string | null;
  message?: string;
  label?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function QuickActionButton({
  type,
  phone,
  textToCopy,
  message,
  label,
  onPress,
  style,
}: QuickActionButtonProps) {
  const [copied, setCopied] = useState(false);

  const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    if (type === 'call') {
      if (!cleanPhone) return;
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
      return;
    }

    if (type === 'whatsapp') {
      if (!cleanPhone) return;
      let digits = cleanPhone.replace(/[^0-9]/g, '');
      if (!digits.startsWith('88') && digits.length === 11) {
        digits = '88' + digits;
      }
      const encodedMsg = message ? encodeURIComponent(message) : '';
      const url = `https://wa.me/${digits}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
      Linking.openURL(url).catch(() => {});
      return;
    }

    if (type === 'copy') {
      const target = textToCopy || phone || '';
      if (!target) return;
      await Clipboard.setStringAsync(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
  };

  if (type === 'call') {
    return (
      <TouchableOpacity
        style={[styles.btn, styles.callBtn, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Phone size={12} color="#15803d" />
        <Text style={[styles.text, styles.callText]}>{label || 'Call'}</Text>
      </TouchableOpacity>
    );
  }

  if (type === 'whatsapp') {
    return (
      <TouchableOpacity
        style={[styles.btn, styles.waBtn, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <MessageCircle size={12} color="#059669" />
        <Text style={[styles.text, styles.waText]}>{label || 'WhatsApp'}</Text>
      </TouchableOpacity>
    );
  }

  if (type === 'copy') {
    return (
      <TouchableOpacity
        style={[styles.btn, copied ? styles.copiedBtn : styles.copyBtn, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {copied ? (
          <Check size={12} color="#15803d" />
        ) : (
          <Copy size={12} color="#0284c7" />
        )}
        <Text style={[styles.text, copied ? styles.copiedText : styles.copyText]}>
          {copied ? 'Copied' : label || 'Copy'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.btn, styles.customBtn, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>{label || 'Action'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
  },
  text: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  callBtn: {
    backgroundColor: '#dcfce7',
  },
  callText: {
    color: '#15803d',
  },
  waBtn: {
    backgroundColor: '#d1fae5',
  },
  waText: {
    color: '#059669',
  },
  copyBtn: {
    backgroundColor: '#e0f2fe',
  },
  copyText: {
    color: '#0284c7',
  },
  copiedBtn: {
    backgroundColor: '#dcfce7',
  },
  copiedText: {
    color: '#15803d',
  },
  customBtn: {
    backgroundColor: '#f1f5f9',
  },
});

