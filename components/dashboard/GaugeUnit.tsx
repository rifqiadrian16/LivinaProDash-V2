import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
    Circle,
    G,
    Line,
    Path,
    Polygon,
    Text as SvgText,
} from "react-native-svg";
import { GaugeLayout } from "../../constants/gaugeThemes";

const REDLINE_COLOR = "#FF3B30";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  start: number,
  end: number,
  r: number,
) {
  const s = polarToCartesian(cx, cy, r, start);
  const e = polarToCartesian(cx, cy, r, end);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}

interface GaugeUnitProps {
  value: number;
  max: number;
  redlineFrom?: number;
  tickValues: number[];
  decimals?: number;
  unitLabel: string;
  title: string;
  color: string;
  needleColor: string;
  radius: number; // ukuran dasar (basis untuk semua layout, bukan cuma lingkaran)
  layout: GaugeLayout;
  glow?: boolean;
  grid?: boolean;
  fontFamily?: string;
  style?: any;
}

const GaugeUnit = memo(
  ({
    value,
    max,
    redlineFrom,
    tickValues,
    decimals = 0,
    unitLabel,
    title,
    color,
    needleColor,
    radius,
    layout,
    glow = false,
    grid = false,
    fontFamily,
    style,
  }: GaugeUnitProps) => {
    const safeValue = Math.min(Math.max(value, 0), max);
    const isRedline = redlineFrom !== undefined && value >= redlineFrom;
    const displayValue =
      decimals > 0 ? value.toFixed(decimals) : Math.round(value);
    const activeColor = isRedline ? REDLINE_COLOR : color;
    const activeNeedle = isRedline ? REDLINE_COLOR : needleColor;

    // =========================================================
    // LAYOUT: ARC — setengah lingkaran + jarum (gaya lama/klasik)
    // =========================================================
    if (layout === "arc") {
      const size = radius * 2 + 40;
      const cx = size / 2;
      const cy = size / 2;
      const strokeWidth = Math.max(3, radius * 0.035);
      const startAngle = -90;
      const sweepAngle = 180;
      const endAngle = startAngle + (safeValue / max) * sweepAngle;
      const redlineStartAngle =
        redlineFrom !== undefined
          ? startAngle + (redlineFrom / max) * sweepAngle
          : undefined;
      const tickFontSize = Math.max(9, radius * 0.1);
      const needleLen = radius - 12;

      return (
        <View style={[styles.cluster, style]}>
          <Svg width={size} height={size * 0.62 + 10}>
            {tickValues.map((t, i) => {
              const rot = startAngle + (t / max) * sweepAngle;
              const isRedZone = redlineFrom !== undefined && t >= redlineFrom;
              const innerP = polarToCartesian(
                cx,
                cy,
                radius - radius * 0.08,
                rot,
              );
              const outerP = polarToCartesian(cx, cy, radius, rot);
              const textP = polarToCartesian(
                cx,
                cy,
                radius - radius * 0.24,
                rot,
              );
              const label = t >= 1000 ? t / 1000 : t;
              return (
                <G key={i}>
                  <Line
                    x1={innerP.x}
                    y1={innerP.y}
                    x2={outerP.x}
                    y2={outerP.y}
                    stroke={isRedZone ? REDLINE_COLOR : "#888888"}
                    strokeWidth={2}
                  />
                  <SvgText
                    x={textP.x}
                    y={textP.y}
                    fill={isRedZone ? REDLINE_COLOR : "#cccccc"}
                    fontSize={tickFontSize}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {label}
                  </SvgText>
                </G>
              );
            })}
            <Path
              d={arcPath(cx, cy, startAngle, startAngle + sweepAngle, radius)}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {redlineStartAngle !== undefined && (
              <Path
                d={arcPath(
                  cx,
                  cy,
                  redlineStartAngle,
                  startAngle + sweepAngle,
                  radius,
                )}
                fill="none"
                stroke={REDLINE_COLOR}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            )}
            {safeValue > 0 && (
              <Path
                d={arcPath(cx, cy, startAngle, endAngle, radius)}
                fill="none"
                stroke={activeColor}
                strokeWidth={strokeWidth + 1}
                strokeLinecap="round"
              />
            )}
            <G transform={`rotate(${endAngle}, ${cx}, ${cy})`}>
              <Polygon
                points={`${cx - 2},${cy} ${cx},${cy - needleLen} ${cx + 2},${cy} ${cx},${cy + 14}`}
                fill={activeNeedle}
              />
              <Circle
                cx={cx}
                cy={cy}
                r={Math.max(5, radius * 0.05)}
                fill={activeNeedle}
              />
              <Circle cx={cx} cy={cy} r={2} fill="#000" />
            </G>
          </Svg>
          <View style={styles.valueBlock}>
            <Text
              style={[
                styles.valueDigits,
                { color: isRedline ? REDLINE_COLOR : "#fff" },
              ]}
            >
              {displayValue}
            </Text>
            <Text style={styles.valueUnit}>{unitLabel}</Text>
          </View>
          <Text style={styles.gaugeTitle}>{title}</Text>
        </View>
      );
    }

    // =========================================================
    // LAYOUT: RING — lingkaran penuh 360°, progress donut
    // =========================================================
    if (layout === "ring") {
      const size = radius * 2 + 24;
      const cx = size / 2;
      const cy = size / 2;
      const strokeWidth = Math.max(6, radius * 0.09);
      const circumference = 2 * Math.PI * radius;
      const progress = safeValue / max;
      const dashOffset = circumference * (1 - progress);
      const redlineProgress =
        redlineFrom !== undefined ? redlineFrom / max : undefined;

      return (
        <View style={[styles.cluster, style]}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              <G rotation={-90} originX={cx} originY={cy}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke="#1a1a1a"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                {redlineProgress !== undefined && (
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={REDLINE_COLOR}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference * (1 - redlineProgress)} ${circumference}`}
                    strokeDashoffset={-circumference * redlineProgress}
                    strokeLinecap="round"
                  />
                )}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={activeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
            <View style={[StyleSheet.absoluteFillObject, styles.ringCenter]}>
              <Text
                style={[
                  styles.valueDigitsRing,
                  { color: isRedline ? REDLINE_COLOR : "#fff" },
                  glow && {
                    textShadowColor: activeColor,
                    textShadowRadius: 12,
                    textShadowOffset: { width: 0, height: 0 },
                  },
                ]}
              >
                {displayValue}
              </Text>
              <Text style={styles.valueUnit}>{unitLabel}</Text>
            </View>
          </View>
          <Text style={styles.gaugeTitle}>{title}</Text>
        </View>
      );
    }

    // =========================================================
    // LAYOUT: BAR — linear minimalis, tanpa lingkaran
    // =========================================================
    if (layout === "bar") {
      const barWidth = radius * 2.2;
      const progress = safeValue / max;
      const redlineProgress =
        redlineFrom !== undefined ? redlineFrom / max : undefined;

      return (
        <View style={[styles.cluster, { width: barWidth }, style]}>
          <View style={styles.barHeaderRow}>
            <Text style={styles.barTitle}>{title}</Text>
            <Text
              style={[
                styles.barValue,
                { color: isRedline ? REDLINE_COLOR : color },
              ]}
            >
              {displayValue}
              <Text style={styles.valueUnit}> {unitLabel}</Text>
            </Text>
          </View>
          <View style={[styles.barTrack, { width: barWidth }]}>
            {redlineProgress !== undefined && (
              <View
                style={[
                  styles.barRedlineZone,
                  { left: `${redlineProgress * 100}%`, right: 0 },
                ]}
              />
            )}
            <View
              style={[
                styles.barFill,
                { width: `${progress * 100}%`, backgroundColor: activeColor },
              ]}
            />
          </View>
          <View style={styles.barTicksRow}>
            {tickValues.map((t, i) => (
              <Text key={i} style={styles.barTickText}>
                {t >= 1000 ? t / 1000 : t}
              </Text>
            ))}
          </View>
        </View>
      );
    }

    // =========================================================
    // LAYOUT: DIGITAL — panel LCD, angka besar + grid/glow opsional
    // =========================================================
    const panelWidth = radius * 2.2;
    const progress = safeValue / max;
    return (
      <View
        style={[
          styles.digitalPanel,
          {
            width: panelWidth,
            borderColor: isRedline ? REDLINE_COLOR : "#222",
          },
          style,
        ]}
      >
        {grid && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {[...Array(4)].map((_, i) => (
              <View
                key={`h-${i}`}
                style={[styles.gridLineH, { top: `${(i + 1) * 20}%` }]}
              />
            ))}
            {[...Array(4)].map((_, i) => (
              <View
                key={`v-${i}`}
                style={[styles.gridLineV, { left: `${(i + 1) * 20}%` }]}
              />
            ))}
          </View>
        )}
        <Text style={styles.digitalTitle}>{title}</Text>
        <Text
          style={[
            styles.digitalValue,
            { color: isRedline ? REDLINE_COLOR : color, fontFamily },
            glow && {
              textShadowColor: isRedline ? REDLINE_COLOR : color,
              textShadowRadius: 14,
              textShadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          {displayValue}
          <Text style={styles.digitalUnit}> {unitLabel}</Text>
        </Text>
        <View style={styles.digitalBarTrack}>
          <View
            style={[
              styles.digitalBarFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isRedline ? REDLINE_COLOR : color,
              },
            ]}
          />
        </View>
      </View>
    );
  },
);

export default GaugeUnit;

const styles = StyleSheet.create({
  cluster: { alignItems: "center" },
  valueBlock: { alignItems: "center", marginTop: 4 },
  valueDigits: {
    fontSize: 36,
    fontWeight: "200",
    lineHeight: 40,
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  valueDigitsRing: {
    fontSize: 30,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  valueUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 2,
    marginTop: 2,
  },
  gaugeTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#555555",
    letterSpacing: 3,
    marginTop: 4,
  },
  ringCenter: { alignItems: "center", justifyContent: "center" },

  barHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 6,
  },
  barTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666",
    letterSpacing: 2,
  },
  barValue: { fontSize: 16, fontWeight: "900" },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1a1a1a",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 5 },
  barRedlineZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,59,48,0.15)",
  },
  barTicksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  barTickText: { fontSize: 8, color: "#444", fontWeight: "bold" },

  digitalPanel: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#050505",
    alignItems: "center",
    overflow: "hidden",
  },
  digitalTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#555",
    letterSpacing: 3,
    marginBottom: 4,
  },
  digitalValue: {
    fontSize: 32,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  digitalUnit: { fontSize: 11, color: "#666", fontWeight: "bold" },
  digitalBarTrack: {
    height: 4,
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  digitalBarFill: { height: "100%" },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
