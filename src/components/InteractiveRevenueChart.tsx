import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  G,
} from 'react-native-svg';

export interface TimelineDataPoint {
  label: string;
  key: string;
  revenue: number;
  orders?: number;
}

interface InteractiveRevenueChartProps {
  data: TimelineDataPoint[];
  currencySymbol?: string;
  height?: number;
  accentColor?: string;
  isDark?: boolean;
}

function formatCompact(val: number, symbol: string = '৳'): string {
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}Cr${symbol}`;
  if (val >= 100000) return `${(val / 100000).toFixed(1)}L${symbol}`;
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k${symbol}`;
  return `${Math.round(val)}${symbol}`;
}

export default function InteractiveRevenueChart({
  data,
  currencySymbol = '৳',
  height = 200,
  accentColor = '#8b5cf6', // WooCommerce Signature Purple
  isDark = true,
}: InteractiveRevenueChartProps) {
  const [chartWidth, setChartWidth] = useState(320);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const paddingLeft = 52;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 28;

  const contentWidth = Math.max(10, chartWidth - paddingLeft - paddingRight);
  const contentHeight = Math.max(10, height - paddingTop - paddingBottom);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== chartWidth) {
      setChartWidth(width);
    }
  };

  const { maxRevenue, points, yMaxLabel, yMidLabel } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxRevenue: 100, points: [], yMaxLabel: `100${currencySymbol}`, yMidLabel: `50${currencySymbol}` };
    }

    const revenues = data.map((d) => Number(d.revenue) || 0);
    const max = Math.max(...revenues, 10);
    const min = 0;

    const count = data.length;
    const pts = data.map((d, i) => {
      const x =
        count === 1
          ? paddingLeft + contentWidth / 2
          : paddingLeft + (i / (count - 1)) * contentWidth;
      const normalizedY = (Number(d.revenue) - min) / (max - min);
      const y = paddingTop + contentHeight - normalizedY * contentHeight;
      return { x, y, data: d };
    });

    return {
      maxRevenue: max,
      points: pts,
      yMaxLabel: formatCompact(max, currencySymbol),
      yMidLabel: formatCompact(max / 2, currencySymbol),
    };
  }, [data, contentWidth, contentHeight, chartWidth, currencySymbol]);

  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      const p = points[0];
      const line = `M ${paddingLeft} ${p.y} L ${chartWidth - paddingRight} ${p.y}`;
      const area = `M ${paddingLeft} ${p.y} L ${chartWidth - paddingRight} ${p.y} L ${chartWidth - paddingRight} ${paddingTop + contentHeight} L ${paddingLeft} ${paddingTop + contentHeight} Z`;
      return { linePath: line, areaPath: area };
    }

    let line = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const cpX = (current.x + next.x) / 2;
      line += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = points[points.length - 1];
    const area = `${line} L ${last.x} ${paddingTop + contentHeight} L ${points[0].x} ${paddingTop + contentHeight} Z`;

    return { linePath: line, areaPath: area };
  }, [points, chartWidth, contentHeight]);

  const findClosestIndex = (touchX: number): number => {
    if (points.length === 0) return 0;
    let closestIndex = 0;
    let minDiff = Infinity;
    for (let i = 0; i < points.length; i++) {
      const diff = Math.abs(points[i].x - touchX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const idx = findClosestIndex(evt.nativeEvent.locationX);
          setActiveIndex(idx);
        },
        onPanResponderMove: (evt: GestureResponderEvent) => {
          const idx = findClosestIndex(evt.nativeEvent.locationX);
          setActiveIndex(idx);
        },
        onPanResponderRelease: () => {
          setTimeout(() => setActiveIndex(null), 1500);
        },
        onPanResponderTerminate: () => {
          setActiveIndex(null);
        },
      }),
    [points]
  );

  const activePoint = activeIndex !== null && points[activeIndex] ? points[activeIndex] : null;

  const gridLineColor = isDark ? '#27272a' : '#e2e8f0';
  const labelColor = isDark ? '#71717a' : '#94a3b8';

  // Display 4-5 evenly distributed X-axis ticks
  const xTicks = useMemo(() => {
    if (data.length <= 5) return data;
    const step = Math.floor((data.length - 1) / 4);
    const ticks: TimelineDataPoint[] = [];
    for (let i = 0; i < data.length; i += step) {
      ticks.push(data[i]);
      if (ticks.length === 5) break;
    }
    if (ticks[ticks.length - 1] !== data[data.length - 1]) {
      ticks[ticks.length - 1] = data[data.length - 1];
    }
    return ticks;
  }, [data]);

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      {/* Floating Scrubbing Tooltip */}
      {activePoint ? (
        <View
          style={[
            styles.tooltipBox,
            {
              left: Math.max(
                paddingLeft,
                Math.min(chartWidth - 110, activePoint.x - 50)
              ),
              backgroundColor: isDark ? '#27272a' : '#0f172a',
            },
          ]}
        >
          <Text style={styles.tooltipLabel}>{activePoint.data.label}</Text>
          <Text style={styles.tooltipAmount}>
            {currencySymbol} {Number(activePoint.data.revenue).toLocaleString()}
          </Text>
        </View>
      ) : null}

      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="wooPurpleGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={accentColor} stopOpacity={isDark ? "0.35" : "0.22"} />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal Grid Line 1 (Upper Y-Max) */}
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={chartWidth - paddingRight}
          y2={paddingTop}
          stroke={gridLineColor}
          strokeWidth="1"
        />

        {/* Horizontal Grid Line 2 (Mid Y-Mid) */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + contentHeight / 2}
          x2={chartWidth - paddingRight}
          y2={paddingTop + contentHeight / 2}
          stroke={gridLineColor}
          strokeWidth="1"
        />

        {/* Horizontal Grid Line 3 (Bottom Baseline) */}
        <Line
          x1={paddingLeft}
          y1={paddingTop + contentHeight}
          x2={chartWidth - paddingRight}
          y2={paddingTop + contentHeight}
          stroke={gridLineColor}
          strokeWidth="1"
        />

        {/* Gradient Fill Under Line */}
        {areaPath ? <Path d={areaPath} fill="url(#wooPurpleGrad)" /> : null}

        {/* Purple Cubic Bezier Line */}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Scrubbing Guideline & Dot */}
        {activePoint ? (
          <G>
            <Line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={paddingTop + contentHeight}
              stroke={accentColor}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <Circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="6.5"
              fill={accentColor}
              stroke="#ffffff"
              strokeWidth="2.5"
            />
          </G>
        ) : null}
      </Svg>

      {/* Y-Axis Value Labels on Left Grid Lines */}
      <View style={[styles.yAxisLabels, { height: contentHeight, top: paddingTop }]}>
        <Text style={[styles.axisText, { color: labelColor }]}>{yMaxLabel}</Text>
        <Text style={[styles.axisText, { color: labelColor }]}>{yMidLabel}</Text>
      </View>

      {/* X-Axis Month / Date Labels */}
      {xTicks.length > 0 && (
        <View style={[styles.xAxisRow, { left: paddingLeft, right: paddingRight }]}>
          {xTicks.map((tick, idx) => (
            <Text key={idx} style={[styles.axisText, { color: labelColor }]}>
              {tick.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
    marginTop: 8,
  },
  tooltipBox: {
    position: 'absolute',
    top: 2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 10,
  },
  tooltipLabel: {
    fontSize: 10,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  tooltipAmount: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 1,
  },
  yAxisLabels: {
    position: 'absolute',
    left: 4,
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  xAxisRow: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
