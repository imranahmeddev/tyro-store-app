import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface MiniSparklineProps {
  color?: string;
  width?: number;
  height?: number;
}

export default function MiniSparkline({
  color = '#22c55e',
  width = 48,
  height = 18,
}: MiniSparklineProps) {
  // Classic rising upward trend path matching Screenshot 1
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 50 20">
        <Path
          d="M 2 16 L 14 15 L 24 10 L 30 14 L 38 7 L 48 10"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

