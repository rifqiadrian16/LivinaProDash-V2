import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Text as SvgText,
} from "react-native-svg";
import { useAlert } from "../../components/AlertContext";

const { width } = Dimensions.get("window");

// ==========================================
// 1. KOMPONEN GAUGE NATIVE (SVG + REANIMATED)
// ==========================================
interface NativeGaugeProps {
  value: number;
  maxValue: number;
  step: number;
  title: string;
  unit: string;
  color: string;
  hideRedline?: boolean;
  decimalPlaces?: number;
}

const NativeGauge = ({
  value,
  maxValue,
  step,
  title,
  unit,
  color,
  hideRedline = false,
  decimalPlaces = 0,
}: NativeGaugeProps) => {
  const size = width / 2.15; // Sedikit dikecilkan agar pas bersebelahan
  const radius = size / 2.2;
  const center = size / 2;
  const startAngle = -135;
  const endAngle = 135;
  const angleRange = endAngle - startAngle;

  const rotation = useSharedValue(startAngle);

  useEffect(() => {
    let safeValue = Math.min(Math.max(value, 0), maxValue);
    let targetAngle = startAngle + (safeValue / maxValue) * angleRange;

    rotation.value = withTiming(targetAngle, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedNeedleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const renderTicksAndLabels = () => {
    const elements = [];
    const totalMajorTicks = maxValue / step;

    for (let i = 0; i <= totalMajorTicks; i++) {
      const currentVal = i * step;
      const progress = currentVal / maxValue;
      const currentAngle = startAngle + progress * angleRange;
      const isRedline = !hideRedline && currentVal >= maxValue * 0.8;

      elements.push(
        <G
          key={`major-${i}`}
          rotation={currentAngle}
          origin={`${center}, ${center}`}
        >
          <Line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center - radius + 12}
            stroke={isRedline ? "#ff4444" : "#fff"}
            strokeWidth="3"
          />
        </G>,
      );

      const angleRad = (currentAngle - 90) * (Math.PI / 180);
      const textRadius = radius - 28;
      const textX = center + textRadius * Math.cos(angleRad);
      const textY = center + textRadius * Math.sin(angleRad);

      elements.push(
        <SvgText
          key={`label-${i}`}
          x={textX}
          y={textY + 4}
          fill={isRedline ? "#ff4444" : "#ccc"}
          fontSize={size * 0.065}
          fontWeight="bold"
          textAnchor="middle"
        >
          {currentVal}
        </SvgText>,
      );
    }

    const totalMinorTicks = totalMajorTicks * 2;
    for (let i = 0; i <= totalMinorTicks; i++) {
      if (i % 2 === 0) continue;
      const progress = i / totalMinorTicks;
      const currentAngle = startAngle + progress * angleRange;
      const currentVal = progress * maxValue;
      const isRedline = !hideRedline && currentVal >= maxValue * 0.8;

      elements.push(
        <G
          key={`minor-${i}`}
          rotation={currentAngle}
          origin={`${center}, ${center}`}
        >
          <Line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center - radius + 6}
            stroke={isRedline ? "#ff4444" : "#888"}
            strokeWidth="2"
          />
        </G>,
      );
    }
    return elements;
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="4"
        />
        {renderTicksAndLabels()}
      </Svg>

      <Animated.View
        style={[
          { position: "absolute", top: 0, left: 0, width: size, height: size },
          animatedNeedleStyle,
        ]}
      >
        <Svg width={size} height={size}>
          <Polygon
            points={`${center - 4},${center + 15} ${center + 4},${center + 15} ${center},${center - radius + 18}`}
            fill={color}
          />
          <Circle cx={center} cy={center} r="8" fill="#fff" />
          <Circle cx={center} cy={center} r="4" fill="#111" />
        </Svg>
      </Animated.View>

      <View style={styles.gaugeTextContainer}>
        <Text style={[styles.gaugeValue, { color: color }]}>
          {parseFloat(value.toFixed(decimalPlaces))}
        </Text>
        <Text style={styles.gaugeUnit}>{unit}</Text>
      </View>
      <Text style={styles.gaugeTitle}>{title}</Text>
    </View>
  );
};

// ==========================================
// 2. KOMPONEN KOTAK STATISTIK KECIL
// ==========================================
const StatBox = ({
  label,
  value,
  unit,
  valueColor = "#fff",
}: {
  label: string;
  value: string | number;
  unit: string;
  valueColor?: string;
}) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color: valueColor }]}>
      {value}
      <Text style={styles.statUnit}>{unit}</Text>
    </Text>
  </View>
);

// ==========================================
// 3. LAYAR DASHBOARD UTAMA
// ==========================================
export default function DashboardScreen() {
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const [carData, setCarData] = useState({
    speed: 0,
    rpm: 0,
    temp: 0, // Engine Coolant Temp
    volt: 0.0,
    locked: false,
    obd_connected: false,
    manual_disconnect: false,
    throttle: 0,
    avgFuel: 0.0,
    instFuel: 0.0,
    iat: 0, // Intake Air Temp
    maf: 0.0, // Mass Air Flow
    stft: 0.0, // Short Term Fuel Trim
    ltft: 0.0, // Long Term Fuel Trim
    timing: 0, // Timing Advance
  });

  const ESP32_IP = "172.18.167.81";

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false); // Agar bisa dibaca di dalam setInterval
  const tripDataRef = useRef<any[]>([]);
  const latestLocation = useRef<any>(null);
  const runningStats = useRef({ distance: 0, fuel: 0, startTime: 0 });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "IZIN DITOLAK",
          "Aplikasi butuh akses GPS untuk merekam rute.",
          "error",
        );
        return;
      }
      // Pantau lokasi GPS setiap 2 detik
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          latestLocation.current = loc.coords;
        },
      );
    })();
  }, []);

  // Fungsi Tombol Record (Start / Stop)
  const toggleRecording = async () => {
    if (!isRecording) {
      // MULAI MEREKAM
      tripDataRef.current = [];
      runningStats.current = { distance: 0, fuel: 0, startTime: Date.now() };
      setIsRecording(true);
      isRecordingRef.current = true;
      showAlert(
        "RECORDING STARTED",
        "Sistem mulai merekam rute & telemetri.",
        "success",
      );
    } else {
      // BERHENTI MEREKAM & SIMPAN
      setIsRecording(false);
      isRecordingRef.current = false;
      await saveTripData();
    }
  };

  const saveTripData = async () => {
    if (tripDataRef.current.length < 5) {
      showAlert(
        "TERLALU PENDEK",
        "Perjalanan terlalu singkat untuk disimpan.",
        "error",
      );
      return;
    }

    const routeData = tripDataRef.current;
    const topSpeed = Math.max(...routeData.map((d) => d.speed));
    const maxRpm = Math.max(...routeData.map((d) => d.rpm));
    const durationMs = Date.now() - runningStats.current.startTime;
    const durationMin = Math.round(durationMs / 60000);

    const newTrip = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      route: `Livina Drive (${durationMin} Min)`,
      ecoScore: maxRpm > 4000 || topSpeed > 100 ? 65 : 92, // Logika Eco Score Sederhana
      distance: runningStats.current.distance.toFixed(1),
      time: durationMin + "m",
      fuel: runningStats.current.fuel.toFixed(1) + " L",
      details: {
        topSpeed: topSpeed + " km/h",
        maxRpm: maxRpm,
        fuelUsed: runningStats.current.fuel.toFixed(1) + " L",
        cost:
          "Rp " +
          Math.round(runningStats.current.fuel * 10000).toLocaleString("id-ID"), // Asumsi Pertalite
      },
      routeData: routeData,
    };

    try {
      const existing = await AsyncStorage.getItem("@livina_trips");
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.unshift(newTrip); // Masukkan di urutan paling atas
      await AsyncStorage.setItem("@livina_trips", JSON.stringify(parsed));
      showAlert(
        "TRIP TERSIMPAN",
        "Data perjalanan berhasil dikirim ke Trip Logs.",
        "success",
      );
    } catch (e) {
      showAlert("ERROR", "Gagal menyimpan perjalanan.", "error");
    }
  };

  const handleConnect = async () => {
    try {
      await fetch(`http://${ESP32_IP}/obd_connect`);
      showAlert("BERHASIL", "Perintah koneksi ECU telah dikirim.", "success");
    } catch (error) {
      showAlert(
        "KONEKSI GAGAL",
        "ESP32 tidak merespon. Pastikan WiFi terhubung ke 'Iqi'.",
        "error",
      );
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`http://${ESP32_IP}/obd_disconnect`);
      showAlert("TERPUTUS", "Koneksi ke ECU diputus secara manual.", "success");
    } catch (error) {
      showAlert("GAGAL", "ESP32 tidak merespon perintah disconnect.", "error");
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`http://${ESP32_IP}/data`);
        const data = await response.json();

        setCarData((prev) => ({
          ...prev,
          speed: data.speed,
          rpm: data.rpm,
          temp: data.temp,
          volt: data.volt,
          maf: data.maf,
          iat: data.iat,
          stft: data.stft,
          ltft: data.ltft,
          timing: data.timing,
          throttle: data.throttle,
          locked: data.locked,
          obd_connected: data.obd_connected,
          manual_disconnect: data.manual_disconnect,
          // Rumus instFuel (Konsumsi BBM Instan) sementara berbasis estimasi MAF & Speed
          instFuel:
            data.speed > 0
              ? parseFloat((data.speed / (data.maf * 0.3)).toFixed(1))
              : 0,
        }));

        if (isRecordingRef.current && latestLocation.current) {
          const dt = 0.5 / 3600; // 500ms dalam satuan Jam
          const currentSpeed = data.speed || 0;
          const fuelFlowLph = (data.maf || 0) * 0.3;

          runningStats.current.distance += currentSpeed * dt;
          runningStats.current.fuel += fuelFlowLph * dt;

          tripDataRef.current.push({
            latitude: latestLocation.current.latitude,
            longitude: latestLocation.current.longitude,
            speed: data.speed,
            rpm: data.rpm,
            temp: data.temp,
            iat: data.iat,
            maf: data.maf,
            stft: data.stft,
            timing: data.timing,
            instFuel:
              data.speed > 0
                ? parseFloat((data.speed / fuelFlowLph).toFixed(1))
                : 0,
            time: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            note:
              currentSpeed > 80
                ? "High Speed"
                : data.rpm > 3500
                  ? "Aggressive Acceleration"
                  : "Cruising",
          });
        }
      } catch {
        setCarData((prev) => ({ ...prev, obd_connected: false }));
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 15 }]}>
      {/* HEADER & STATUS BAR */}
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>
          LIVINA <Text style={{ color: "#ff4444" }}>DASHBOARD</Text>
        </Text>
        <View
          style={[
            styles.statusBar,
            carData.obd_connected
              ? styles.statusOk
              : carData.manual_disconnect
                ? styles.statusManualOff
                : styles.statusError,
          ]}
        >
          <Text style={styles.statusText}>
            {carData.obd_connected
              ? "ECU CONNECTED ✅"
              : carData.manual_disconnect
                ? "ECU DISCONNECTED (MANUAL) 🚫"
                : "MENCARI OBD2... ⏳"}
          </Text>
        </View>

        <View style={[styles.controlsRow]}>
          <TouchableOpacity
            style={[
              styles.btnControl,
              styles.btnConnect,
              carData.obd_connected && styles.btnDisabled,
            ]}
            onPress={handleConnect}
            disabled={carData.obd_connected}
          >
            <Text style={[styles.btnControlText]}>CONNECT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnControl,
              styles.btnDisconnect,
              !carData.obd_connected &&
                carData.manual_disconnect &&
                styles.btnDisabled,
            ]}
            onPress={handleDisconnect}
            disabled={!carData.obd_connected && carData.manual_disconnect}
          >
            <Text style={styles.btnControlText}>DISCONNECT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AREA GAUGE (TETAP DIAM DI ATAS) */}
      <View style={styles.gaugeContainer}>
        <NativeGauge
          value={carData.rpm / 1000}
          maxValue={8}
          step={1}
          title="TACHO"
          unit="x1000 RPM"
          color="#ff4444"
          decimalPlaces={1}
        />
        <NativeGauge
          value={carData.speed}
          maxValue={220}
          step={20}
          title="SPEED"
          unit="KM/H"
          color="#ff4444"
          hideRedline={true}
        />
      </View>

      {/* AREA STATISTIK (BISA DI-SCROLL) */}
      <ScrollView
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>BASIC METRICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatBox
              label="COOLANT TEMP"
              value={carData.temp}
              unit="°C"
              valueColor={carData.temp > 95 ? "#ff4444" : "#fff"}
            />
            <StatBox label="BATTERY" value={carData.volt} unit=" V" />
          </View>
          <View style={styles.statsRow}>
            <StatBox
              label="AVG FUEL"
              value={carData.avgFuel}
              unit=" km/L"
              valueColor="#fff"
            />
            <StatBox
              label="INST FUEL"
              value={carData.instFuel}
              unit=" km/L"
              valueColor="#fff"
            />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>DOOR STATUS</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: carData.locked ? "#00cc00" : "#ff4444" },
                ]}
              >
                {carData.locked ? "LOCKED" : "OPEN"}
              </Text>
            </View>
            <StatBox label="THROTTLE" value={carData.throttle} unit=" %" />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
          ADVANCED TELEMETRY (PRO)
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatBox label="INTAKE TEMP (IAT)" value={carData.iat} unit="°C" />
            <StatBox label="MASS AIR FLOW" value={carData.maf} unit=" g/s" />
          </View>
          <View style={styles.statsRow}>
            {/* STFT berwarna hijau jika irit (minus), merah jika boros (plus) */}
            <StatBox
              label="SHORT FUEL TRIM"
              value={carData.stft}
              unit=" %"
              valueColor={carData.stft > 0 ? "#ff4444" : "#00cc00"}
            />
            <StatBox
              label="LONG FUEL TRIM"
              value={carData.ltft}
              unit=" %"
              valueColor={carData.ltft > 0 ? "#ffcc00" : "#00cc00"}
            />
          </View>
          <View style={styles.statsRow}>
            <StatBox label="TIMING ADVANCE" value={carData.timing} unit="°" />
            <View
              style={[
                styles.statBox,
                {
                  backgroundColor: "transparent",
                  borderColor: "transparent",
                  borderBottomColor: "transparent",
                },
              ]}
            />
          </View>
        </View>

        {/* Ruang kosong di bawah agar nyaman di-scroll */}
        <View style={{ height: 30 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fabRecord, isRecording && styles.fabRecording]}
        onPress={toggleRecording}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isRecording ? "stop" : "radio-button-on"}
          size={32}
          color={isRecording ? "#ff4444" : "#fff"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  headerArea: { paddingHorizontal: 15 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 3,
  },
  statusBar: {
    marginTop: 15,
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  statusOk: {
    backgroundColor: "rgba(165, 175, 165, 0.15)",
    borderColor: "#888",
    borderWidth: 1,
  },
  statusError: {
    backgroundColor: "rgba(110, 17, 17, 0.15)",
    borderColor: "#ff4444",
    borderWidth: 1,
  },
  statusManualOff: {
    backgroundColor: "rgba(255, 165, 0, 0.15)",
    borderColor: "#ffa500",
    borderWidth: 1,
  },

  // Control Buttons Styles
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  btnControl: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  btnConnect: {
    backgroundColor: "#00ac3967",
    borderColor: "#00ff6a",
  },
  btnDisconnect: {
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderColor: "#ff4444",
  },
  btnDisabled: {
    opacity: 0.3,
  },
  btnControlText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  statusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  gaugeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 15,
  },
  gaugeTextContainer: {
    position: "absolute",
    bottom: "22%",
    alignItems: "center",
  },
  gaugeValue: { fontSize: 20, fontWeight: "bold" },
  gaugeUnit: { fontSize: 10, color: "#aaa", fontWeight: "bold" },
  gaugeTitle: {
    position: "absolute",
    bottom: 15,
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
    letterSpacing: 1,
  },

  scrollArea: { flex: 1, paddingHorizontal: 15 },
  sectionLabel: {
    color: "#ff4444",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 5,
  },

  statsGrid: { gap: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: {
    width: "48%",
    backgroundColor: "#1e1e1e",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#333",
  },
  statLabel: {
    fontSize: 10,
    color: "#888",
    marginBottom: 5,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 18, fontWeight: "900", color: "#fff" },
  statUnit: { fontSize: 10, color: "#aaa", fontWeight: "normal" },
  fabRecord: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#ff4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: "#121212",
  },
  fabRecording: {
    backgroundColor: "#1e1e1e",
    borderColor: "#ff4444",
  },
});
