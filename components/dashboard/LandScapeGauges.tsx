import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAppTheme } from "../../components/AppThemeContext";
import { useGearRatio } from "../../hooks/useGearRatio";
import { useGaugeTheme } from "../GaugeThemeContext";
import GaugeUnit from "./GaugeUnit";

interface LandscapeGaugesProps {
  speed: number;
  rpm: number;
  transmission?: string;
}

const MAX_RPM = 8000;
const REDLINE_RPM = 6500;
const MAX_SPEED = 220;
const SPEED_TICK_STEP = 20;

const LandscapeGauges = memo(
  ({ speed = 0, rpm = 0, transmission = "matic" }: LandscapeGaugesProps) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const { theme, cycleTheme } = useGaugeTheme();
    const { colors, isDark } = useAppTheme();

    const currentRpmColor =
      !isDark && theme.rpmColorLight ? theme.rpmColorLight : theme.rpmColor;
    const currentRpmNeedle =
      !isDark && theme.rpmNeedleLight ? theme.rpmNeedleLight : theme.rpmNeedle;
    const currentSpeedColor =
      !isDark && theme.speedColorLight
        ? theme.speedColorLight
        : theme.speedColor;
    const currentSpeedNeedle =
      !isDark && theme.speedNeedleLight
        ? theme.speedNeedleLight
        : theme.speedNeedle;

    // ✅ Sama seperti komponen lain: >=480 tinggi dianggap Tablet/Head Unit,
    // dipakai supaya Bar & Digital bisa punya cap radius yang jauh lebih
    // besar di Tablet dibanding HP (sebelumnya disamakan, jadi HU kekecilan).
    const isTabletLandscapeGauge = screenHeight >= 480;

    const [animRpm, setAnimRpm] = useState(rpm);
    const [animSpeed, setAnimSpeed] = useState(speed);
    const rpmValue = useRef(new Animated.Value(rpm)).current;
    const speedValue = useRef(new Animated.Value(speed)).current;

    useEffect(() => {
      Animated.spring(rpmValue, {
        toValue: rpm,
        friction: 7, // Redaman (makin kecil angkanya, makin memantul)
        tension: 45, // Tarikan gas (makin besar, makin cepat dan responsif)
        useNativeDriver: false,
      }).start();

      Animated.spring(speedValue, {
        toValue: speed,
        friction: 7,
        tension: 45,
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

    const isArc = theme.layout === "arc";
    const isRing = theme.layout === "ring";
    const isArcOrRing = isArc || isRing;
    const isColumnLayout = !isArcOrRing; // bar & digital

    const availableWidthForGauges = screenWidth / 2 - 16 - 8;
    const availableHeight = screenHeight - 70 - 90 - 40;

    let radius: number;
    if (isArcOrRing) {
      const radiusFromWidth = (availableWidthForGauges / 2 - 40) / 2;
      const radiusFromHeight = (availableHeight - 10) / 2 / 0.62 - 20;
      radius = Math.min(radiusFromWidth, radiusFromHeight);
      radius = Math.max(56, Math.min(radius, 155));
    } else {
      // ✅ FIX: Bar/Digital kolom pakai basis LEBAR PENUH kolom kiri
      // (bukan dibagi 2 lagi, karena cuma 1 panel per baris), dengan
      // faktor lebih besar & cap terpisah HP vs Tablet supaya ngisi
      // ruang yang tersedia, bukan nyisa space kosong di kanan-kiri.
      const widthFactor = isTabletLandscapeGauge ? 0.95 : 0.92;
      const maxCap = isTabletLandscapeGauge ? 230 : 155;
      radius = Math.max(
        90,
        Math.min((availableWidthForGauges * widthFactor) / 2.2, maxCap),
      );
    }

    const rpmTicks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
    const speedTicks = Array.from(
      { length: MAX_SPEED / SPEED_TICK_STEP + 1 },
      (_, i) => i * SPEED_TICK_STEP,
    );

    const rpmMarginStyle = isArc ? { marginRight: -10 } : undefined;
    const speedMarginStyle = isArc ? { marginLeft: -10 } : undefined;

    return (
      <View style={styles.wrapper}>
        {/* ✅ FIX: gear badge dikasih jarak LEBIH JAUH ke atas khusus saat
        layout kolom (Bar/Digital), supaya tidak menutupi bagian atas
        panel LCD/Bar. Row layout (Arc/Ring) tetap seperti semula. */}
        <View
          style={[
            styles.gearBadgeSlot,
            // Naikkan posisi Gear Badge lebih tinggi khusus di Tablet
            isColumnLayout && { top: isTabletLandscapeGauge ? -60 : -34 },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.gearBadge, { backgroundColor: colors.bg }]}>
            <Text style={styles.gearBadgeText}>{estimatedGear}</Text>
          </View>
        </View>

        <View
          style={[
            isColumnLayout ? styles.column : styles.row,
            isRing && { gap: 10 },
            theme.layout === "bar" && { gap: isTabletLandscapeGauge ? 80 : 20 },
            theme.layout === "digital" && {
              gap: isTabletLandscapeGauge ? 35 : 20,
            },
          ]}
        >
          <GaugeUnit
            value={animRpm}
            max={MAX_RPM}
            redlineFrom={REDLINE_RPM}
            tickValues={rpmTicks}
            unitLabel="RPM"
            title="x1000"
            color={currentRpmColor}
            needleColor={currentRpmNeedle}
            radius={radius}
            layout={theme.layout}
            glow={theme.glow}
            grid={theme.grid}
            fontFamily={theme.fontFamily}
            style={rpmMarginStyle}
          />
          <GaugeUnit
            value={animSpeed}
            max={MAX_SPEED}
            tickValues={speedTicks}
            unitLabel="KM/H"
            title="SPEED"
            color={currentSpeedColor}
            needleColor={currentSpeedNeedle}
            radius={radius}
            layout={theme.layout}
            glow={theme.glow}
            grid={theme.grid}
            fontFamily={theme.fontFamily}
            style={speedMarginStyle}
            tickFontSizeFactor={0.1}
          />
        </View>

        {/* ✅ Tap buat cycle tema (bentuk + warna sekaligus) */}
        <TouchableOpacity
          onPress={cycleTheme}
          style={[
            styles.themeToggleBtn,
            // ✅ Untuk layout kolom (Bar/Digital), pindahkan ke pojok KANAN BAWAH
            // wrapper — nggak ketiban gear badge di atas & nggak nempel ke tepi
            // panel RPM/Speed yang sekarang lebih lebar (full-width kolom).
            isColumnLayout && styles.themeToggleBtnColumn,
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="color-palette-outline" size={14} color="#555" />
        </TouchableOpacity>
      </View>
    );
  },
);

export default LandscapeGauges;

const styles = StyleSheet.create({
  wrapper: { position: "relative", alignItems: "center" },
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
    gap: 0,
  },
  column: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  themeToggleBtn: { position: "absolute", top: -6, right: -6, padding: 6 },
  themeToggleBtnColumn: {
    top: -20,
    right: -6,
    bottom: -8,
  },
  gearBadge: {
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
