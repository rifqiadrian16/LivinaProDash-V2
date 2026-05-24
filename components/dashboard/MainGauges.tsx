import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";

interface MainGaugesProps {
  speed: number;
  rpm: number;
}

export default function MainGauges({ speed = 0, rpm = 0 }: MainGaugesProps) {
  // ================= FITUR SIMULATOR (DEMO MODE: HALUS & ELEGAN) =================
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoRpm, setDemoRpm] = useState(800);
  const [demoSpeed, setDemoSpeed] = useState(0);

  useEffect(() => {
    if (!isDemoMode) return;

    let currentRpm = 800;
    let currentSpeed = 0;
    let gearDrop = false;

    // Interval dicepatkan tapi dengan penambahan angka kecil agar animasinya super mulus (buttery smooth)
    const interval = setInterval(() => {
      if (!gearDrop) {
        currentRpm += 60; // Naik perlahan dan elegan
        currentSpeed += 0.8;
        if (currentRpm > 6000) gearDrop = true; // Pindah gigi lembut
      } else {
        currentRpm -= 1500; // Turun RPM saat oper gigi
        gearDrop = false;
      }
      if (currentSpeed > 140) currentSpeed = 0;

      setDemoRpm(currentRpm);
      setDemoSpeed(currentSpeed);
    }, 40);

    return () => clearInterval(interval);
  }, [isDemoMode]);

  const displayRpm = isDemoMode ? demoRpm : rpm;
  const displaySpeed = isDemoMode ? demoSpeed : speed;
  // ===============================================================

  const MAX_RPM = 7000;
  const REDLINE_RPM = 5500;
  const isRedline = displayRpm >= REDLINE_RPM;
  const safeRpm = Math.min(Math.max(displayRpm, 0), MAX_RPM);

  // --- MATEMATIKA MINIMALIST ARC ---
  const cx = 130;
  const cy = 130;
  const radius = 115; // Jari-jari besar agar memeluk angka dengan rapi
  const strokeWidth = 4; // Sangat tipis dan presisi

  const startAngle = -120;
  const sweepAngle = 240;
  const endAngle = startAngle + (safeRpm / MAX_RPM) * sweepAngle;

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    r: number,
    angleInDegrees: number,
  ) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const dArc = (start: number, end: number) => {
    const startPoint = polarToCartesian(cx, cy, radius, start);
    const endPoint = polarToCartesian(cx, cy, radius, end);
    const largeArcFlag = end - start <= 180 ? "0" : "1";
    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`;
  };

  // Garis latar: Abu-abu sangat gelap
  const backgroundTrack = dArc(startAngle, startAngle + sweepAngle);
  // Garis aktif: Putih bersih (merah saat bahaya)
  const activeTrack = safeRpm > 0 ? dArc(startAngle, endAngle) : "";

  return (
    <View style={styles.container}>
      {/* ================= CLUSTER METER ELEGAN ================= */}
      <View style={styles.gaugeCluster}>
        <Svg width={cx * 2} height={cy * 1.8} style={styles.svgGauge}>
          {/* TRACK LATAR */}
          <Path
            d={backgroundTrack}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* TRACK AKTIF (Minimalis, tanpa gradasi norak) */}
          {safeRpm > 0 && (
            <Path
              d={activeTrack}
              fill="none"
              stroke={isRedline ? "#FF3B30" : "#FFFFFF"} // Putih murni atau merah Apple murni
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
        </Svg>

        {/* ================= DATA TENGAH (TYPOGRAPHY FOKUS) ================= */}
        <View style={styles.internalDisplay}>
          <Text style={styles.speedDigits}>{Math.round(displaySpeed)}</Text>
          <Text style={styles.speedUnit}>KM/H</Text>

          <Text style={[styles.rpmValue, isRedline && styles.textRed]}>
            {Math.round(displayRpm).toLocaleString("id-ID")}{" "}
            <Text style={styles.rpmUnit}>RPM</Text>
          </Text>
        </View>
      </View>

      {/* ================= TOMBOL DEMO MODE (DISCREET/HALUS) ================= */}
      <View style={styles.bottomLabelRow}>
        <TouchableOpacity
          onPress={() => setIsDemoMode(!isDemoMode)}
          activeOpacity={0.6}
        >
          <Text
            style={[styles.demoBtnText, isDemoMode && styles.demoBtnActive]}
          >
            {isDemoMode ? "SIMULATION ACTIVE" : "PURE MINIMALIST"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  gaugeCluster: {
    width: 260,
    height: 230,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svgGauge: { position: "absolute", top: 0 },

  /* --- TIPOGRAFI PUSAT --- */
  internalDisplay: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: 60,
  },
  speedDigits: {
    fontSize: 90,
    fontWeight: "200", // Paling tipis dan elegan
    color: "#ffffff",
    lineHeight: 90,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  speedUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666666",
    letterSpacing: 3,
    marginTop: 4,
    marginBottom: 12,
  },

  /* --- RPM BAWAH (TANPA KOTAK) --- */
  rpmValue: {
    fontSize: 16,
    fontWeight: "400",
    color: "#bbbbbb",
    fontVariant: ["tabular-nums"],
  },
  rpmUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "#555555",
    letterSpacing: 1,
  },
  textRed: { color: "#FF3B30" }, // Apple Red

  /* --- TOMBOL DEMO SUPER HALUS --- */
  bottomLabelRow: { marginTop: -10 },
  demoBtnText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#444444",
    letterSpacing: 2,
  },
  demoBtnActive: { color: "#ffffff", opacity: 0.8 },
});
