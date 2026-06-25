import React, { memo, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import { useGearRatio } from "../../hooks/useGearRatio";

interface LandscapeGaugesProps {
  speed: number;
  rpm: number;
  transmission?: string;
}

// ============================================================
// Helper geometri arc — IDENTIK dengan yang dipakai MainGauges.tsx
// (portrait) supaya kedua gauge punya "bahasa visual" yang sama.
// ============================================================
function polarToCartesian(
  centerX: number,
  centerY: number,
  r: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + r * Math.cos(angleInRadians),
    y: centerY + r * Math.sin(angleInRadians),
  };
}

function dArc(cx: number, cy: number, start: number, end: number, r: number) {
  const startPoint = polarToCartesian(cx, cy, r, start);
  const endPoint = polarToCartesian(cx, cy, r, end);
  return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 0 1 ${endPoint.x} ${endPoint.y}`;
}

const MAX_RPM = 8000;
const REDLINE_RPM = 6500;
const MAX_SPEED = 220;
const SPEED_TICK_STEP = 20; // ✅ kelipatan 20: 0,20,40...220 -> 12 tick

// ============================================================
// SATU GAUGE BUNDAR (gaya identik MainGauges.tsx, arc 180° atas)
// Ukuran (radius) diterima dari luar agar bisa adaptif terhadap
// ruang yang tersedia, bukan angka fix.
// ============================================================
const RoundGauge = memo(
  ({
    animatedValue,
    max,
    redlineFrom,
    tickValues,
    decimals = 0,
    unitLabel,
    title,
    accentColor,
    needleColor,
    radius,
  }: {
    animatedValue: number;
    max: number;
    redlineFrom?: number;
    tickValues: number[]; // daftar nilai asli tiap tick, misal [0,1000,...,8000]
    decimals?: number;
    unitLabel: string;
    title: string;
    accentColor: string;
    needleColor: string;
    radius: number;
  }) => {
    const size = radius * 2 + 40; // padding utk tickmark+angka di luar ring
    const cx = size / 2;
    const cy = size / 2;
    const strokeWidth = Math.max(3, radius * 0.035);
    const startAngle = -90;
    const sweepAngle = 180;

    const safeValue = Math.min(Math.max(animatedValue, 0), max);
    const endAngle = startAngle + (safeValue / max) * sweepAngle;
    const redlineStartAngle =
      redlineFrom !== undefined
        ? startAngle + (redlineFrom / max) * sweepAngle
        : undefined;

    const isRedline = redlineFrom !== undefined && animatedValue >= redlineFrom;

    const backgroundTrack = dArc(
      cx,
      cy,
      startAngle,
      startAngle + sweepAngle,
      radius,
    );
    const redlineTrack =
      redlineStartAngle !== undefined
        ? dArc(cx, cy, redlineStartAngle, startAngle + sweepAngle, radius)
        : "";
    const activeTrack =
      safeValue > 0 ? dArc(cx, cy, startAngle, endAngle, radius) : "";

    const displayValue =
      decimals > 0
        ? animatedValue.toFixed(decimals)
        : Math.round(animatedValue);

    const tickFontSize = Math.max(9, radius * 0.1);
    const needleLen = radius - 12;

    return (
      <View style={[styles.gaugeCluster, { width: size }]}>
        <Svg width={size} height={size * 0.62 + 10} style={styles.svgGauge}>
          {tickValues.map((tickValue, i) => {
            const rot = startAngle + (tickValue / max) * sweepAngle;
            const isRedZone =
              redlineFrom !== undefined && tickValue >= redlineFrom;
            const innerP = polarToCartesian(
              cx,
              cy,
              radius - radius * 0.08,
              rot,
            );
            const outerP = polarToCartesian(cx, cy, radius, rot);
            const textP = polarToCartesian(cx, cy, radius - radius * 0.24, rot);
            const label = tickValue >= 1000 ? tickValue / 1000 : tickValue;
            return (
              <G key={i}>
                <Line
                  x1={innerP.x}
                  y1={innerP.y}
                  x2={outerP.x}
                  y2={outerP.y}
                  stroke={isRedZone ? "#FF3B30" : "#888888"}
                  strokeWidth={2}
                />
                <SvgText
                  x={textP.x}
                  y={textP.y}
                  fill={isRedZone ? "#FF3B30" : "#cccccc"}
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
            d={backgroundTrack}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {redlineTrack !== "" && (
            <Path
              d={redlineTrack}
              fill="none"
              stroke="#FF3B30"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
          {safeValue > 0 && (
            <Path
              d={activeTrack}
              fill="none"
              stroke={isRedline ? "#FF3B30" : accentColor}
              strokeWidth={strokeWidth + 1}
              strokeLinecap="round"
            />
          )}

          <G transform={`rotate(${endAngle}, ${cx}, ${cy})`}>
            <Polygon
              points={`${cx - 2},${cy} ${cx},${cy - needleLen} ${cx + 2},${cy} ${cx},${cy + 14}`}
              fill={isRedline ? "#FF3B30" : needleColor}
            />
            <Circle
              cx={cx}
              cy={cy}
              r={Math.max(5, radius * 0.05)}
              fill={isRedline ? "#FF3B30" : needleColor}
            />
            <Circle cx={cx} cy={cy} r={2} fill="#000" />
          </G>
        </Svg>

        {/* ✅ Digit angka & label DIPINDAH ke bawah gauge (bukan di
        tengah lingkaran lagi), supaya tidak tertimpa tickmark dan
        selalu jelas terbaca di ukuran berapa pun. */}
        <View style={styles.valueBlock}>
          <Text style={[styles.valueDigits, isRedline && styles.textRed]}>
            {displayValue}
          </Text>
          <Text style={styles.valueUnit}>{unitLabel}</Text>
        </View>
        <Text style={styles.gaugeTitle}>{title}</Text>
      </View>
    );
  },
);

// ============================================================
// KOMPONEN UTAMA: 2 RoundGauge (RPM kiri, Speed kanan).
// Ukuran (radius) dihitung adaptif dari ruang yang tersedia
// (availableHeight, availableWidth dikirim dari parent), supaya
// gauge selalu mengisi ruang maksimal alih-alih ukuran fix kecil.
// ============================================================
const LandscapeGauges = memo(
  ({ speed = 0, rpm = 0, transmission = "matic" }: LandscapeGaugesProps) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const [animRpm, setAnimRpm] = useState(rpm);
    const [animSpeed, setAnimSpeed] = useState(speed);
    const rpmValue = useRef(new Animated.Value(rpm)).current;
    const speedValue = useRef(new Animated.Value(speed)).current;

    useEffect(() => {
      Animated.timing(rpmValue, {
        toValue: rpm,
        duration: 250,
        useNativeDriver: false,
      }).start();
      Animated.timing(speedValue, {
        toValue: speed,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }, [rpm, speed]);

    useEffect(() => {
      const rSub = rpmValue.addListener((v) => setAnimRpm(v.value));
      const sSub = speedValue.addListener((v) => setAnimSpeed(v.value));
      return () => {
        rpmValue.removeListener(rSub);
        speedValue.removeListener(sSub);
      };
    }, []);

    const estimatedGear = useGearRatio(animRpm, animSpeed, transmission);

    // --- KALKULASI UKURAN ADAPTIF ---
    // Kolom kiri (tempat gauge ini dipasang) kira-kira separuh lebar
    // layar dikurangi padding kiri-kanan (16+16) dan gap di tengah.
    // Tinggi yang tersedia kira-kira tinggi layar dikurangi area
    // header (~70) dan clearance tab bar (~90, sudah di-handle parent
    // lewat marginBottom, jadi di sini cukup estimasi tinggi kasar).
    const availableWidthForBothGauges = screenWidth / 2 - 32 - 12; // dikurangi padding & gap
    const availableHeight = screenHeight - 70 - 90 - 40; // header + tabbar clearance + margin badge gear

    // Radius dibatasi oleh DUA kendala: lebar (2 gauge harus muat
    // berdampingan) dan tinggi (gauge + digit + label harus muat).
    // size = radius*2 + 40 (padding tick), height pakai size*0.62+10.
    const radiusFromWidth = (availableWidthForBothGauges / 2 - 40) / 2;
    const radiusFromHeight = (availableHeight - 10) / 2 / 0.62 - 20;

    let radius = Math.min(radiusFromWidth, radiusFromHeight);
    radius = Math.max(56, Math.min(radius, 130)); // batas wajar: tidak terlalu kecil/besar

    const rpmTicks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
    const speedTicks = Array.from(
      { length: MAX_SPEED / SPEED_TICK_STEP + 1 },
      (_, i) => i * SPEED_TICK_STEP,
    );

    return (
      <View style={styles.wrapper}>
        {/* Badge GEAR — di tengah, di ATAS, antara kedua gauge */}
        <View style={styles.gearBadgeSlot} pointerEvents="none">
          <View style={styles.gearBadge}>
            <Text style={styles.gearBadgeText}>{estimatedGear}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <RoundGauge
            animatedValue={animRpm}
            max={MAX_RPM}
            redlineFrom={REDLINE_RPM}
            tickValues={rpmTicks}
            unitLabel="RPM"
            title="x1000"
            accentColor="#ffffff"
            needleColor="#ffffff"
            radius={radius}
          />
          <RoundGauge
            animatedValue={animSpeed}
            max={MAX_SPEED}
            tickValues={speedTicks}
            unitLabel="KM/H"
            title="SPEED"
            accentColor="#3498db"
            needleColor="#3498db"
            radius={radius}
          />
        </View>
      </View>
    );
  },
);

export default LandscapeGauges;

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignItems: "center",
  },
  gearBadgeSlot: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    zIndex: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 12,
  },
  gaugeCluster: {
    alignItems: "center",
  },
  svgGauge: {},
  valueBlock: {
    alignItems: "center",
    marginTop: 4,
  },
  valueDigits: {
    fontSize: 36,
    fontWeight: "200",
    color: "#ffffff",
    lineHeight: 40,
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  valueUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 3,
    marginTop: 5,
  },
  textRed: { color: "#FF3B30" },
  gaugeTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#555555",
    letterSpacing: 3,
    marginTop: 4,
  },
  gearBadge: {
    backgroundColor: "rgba(15, 15, 15, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
  },
  gearBadgeText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FF3B30",
    letterSpacing: 1,
    fontVariant: ["tabular-nums"],
  },
});
