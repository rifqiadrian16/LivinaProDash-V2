import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import { useGearRatio } from "../../hooks/useGearRatio";

interface MainGaugesProps {
  speed: number;
  rpm: number;
  transmission?: string;
}

export default function MainGauges({
  speed = 0,
  rpm = 0,
  transmission = "matic",
}: MainGaugesProps) {
  // Konfigurasi Batas RPM
  const MAX_RPM = 8000;
  const REDLINE_RPM = 6500;

  const isRedline = rpm >= REDLINE_RPM;
  const safeRpm = Math.min(Math.max(rpm, 0), MAX_RPM);

  // --- MATEMATIKA SETENGAH LINGKARAN (SEMI-CIRCLE) ---
  const cx = 160;
  const cy = 160;
  const radius = 145;
  const strokeWidth = 3;

  // Sudut 180 derajat (Dari Jam 9 ke Jam 3)
  const startAngle = -90;
  const sweepAngle = 180;
  const endAngle = startAngle + (safeRpm / MAX_RPM) * sweepAngle;

  const redlineStartAngle = startAngle + (REDLINE_RPM / MAX_RPM) * sweepAngle;

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

  const dArc = (start: number, end: number, r: number) => {
    const startPoint = polarToCartesian(cx, cy, r, start);
    const endPoint = polarToCartesian(cx, cy, r, end);
    return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 0 1 ${endPoint.x} ${endPoint.y}`;
  };

  // Jalur SVG
  const backgroundTrack = dArc(startAngle, startAngle + sweepAngle, radius);
  const redlineTrack = dArc(redlineStartAngle, startAngle + sweepAngle, radius);
  const activeTrack = safeRpm > 0 ? dArc(startAngle, endAngle, radius) : "";
  const estimatedGear = useGearRatio(rpm, speed, transmission);

  return (
    <View style={styles.container}>
      <View style={styles.gearContainer}>
        <Text style={styles.gearText}>{estimatedGear}</Text>
      </View>
      {/* ================= CLUSTER METER SETENGAH LINGKARAN ================= */}
      <View style={styles.gaugeCluster}>
        <Svg width={cx * 2} height={190} style={styles.svgGauge}>
          {/* 1. TICK MARKS & ANGKA RPM (0 - 7) */}
          {Array.from({ length: 9 }).map((_, i) => {
            const rot = startAngle + (i / 8) * sweepAngle;
            const isRedZone = i >= 7;

            const innerP = polarToCartesian(cx, cy, radius - 8, rot);
            const outerP = polarToCartesian(cx, cy, radius, rot);
            const textP = polarToCartesian(cx, cy, radius - 26, rot);

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
                  fontSize={14}
                  fontWeight="bold"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {i}
                </SvgText>
              </G>
            );
          })}

          {/* 2. LINTASAN DASAR */}
          <Path
            d={backgroundTrack}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* 3. ZONA REDLINE */}
          <Path
            d={redlineTrack}
            fill="none"
            stroke="#FF3B30"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* 4. LINTASAN AKTIF */}
          {safeRpm > 0 && (
            <Path
              d={activeTrack}
              fill="none"
              stroke={isRedline ? "#FF3B30" : "#FFFFFF"}
              strokeWidth={strokeWidth + 1}
              strokeLinecap="round"
            />
          )}

          {/* 5. JARUM RPM ELEGAN */}
          <G transform={`rotate(${endAngle}, ${cx}, ${cy})`}>
            <Polygon
              points={`${cx - 2},${cy} ${cx},${cy - radius + 15} ${cx + 2},${cy} ${cx},${cy + 15}`}
              fill={isRedline ? "#FF3B30" : "#FFFFFF"}
            />
            <Circle
              cx={cx}
              cy={cy}
              r={6}
              fill={isRedline ? "#FF3B30" : "#FFFFFF"}
            />
            <Circle cx={cx} cy={cy} r={2} fill="#000" />
          </G>
        </Svg>

        {/* ================= DIGITAL SPEED (DI TENGAH LENGKUNGAN) ================= */}
        <View style={styles.speedContainer} pointerEvents="none">
          <Text style={styles.speedDigits}>{Math.round(speed)}</Text>
          <Text style={styles.speedUnit}>KM/H</Text>
        </View>
      </View>

      {/* ================= DIGITAL RPM (DI LUAR/BAWAH LENGKUNGAN) ================= */}
      <View style={styles.rpmContainer}>
        <Text style={[styles.rpmValue, isRedline && styles.textRed]}>
          {Math.round(rpm).toLocaleString("id-ID")}{" "}
          <Text style={styles.rpmUnit}>RPM</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  /* --- HOUSING SETENGAH LINGKARAN --- */
  gaugeCluster: {
    width: 320,
    height: 190,
    alignItems: "center",
    position: "relative",
  },
  svgGauge: {
    position: "absolute",
    top: 0,
    left: 0,
  },

  /* --- KAWASAN KELAJUAN (SPEED) DI DALAM --- */
  speedContainer: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  speedDigits: {
    fontSize: 75,
    fontWeight: "200",
    color: "#ffffff",
    lineHeight: 82,
    letterSpacing: -3,
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  speedUnit: {
    fontSize: 12,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 4,
    marginTop: -2,
  },

  /* --- KAWASAN RPM (DI BAWAH) --- */
  rpmContainer: {
    marginTop: -10,
    alignItems: "center",
    justifyContent: "center",
  },
  rpmValue: {
    fontSize: 22,
    fontWeight: "500",
    color: "#dddddd",
    fontVariant: ["tabular-nums"],
  },
  rpmUnit: {
    fontSize: 12,
    fontWeight: "800",
    color: "#666666",
    letterSpacing: 1.5,
    marginLeft: 2,
  },
  textRed: { color: "#FF3B30" },
  gearContainer: {
    position: "absolute",
    top: -20, // Mengambang pas di rongga atas lengkungan
    backgroundColor: "rgba(15, 15, 15, 0.8)", // Background gelap transparan
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8, // Sedikit membulat
    borderWidth: 1,
    borderColor: "#333333", // Border tipis elegan
    // Efek shadow agar emblemnya menonjol
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  gearText: {
    fontSize: 18,
    fontWeight: "900", // Sangat tebal
    color: "#FF3B30", // Warna Cyan Premium (atau bisa diganti merah #FF3B30)
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
});
