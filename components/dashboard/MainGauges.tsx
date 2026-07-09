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

interface MainGaugesProps {
  speed: number;
  rpm: number;
  transmission?: string;
}

const MAX_RPM = 8000;
const REDLINE_RPM = 6500;
const MAX_SPEED = 220;

const rpmTicks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];
const speedTicks = [0, 40, 80, 120, 160, 200];

const MainGauges = memo(
  ({ speed = 0, rpm = 0, transmission = "matic" }: MainGaugesProps) => {
    const { theme, cycleTheme } = useGaugeTheme();
    const { width: screenWidth } = useWindowDimensions();
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

    const mainTextColor = isDark ? "#ffffff" : "#1C1C1E";
    const subTextColor = isDark ? "#888888" : "#8E8E93";
    const titleTextColor = isDark ? "#555555" : "#666666";

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

    // ✅ CLASSIC ARC: cuma 1 gauge (RPM). Speed cukup jadi angka kecil DI
    // DALAM gauge (insetValue) — bukan gauge arc kedua yang numpuk ke bawah.
    const isArc = theme.layout === "arc";
    // ✅ FULL RING: disejajarkan kiri-kanan (kayak landscape), BUKAN ditumpuk.
    const isSideBySide = theme.layout === "ring";
    const isArcOrRing = isArc || isSideBySide;

    // Radius dasar per tipe gauge. Untuk BAR & DIGITAL sengaja DISAMAKAN
    // (primary = secondary) supaya lebar kotak Speed = lebar kotak RPM.
    let primaryRadius = isArcOrRing ? 140 : 140;
    let secondaryRadius = isArcOrRing ? 100 : 140;

    if (isSideBySide) {
      // Ring portrait disejajarkan -> radius dihitung dari lebar layar
      // supaya 2 lingkaran muat berdampingan (container padding ±20px kiri-kanan).
      const availableWidth = screenWidth - 40 - 16;
      const ringRadius = Math.max(
        58,
        Math.min((availableWidth / 2 - 24) / 2, 105),
      );
      primaryRadius = ringRadius;
      secondaryRadius = ringRadius;
    }

    return (
      <View style={styles.container}>
        <View
          style={[
            styles.gearContainer,
            { backgroundColor: colors.bg, borderColor: titleTextColor },
          ]}
        >
          <Text style={styles.gearText}>{estimatedGear}</Text>
        </View>

        {isArc ? (
          <View style={{ alignItems: "center" }}>
            <GaugeUnit
              value={animRpm}
              max={MAX_RPM}
              redlineFrom={REDLINE_RPM}
              tickValues={rpmTicks}
              unitLabel="RPM"
              title=""
              color={currentRpmColor}
              needleColor={currentRpmNeedle}
              radius={primaryRadius}
              layout={theme.layout}
              glow={theme.glow}
              grid={theme.grid}
              fontFamily={theme.fontFamily}
            />

            {/* 👇 GANTI MULAI DARI SINI 👇 */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center", // <-- Posisikan di tengah
                alignItems: "center",
                gap: 60, // <-- Jarak proporsional antara RPM dan Speed
                width: primaryRadius * 2 + 40,
                marginTop: -20,
              }}
            >
              {/* KIRI: Blok RPM */}
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 36,
                    fontWeight: "200",
                    color: animRpm >= REDLINE_RPM ? "#FF3B30" : mainTextColor,
                    fontVariant: ["tabular-nums"],
                    lineHeight: 40,
                    letterSpacing: -1.5,
                  }}
                >
                  {rpm.toLocaleString("id-ID")}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#888",
                    letterSpacing: 2,
                    marginTop: 2,
                  }}
                >
                  RPM
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "800",
                    color: "#555",
                    letterSpacing: 3,
                    marginTop: 2,
                  }}
                >
                  ENGINE
                </Text>
              </View>

              {/* KANAN: Blok Speed */}
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 36,
                    fontWeight: "200",
                    color: mainTextColor,
                    fontVariant: ["tabular-nums"],
                    lineHeight: 40,
                    letterSpacing: -1.5,
                  }}
                >
                  {speed}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: subTextColor,
                    letterSpacing: 2,
                    marginTop: 2,
                  }}
                >
                  KM/H
                </Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "800",
                    color: titleTextColor,
                    letterSpacing: 3,
                    marginTop: 2,
                  }}
                >
                  SPEED
                </Text>
              </View>
            </View>
            {/* 👆 SAMPAI SINI 👆 */}
          </View>
        ) : isSideBySide ? (
          <View style={styles.sideBySideRow}>
            <GaugeUnit
              value={animRpm}
              max={MAX_RPM}
              redlineFrom={REDLINE_RPM}
              tickValues={rpmTicks}
              unitLabel="RPM"
              title="ENGINE"
              color={currentRpmColor}
              needleColor={currentRpmNeedle}
              radius={primaryRadius}
              layout={theme.layout}
              glow={theme.glow}
              grid={theme.grid}
              fontFamily={theme.fontFamily}
            />
            <GaugeUnit
              value={animSpeed}
              max={MAX_SPEED}
              tickValues={speedTicks}
              unitLabel="KM/H"
              title="SPEED"
              color={currentSpeedColor}
              needleColor={currentSpeedNeedle}
              radius={secondaryRadius}
              layout={theme.layout}
              glow={theme.glow}
              grid={theme.grid}
              fontFamily={theme.fontFamily}
            />
          </View>
        ) : (
          <>
            <GaugeUnit
              value={animRpm}
              max={MAX_RPM}
              redlineFrom={REDLINE_RPM}
              tickValues={rpmTicks}
              unitLabel="RPM"
              title="ENGINE"
              color={currentRpmColor}
              needleColor={currentRpmNeedle}
              radius={primaryRadius}
              layout={theme.layout}
              glow={theme.glow}
              grid={theme.grid}
              fontFamily={theme.fontFamily}
            />
            <View style={{ marginTop: theme.layout === "digital" ? 30 : 25 }}>
              <GaugeUnit
                value={animSpeed}
                max={MAX_SPEED}
                tickValues={speedTicks}
                unitLabel="KM/H"
                title="SPEED"
                color={currentSpeedColor}
                needleColor={currentSpeedNeedle}
                radius={secondaryRadius}
                layout={theme.layout}
                glow={theme.glow}
                grid={theme.grid}
                fontFamily={theme.fontFamily}
              />
            </View>
          </>
        )}

        {/* ✅ Tap buat cycle tema (bentuk + warna sekaligus) */}
        <TouchableOpacity
          onPress={cycleTheme}
          style={styles.themeToggleBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="color-palette-outline" size={16} color="#555" />
        </TouchableOpacity>
      </View>
    );
  },
);

export default MainGauges;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingTop: 22,
    position: "relative",
  },
  sideBySideRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    width: "100%",
  },
  themeToggleBtn: {
    position: "absolute",
    top: -5,
    right: 4,
    padding: 6,
  },
  gearContainer: {
    position: "absolute",
    top: -15,
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  gearText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FF3B30",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
});
