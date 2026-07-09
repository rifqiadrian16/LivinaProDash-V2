import React, { memo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useAppTheme } from "../../components/AppThemeContext";
import { GaugeLayout } from "../../constants/gaugeThemes";

const REDLINE_COLOR = "#FF3B30";
const TICK_LABEL_WIDTH = 22;

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
  radius: number;
  layout: GaugeLayout;
  glow?: boolean;
  grid?: boolean;
  fontFamily?: string;
  style?: any;
  // TAMBAHAN: dipakai khusus mode "arc" gabungan (Classic Arc portrait) —
  // menampilkan angka kecil (mis. Speed) di dalam gauge, tanpa gauge kedua.
  insetValue?: number | string;
  insetUnit?: string;
  tickFontSizeFactor?: number;
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
    insetValue,
    insetUnit,
    tickFontSizeFactor,
  }: GaugeUnitProps) => {
    const { width, height } = useWindowDimensions();
    const isTabletLandscape = width > height && height >= 480;

    const safeValue = Math.min(Math.max(value, 0), max);
    const isRedline = redlineFrom !== undefined && value >= redlineFrom;
    const displayValue =
      decimals > 0 ? value.toFixed(decimals) : Math.round(value);
    const activeColor = isRedline ? REDLINE_COLOR : color;
    const activeNeedle = isRedline ? REDLINE_COLOR : needleColor;

    const { isDark } = useAppTheme();
    const trackBg = isDark ? "#1a1a1a" : "#E5E5EA"; // Lintasan abu-abu
    const panelBg = isDark ? "#050505" : "#FFFFFF"; // Kotak Digital
    const borderColor = isDark ? "#222" : "#D1D1D6"; // Garis luar Digital
    const textColor = isDark ? "#fff" : "#1C1C1E"; // Teks Angka Utama
    const subText = isDark ? "#cccccc" : "#8E8E93"; // Teks Label/Tick
    const gradMid1 = isDark ? "rgb(245, 233, 184)" : color; // Di Light Mode, pertahankan warna utama lebih lama
    const gradMid2 = isDark ? "#FF9900" : "#C0392B"; // Dark: Oren. Light: Merah Bata (Crimson)
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    // =========================================================
    // LAYOUT: ARC — setengah lingkaran + jarum (gaya lama/klasik)
    // =========================================================
    if (layout === "arc") {
      const size = radius * 2 + 40;
      const cx = size / 2;
      const cy = size / 2;
      const strokeWidth = Math.max(3, radius * 0.055);
      const startAngle = -90;
      const sweepAngle = 180;
      const endAngle = startAngle + (safeValue / max) * sweepAngle;
      const redlineStartAngle =
        redlineFrom !== undefined
          ? startAngle + (redlineFrom / max) * sweepAngle
          : undefined;

      const isHpLandscape = width > height && height < 480;
      const minFontSize = isHpLandscape ? 7 : 9;
      const fontFactor = isHpLandscape ? 0.065 : 0.1;

      const tickFontSize = Math.max(
        minFontSize,
        radius * (tickFontSizeFactor ?? fontFactor),
      );
      // 👆 SAMPAI SINI
      const needleLen = radius - 12;

      // ✅ GRADASI: sama seperti tema Full Ring — putih/warna dasar → oren → merah
      // di redline. Hanya dipasang kalau gauge ini punya redline (RPM),
      // gauge tanpa redline (Speed) tetap solid color seperti biasa.
      const hasRedline = redlineFrom !== undefined;
      const arcGradId = `arc-grad-${unitLabel}`;

      return (
        <View style={[styles.cluster, style]}>
          <Svg width={size} height={size / 2 + 26}>
            {hasRedline && (
              <Defs>
                {/* userSpaceOnUse + koordinat FIX (bukan relatif ke path
                yang sedang tumbuh) supaya warna di posisi X tertentu selalu
                sama persis, tidak "meregang" waktu jarum masih pendek. */}
                <LinearGradient
                  id={arcGradId}
                  x1={cx - radius}
                  y1={cy}
                  x2={cx + radius}
                  y2={cy}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%" stopColor={color} stopOpacity="1" />
                  <Stop offset="25%" stopColor={gradMid1} stopOpacity="1" />
                  <Stop offset="50%" stopColor={gradMid2} stopOpacity="1" />
                  <Stop offset="80%" stopColor="#FF3B30" stopOpacity="1" />
                  <Stop
                    offset="100%"
                    stopColor={REDLINE_COLOR}
                    stopOpacity="1"
                  />
                </LinearGradient>
              </Defs>
            )}
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
                    fill={isRedZone ? REDLINE_COLOR : subText}
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
              stroke={trackBg}
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
                stroke={hasRedline ? `url(#${arcGradId})` : activeColor}
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

            {/* ✅ TAMBAHAN: angka kecil (mis. Speed) di ruang kosong bawah
            pivot jarum — jarum semi-circle ini hanya menyapu bagian ATAS
            (angle -90..+90 dari titik atas), jadi area bawah pivot aman
            dipakai untuk insert digital kecil tanpa ketiban jarum. */}
            {insetValue !== undefined && insetValue !== null && (
              <SvgText
                x={cx}
                y={cy - radius * 0.32}
                fill={textColor}
                fontSize={40}
                fontWeight="900"
                textAnchor="middle"
              >
                {insetValue}
                {insetUnit ? ` ${insetUnit}` : ""}
              </SvgText>
            )}
          </Svg>
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
      const redlineProgress =
        redlineFrom !== undefined ? redlineFrom / max : undefined;

      // 1. Logika Pembelahan Semicircle (Kanan & Kiri)
      const isRpmGauge = redlineFrom !== undefined;
      const gradRightId = `grad-right-${unitLabel}`;
      const gradLeftId = `grad-left-${unitLabel}`;

      // Progress untuk setengah lingkaran kanan (Jam 12 ke Jam 6) — maksimal 0.5 (50%)
      const progRight = Math.min(progress, 0.5);
      const dashOffsetRight = circumference * (1 - progRight);

      // Progress untuk setengah lingkaran kiri (Jam 6 ke Jam 12) — aktif jika progress > 50%
      const progLeft = progress > 0.5 ? progress - 0.5 : 0;
      const dashOffsetLeft = circumference * (1 - progLeft);

      return (
        <View style={[styles.cluster, style]}>
          <View style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              {/* 2. Definisi 2 Gradasi (Kanan: Putih->Oren, Kiri: Oren->Merah) */}
              {isRpmGauge && (
                <Defs>
                  {/* Gradasi Kanan: Menyapu dari Jam 12 (Putih) ke Jam 6 (Oren) */}
                  <LinearGradient
                    id={gradRightId}
                    x1="100%"
                    y1="0%"
                    x2="0%"
                    y2="0%"
                  >
                    <Stop offset="0%" stopColor={color} stopOpacity="1" />
                    <Stop offset="50%" stopColor={gradMid1} stopOpacity="1" />
                    <Stop offset="100%" stopColor={gradMid2} stopOpacity="1" />
                  </LinearGradient>

                  {/* Gradasi Kiri: Menyapu dari Jam 6 (Oren) ke Redline (Merah) */}
                  <LinearGradient
                    id={gradLeftId}
                    x1="100%"
                    y1="0%"
                    x2="0%"
                    y2="0%"
                  >
                    <Stop offset="0%" stopColor={gradMid2} stopOpacity="1" />
                    <Stop offset="60%" stopColor="#FF3B30" stopOpacity="1" />
                    <Stop
                      offset="100%"
                      stopColor={REDLINE_COLOR}
                      stopOpacity="1"
                    />
                  </LinearGradient>
                </Defs>
              )}

              {/* 3. Background Track Hitam & Redline Zone */}
              <G transform={`rotate(-90, ${cx}, ${cy})`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke={trackBg}
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
              </G>

              {/* 4. Semicircle KANAN (Jam 12 ke Jam 6) */}
              {progress > 0 && (
                <G transform={`rotate(-90, ${cx}, ${cy})`}>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={isRpmGauge ? `url(#${gradRightId})` : activeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffsetRight}
                    strokeLinecap="round"
                  />
                </G>
              )}

              {/* 5. Semicircle KIRI (Jam 6 ke Jam 12) — Aktif setelah 50% RPM */}
              {progress > 0.5 && (
                <G transform={`rotate(90, ${cx}, ${cy})`}>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={isRpmGauge ? `url(#${gradLeftId})` : activeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={dashOffsetLeft}
                    strokeLinecap="round"
                  />
                </G>
              )}
            </Svg>

            <View style={[StyleSheet.absoluteFillObject, styles.ringCenter]}>
              <Text
                style={[
                  styles.valueDigitsRing,
                  { color: isRedline ? REDLINE_COLOR : textColor },
                  glow &&
                    isDark && {
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
      const barHeight = 10;
      const progress = safeValue / max;
      const hasRedline = redlineFrom !== undefined;
      const redlineProgress = hasRedline ? redlineFrom! / max : undefined;
      const barGradId = `bar-grad-${unitLabel}`;

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
          {/* ✅ GRADASI: sama seperti tema Full Ring & Classic Arc — putih/warna
          dasar → oren → merah di redline. userSpaceOnUse dgn koordinat FIX
          (0 s/d barWidth) supaya warna di posisi X tertentu konsisten,
          tidak "meregang" waktu bar masih pendek. */}
          <Svg width={barWidth} height={barHeight}>
            {hasRedline && (
              <Defs>
                <LinearGradient
                  id={barGradId}
                  x1={0}
                  y1={0}
                  x2={barWidth}
                  y2={0}
                  gradientUnits="userSpaceOnUse"
                >
                  <Stop offset="0%" stopColor={color} stopOpacity="1" />
                  <Stop offset="25%" stopColor={gradMid1} stopOpacity="1" />
                  <Stop offset="50%" stopColor={gradMid2} stopOpacity="1" />
                  <Stop offset="80%" stopColor="#FF3B30" stopOpacity="1" />
                  <Stop
                    offset="100%"
                    stopColor={REDLINE_COLOR}
                    stopOpacity="1"
                  />
                </LinearGradient>
              </Defs>
            )}
            <Rect
              x={0}
              y={0}
              width={barWidth}
              height={barHeight}
              rx={barHeight / 2}
              fill={trackBg}
            />
            {redlineProgress !== undefined && (
              <Rect
                x={redlineProgress * barWidth}
                y={0}
                width={barWidth * (1 - redlineProgress)}
                height={barHeight}
                fill="rgba(255,59,48,0.15)"
              />
            )}
            {progress > 0 && (
              <Rect
                x={0}
                y={0}
                width={progress * barWidth}
                height={barHeight}
                rx={barHeight / 2}
                fill={hasRedline ? `url(#${barGradId})` : activeColor}
              />
            )}
          </Svg>
          {/* ✅ FIX: tiap label tick dikasih flex:1 + alignment kiri/tengah/
          kanan sesuai posisinya, supaya "0 1 2 3 4 5 6 7 8" sejajar rapi
          dengan track di bawahnya dan angka ujung tidak kepotong/mepet. */}
          <View style={[styles.barTicksRow, { width: barWidth }]}>
            {tickValues.map((t, i) => {
              const pct = t / max;
              const rawLeft = pct * barWidth - TICK_LABEL_WIDTH / 2;
              const clampedLeft = Math.max(
                0,
                Math.min(rawLeft, barWidth - TICK_LABEL_WIDTH),
              );
              return (
                <Text
                  key={i}
                  style={[
                    styles.barTickText,
                    {
                      position: "absolute",
                      left: clampedLeft,
                      width: TICK_LABEL_WIDTH,
                      textAlign: "center",
                    },
                  ]}
                >
                  {t >= 1000 ? t / 1000 : t}
                </Text>
              );
            })}
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
            borderColor: isRedline ? REDLINE_COLOR : borderColor, // ✅
            backgroundColor: panelBg,
            paddingVertical: isTabletLandscape ? 40 : 12,
          },
          style,
        ]}
      >
        {grid && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {[...Array(4)].map((_, i) => (
              <View
                key={`h-${i}`}
                style={[
                  styles.gridLineH,
                  { top: `${(i + 1) * 20}%`, backgroundColor: gridColor },
                ]}
              />
            ))}
            {[...Array(4)].map((_, i) => (
              <View
                key={`v-${i}`}
                style={[
                  styles.gridLineV,
                  { left: `${(i + 1) * 20}%`, backgroundColor: gridColor },
                ]}
              />
            ))}
          </View>
        )}

        {/* JARAK JUDUL DINAMIS */}
        <Text
          style={[
            styles.digitalTitle,
            isTabletLandscape && { marginBottom: 12 },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.digitalValue,
            { color: isRedline ? REDLINE_COLOR : textColor, fontFamily },
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

        {/* JARAK GARIS BAWAH DINAMIS */}
        <View
          style={[
            styles.digitalBarTrack,
            { backgroundColor: trackBg },
            isTabletLandscape && { marginTop: 24 },
          ]}
        >
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
  valueBlock: { alignItems: "center", marginTop: -4 },
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
    position: "relative",
    height: 12,
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
