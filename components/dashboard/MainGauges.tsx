// import React, { memo, useEffect, useRef, useState } from "react";
// import { Animated, StyleSheet, Text, View } from "react-native";
// import Svg, {
//   Circle,
//   G,
//   Line,
//   Path,
//   Polygon,
//   Text as SvgText,
// } from "react-native-svg";
// import { useGearRatio } from "../../hooks/useGearRatio";

// interface MainGaugesProps {
//   speed: number;
//   rpm: number;
//   transmission?: string;
// }

// // 1. Bungkus dengan memo()
// const MainGauges = memo(
//   ({ speed = 0, rpm = 0, transmission = "matic" }: MainGaugesProps) => {
//     const MAX_RPM = 8000;
//     const REDLINE_RPM = 6500;

//     const [animRpm, setAnimRpm] = useState(rpm);
//     const [animSpeed, setAnimSpeed] = useState(speed);
//     const rpmValue = useRef(new Animated.Value(rpm)).current;
//     const speedValue = useRef(new Animated.Value(speed)).current;

//     useEffect(() => {
//       Animated.timing(rpmValue, {
//         toValue: rpm,
//         duration: 80,
//         useNativeDriver: false,
//       }).start();
//       Animated.timing(speedValue, {
//         toValue: speed,
//         duration: 80,
//         useNativeDriver: false,
//       }).start();
//     }, [rpm, speed]);

//     useEffect(() => {
//       const rSub = rpmValue.addListener((v) => setAnimRpm(v.value));
//       const sSub = speedValue.addListener((v) => setAnimSpeed(v.value));
//       return () => {
//         rpmValue.removeListener(rSub);
//         speedValue.removeListener(sSub);
//       };
//     }, []);

//     const isRedline = animRpm >= REDLINE_RPM;
//     const safeRpm = Math.min(Math.max(animRpm, 0), MAX_RPM);
//     const cx = 160;
//     const cy = 160;
//     const radius = 145;
//     const strokeWidth = 3;
//     const startAngle = -90;
//     const sweepAngle = 180;
//     const endAngle = startAngle + (safeRpm / MAX_RPM) * sweepAngle;
//     const redlineStartAngle = startAngle + (REDLINE_RPM / MAX_RPM) * sweepAngle;

//     const polarToCartesian = (
//       centerX: number,
//       centerY: number,
//       r: number,
//       angleInDegrees: number,
//     ) => {
//       const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
//       return {
//         x: centerX + r * Math.cos(angleInRadians),
//         y: centerY + r * Math.sin(angleInRadians),
//       };
//     };

//     const dArc = (start: number, end: number, r: number) => {
//       const startPoint = polarToCartesian(cx, cy, r, start);
//       const endPoint = polarToCartesian(cx, cy, r, end);
//       return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 0 1 ${endPoint.x} ${endPoint.y}`;
//     };

//     const backgroundTrack = dArc(startAngle, startAngle + sweepAngle, radius);
//     const redlineTrack = dArc(
//       redlineStartAngle,
//       startAngle + sweepAngle,
//       radius,
//     );
//     const activeTrack = safeRpm > 0 ? dArc(startAngle, endAngle, radius) : "";

//     const estimatedGear = useGearRatio(animRpm, animSpeed, transmission);

//     return (
//       <View style={styles.container}>
//         <View style={styles.gearContainer}>
//           <Text style={styles.gearText}>{estimatedGear}</Text>
//         </View>
//         <View style={styles.gaugeCluster}>
//           <Svg width={cx * 2} height={190} style={styles.svgGauge}>
//             {Array.from({ length: 9 }).map((_, i) => {
//               const rot = startAngle + (i / 8) * sweepAngle;
//               const isRedZone = i >= 7;
//               const innerP = polarToCartesian(cx, cy, radius - 8, rot);
//               const outerP = polarToCartesian(cx, cy, radius, rot);
//               const textP = polarToCartesian(cx, cy, radius - 26, rot);
//               return (
//                 <G key={i}>
//                   <Line
//                     x1={innerP.x}
//                     y1={innerP.y}
//                     x2={outerP.x}
//                     y2={outerP.y}
//                     stroke={isRedZone ? "#FF3B30" : "#888888"}
//                     strokeWidth={2}
//                   />
//                   <SvgText
//                     x={textP.x}
//                     y={textP.y}
//                     fill={isRedZone ? "#FF3B30" : "#cccccc"}
//                     fontSize={14}
//                     fontWeight="bold"
//                     textAnchor="middle"
//                     alignmentBaseline="middle"
//                   >
//                     {i}
//                   </SvgText>
//                 </G>
//               );
//             })}
//             <Path
//               d={backgroundTrack}
//               fill="none"
//               stroke="#1a1a1a"
//               strokeWidth={strokeWidth}
//               strokeLinecap="round"
//             />
//             <Path
//               d={redlineTrack}
//               fill="none"
//               stroke="#FF3B30"
//               strokeWidth={strokeWidth}
//               strokeLinecap="round"
//             />
//             {safeRpm > 0 && (
//               <Path
//                 d={activeTrack}
//                 fill="none"
//                 stroke={isRedline ? "#FF3B30" : "#FFFFFF"}
//                 strokeWidth={strokeWidth + 1}
//                 strokeLinecap="round"
//               />
//             )}
//             <G transform={`rotate(${endAngle}, ${cx}, ${cy})`}>
//               <Polygon
//                 points={`${cx - 2},${cy} ${cx},${cy - radius + 15} ${cx + 2},${cy} ${cx},${cy + 15}`}
//                 fill={isRedline ? "#FF3B30" : "#FFFFFF"}
//               />
//               <Circle
//                 cx={cx}
//                 cy={cy}
//                 r={6}
//                 fill={isRedline ? "#FF3B30" : "#FFFFFF"}
//               />
//               <Circle cx={cx} cy={cy} r={2} fill="#000" />
//             </G>
//           </Svg>
//           <View style={styles.speedContainer} pointerEvents="none">
//             <Text style={styles.speedDigits}>{Math.round(animSpeed)}</Text>
//             <Text style={styles.speedUnit}>KM/H</Text>
//           </View>
//         </View>
//         <View style={styles.rpmContainer}>
//           <Text style={[styles.rpmValue, isRedline && styles.textRed]}>
//             {Math.round(animRpm).toLocaleString("id-ID")}{" "}
//             <Text style={styles.rpmUnit}>RPM</Text>
//           </Text>
//         </View>
//       </View>
//     );
//   },
// );

// export default MainGauges;

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     alignItems: "center",
//     justifyContent: "center",
//     marginTop: 10,
//   },
//   gaugeCluster: {
//     width: 320,
//     height: 190,
//     alignItems: "center",
//     position: "relative",
//   },
//   svgGauge: { position: "absolute", top: 0, left: 0 },
//   speedContainer: {
//     position: "absolute",
//     bottom: 50,
//     alignItems: "center",
//     justifyContent: "center",
//     width: "100%",
//   },
//   speedDigits: {
//     fontSize: 75,
//     fontWeight: "200",
//     color: "#ffffff",
//     lineHeight: 82,
//     letterSpacing: -3,
//     fontVariant: ["tabular-nums"],
//     textShadowColor: "rgba(0,0,0,0.8)",
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   speedUnit: {
//     fontSize: 12,
//     fontWeight: "700",
//     color: "#888888",
//     letterSpacing: 4,
//     marginTop: -2,
//   },
//   rpmContainer: {
//     marginTop: -10,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   rpmValue: {
//     fontSize: 22,
//     fontWeight: "500",
//     color: "#dddddd",
//     fontVariant: ["tabular-nums"],
//   },
//   rpmUnit: {
//     fontSize: 12,
//     fontWeight: "800",
//     color: "#666666",
//     letterSpacing: 1.5,
//     marginLeft: 2,
//   },
//   textRed: { color: "#FF3B30" },
//   gearContainer: {
//     position: "absolute",
//     top: -20,
//     backgroundColor: "rgba(15, 15, 15, 0.8)",
//     paddingHorizontal: 16,
//     paddingVertical: 4,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#333333",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.5,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   gearText: {
//     fontSize: 18,
//     fontWeight: "900",
//     color: "#FF3B30",
//     letterSpacing: 2,
//     fontVariant: ["tabular-nums"],
//   },
// });

import { Ionicons } from "@expo/vector-icons";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

    // Arc & Ring butuh basis "radius" (lingkaran); Bar & Digital pakai
    // basis lebar panel yang beda proporsinya.
    const isArcOrRing = theme.layout === "arc" || theme.layout === "ring";
    const primaryRadius = isArcOrRing ? 130 : 115;
    const secondaryRadius = isArcOrRing ? 100 : 100;

    return (
      <View style={styles.container}>
        <View style={styles.gearContainer}>
          <Text style={styles.gearText}>{estimatedGear}</Text>
        </View>

        <GaugeUnit
          value={animRpm}
          max={MAX_RPM}
          redlineFrom={REDLINE_RPM}
          tickValues={rpmTicks}
          unitLabel="RPM"
          title="ENGINE"
          color={theme.rpmColor}
          needleColor={theme.rpmNeedle}
          radius={primaryRadius}
          layout={theme.layout}
          glow={theme.glow}
          grid={theme.grid}
          fontFamily={theme.fontFamily}
        />

        <View style={{ marginTop: theme.layout === "digital" ? 14 : 8 }}>
          <GaugeUnit
            value={animSpeed}
            max={MAX_SPEED}
            tickValues={speedTicks}
            unitLabel="KM/H"
            title="SPEED"
            color={theme.speedColor}
            needleColor={theme.speedNeedle}
            radius={secondaryRadius}
            layout={theme.layout}
            glow={theme.glow}
            grid={theme.grid}
            fontFamily={theme.fontFamily}
          />
        </View>

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
  themeToggleBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    padding: 6,
  },
  gearContainer: {
    position: "absolute",
    top: 0,
    backgroundColor: "rgba(15, 15, 15, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333333",
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
