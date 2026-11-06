import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface StatusBadgeProps {
  status?: string;
  size?: 'sm' | 'md';
}

interface StatusConfig {
  label: string;
  bgLight: string;
  textLight: string;
  bgDark: string;
  textDark: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  pending: {
    label: 'Pending',
    bgLight: '#fef3c7',
    textLight: '#b45309',
    bgDark: '#451a03',
    textDark: '#fbbf24',
  },
  processing: {
    label: 'Processing',
    bgLight: '#e0f2fe',
    textLight: '#0369a1',
    bgDark: '#082f49',
    textDark: '#38bdf8',
  },
  confirmed: {
    label: 'Confirmed',
    bgLight: '#e0e7ff',
    textLight: '#4338ca',
    bgDark: '#1e1b4b',
    textDark: '#818cf8',
  },
  packaging: {
    label: 'Packaging',
    bgLight: '#f3e8ff',
    textLight: '#7e22ce',
    bgDark: '#3b0764',
    textDark: '#c084fc',
  },
  shipped: {
    label: 'Shipped',
    bgLight: '#dbeafe',
    textLight: '#1d4ed8',
    bgDark: '#172554',
    textDark: '#60a5fa',
  },
  delivered: {
    label: 'Delivered',
    bgLight: '#dcfce7',
    textLight: '#15803d',
    bgDark: '#052e16',
    textDark: '#4ade80',
  },
  completed: {
    label: 'Completed',
    bgLight: '#dcfce7',
    textLight: '#15803d',
    bgDark: '#052e16',
    textDark: '#4ade80',
  },
  cancelled: {
    label: 'Cancelled',
    bgLight: '#fee2e2',
    textLight: '#b91c1c',
    bgDark: '#450a0a',
    textDark: '#f87171',
  },
  return: {
    label: 'Return',
    bgLight: '#ffedd5',
    textLight: '#c2410c',
    bgDark: '#431407',
    textDark: '#fb923c',
  },
  on_hold: {
    label: 'On Hold',
    bgLight: '#ffedd5',
    textLight: '#c2410c',
    bgDark: '#431407',
    textDark: '#fb923c',
  },
  abandoned: {
    label: 'Abandoned',
    bgLight: '#fef3c7',
    textLight: '#b45309',
    bgDark: '#451a03',
    textDark: '#fbbf24',
  },
  recovered: {
    label: 'Recovered',
    bgLight: '#dcfce7',
    textLight: '#15803d',
    bgDark: '#052e16',
    textDark: '#4ade80',
  },
};

export default function StatusBadge({ status = 'pending', size = 'sm' }: StatusBadgeProps) {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const config = STATUS_MAP[normalized] || {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    bgLight: '#f1f5f9',
    textLight: '#475569',
    bgDark: '#27272a',
    textDark: '#a1a1aa',
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: config.bgLight },
      ]}
    >
      <Text
        style={[
          styles.text,
          isSmall ? styles.textSm : styles.textMd,
          { color: config.textLight },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  badgeMd: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10.5,
  },
  textMd: {
    fontSize: 12,
  },
});
