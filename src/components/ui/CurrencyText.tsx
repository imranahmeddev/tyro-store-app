import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';

export interface CurrencyTextProps {
  amount?: number | string | null;
  currencySymbol?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  color?: string;
  weight?: 'normal' | '500' | '600' | '700' | '800';
  style?: TextStyle;
}

export function formatBanglaCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-IN');
}

export default function CurrencyText({
  amount = 0,
  currencySymbol = '৳',
  size = 'md',
  color,
  weight = '700',
  style,
}: CurrencyTextProps) {
  const formatted = formatBanglaCurrency(amount);

  return (
    <Text
      style={[
        styles.base,
        styles[size],
        { fontWeight: weight },
        color ? { color } : undefined,
        style,
      ]}
      numberOfLines={1}
    >
      <Text style={styles.symbol}>{currencySymbol} </Text>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  symbol: {
    fontWeight: '600',
    opacity: 0.9,
  },
  xs: {
    fontSize: 11,
  },
  sm: {
    fontSize: 13,
  },
  md: {
    fontSize: 15,
  },
  lg: {
    fontSize: 18,
  },
  hero: {
    fontSize: 26,
    letterSpacing: -0.5,
  },
});

