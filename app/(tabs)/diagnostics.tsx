import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAlert } from "../../components/AlertContext";
import { useBLEContext } from "../../components/BLEContext";

export default function DiagnosticsScreen() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showActiveTest, setShowActiveTest] = useState(false);
  const [showO2Stream, setShowO2Stream] = useState(false);
  const [isCylinderLocked, setIsCylinderLocked] = useState(false);
  const [activeCylinder, setActiveCylinder] = useState<number | null>(null);
  const [o2Voltage, setO2Voltage] = useState<number>(0.0);

  // 👇 STATE BARU UNTUK FITUR BYPASS DEVELOPER 👇
  const [isBypassed, setIsBypassed] = useState(false);
  const [bypassTapCount, setBypassTapCount] = useState(0);

  const { showAlert } = useAlert();
  const { isConnected, sendMessage, subscribeRaw } = useBLEContext();
  const insets = useSafeAreaInsets();

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deteksi Layar Responsif
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTabletLandscape = isLandscape && height >= 480;
  const isPhoneLandscape = isLandscape && height < 480;

  // GERBANG KONEKSI UTAMA: Bisa lewat Bluetooth asli ATAU Bypass
  const canAccessTest = isConnected || isBypassed;

  // 1. Reset sub-menu jika koneksi putus DAN tidak sedang bypass
  useEffect(() => {
    if (!isConnected && !isBypassed) {
      setShowActiveTest(false);
      setShowO2Stream(false);
    }
  }, [isConnected, isBypassed]);

  // 2. Terima balasan RAW dari ESP32 (Jika Konek Asli)
  useEffect(() => {
    const unsub = subscribeRaw((raw: string) => {
      if (raw.startsWith("O2:")) {
        const computedVolt = parseFloat(raw.substring(3));
        if (!isNaN(computedVolt)) setO2Voltage(computedVolt);
        return;
      }

      if (!raw.startsWith("RAW_RES:")) return;

      const balasan = raw
        .substring(8)
        .replace(/\s+/g, "")
        .replace(/\r/g, "")
        .replace(/\n/g, "");

      console.log("[DIAGNOSTICS] ECU Reply: ", balasan);

      if (balasan.includes("700C")) {
        console.log("✅ [ACTIVE TEST] ECU MENERIMA PERINTAH CYLINDER CUT!");
      } else if (balasan.includes("7F30")) {
        console.log("❌ [ACTIVE TEST] ECU MENOLAK PERINTAH!");
      }
    });

    return unsub;
  }, [subscribeRaw]);

  // 3. GENERATOR DUMMY O2 (KHUSUS MODE BYPASS TANPA MODUL)
  useEffect(() => {
    let dummyInterval: any;
    if (showO2Stream && isBypassed && !isConnected) {
      dummyInterval = setInterval(() => {
        // Simulasi tegangan osilasi O2 normal (0.1V - 0.85V)
        const randomV = Math.floor(Math.random() * (85 - 10 + 1) + 10) / 100;
        setO2Voltage(randomV);
      }, 700);
    }
    return () => clearInterval(dummyInterval);
  }, [showO2Stream, isBypassed, isConnected]);

  // 4. Kirim perintah O2 Stream ke perangkat keras
  useEffect(() => {
    if (showO2Stream && isConnected) {
      sendMessage("O2_STREAM_START");
    }
    return () => {
      if (showO2Stream && isConnected) sendMessage("O2_STREAM_STOP");
    };
  }, [showO2Stream, isConnected]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && showO2Stream && isConnected) {
        sendMessage("O2_STREAM_STOP");
      }
    });
    return () => sub.remove();
  }, [showO2Stream, isConnected]);

  // ==============================================================
  // 5. AUTO-RESET & STOP STREAM KETIKA PINDAH TAB (UX FIX)
  // ==============================================================
  // Gunakan ref agar nilai state terbaru bisa dibaca di dalam cleanup unfocus
  const isConnectedRef = useRef(isConnected);
  isConnectedRef.current = isConnected;

  const showActiveTestRef = useRef(showActiveTest);
  showActiveTestRef.current = showActiveTest;

  const showO2StreamRef = useRef(showO2Stream);
  showO2StreamRef.current = showO2Stream;

  useFocusEffect(
    useCallback(() => {
      return () => {
        // 1. Matikan Active Test jika sedang terbuka
        if (showActiveTestRef.current) {
          if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
          if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
          if (isConnectedRef.current) sendMessage("ACTIVE_TEST_STOP");
          setActiveCylinder(null);
          setIsCylinderLocked(false);
          setShowActiveTest(false); // Kembalikan menu ke awal
        }

        // 2. Matikan Stream O2 jika sedang terbuka
        if (showO2StreamRef.current) {
          if (isConnectedRef.current) sendMessage("O2_STREAM_STOP");
          setShowO2Stream(false); // Kembalikan menu ke awal
        }
      };
    }, []),
  );
  // ==============================================================

  // Logika PIN
  const handleVerifyPin = (text: string) => {
    setPinInput(text);
    if (text === "8888") {
      setIsUnlocked(true);
      setPinInput("");
      showAlert("Akses Diberikan", "Menu diagnostik terbuka.", "success");
    } else if (text.length === 4) {
      showAlert("Akses Ditolak", "PIN salah. Coba lagi.", "error");
      setPinInput("");
    }
  };

  // Logika Bypass Tap
  const handleBypassTrigger = () => {
    if (isConnected) return;
    const nextTap = bypassTapCount + 1;
    if (nextTap >= 3) {
      const nextState = !isBypassed;
      setIsBypassed(nextState);
      setBypassTapCount(0);
      showAlert(
        "DEV BYPASS MODE",
        nextState
          ? "Mode simulasi aktif! Semua tes diagnostik telah dibuka."
          : "Mode simulasi dimatikan.",
        nextState ? "success" : "info",
      );
    } else {
      setBypassTapCount(nextTap);
    }
  };

  // Logika Active Test
  const stopCylinderTest = () => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    if (isConnected) sendMessage("ACTIVE_TEST_STOP");
    setActiveCylinder(null);
    setTimeout(() => setIsCylinderLocked(false), 800);
  };

  const handlePressIn = (cylinder: number) => {
    if (isCylinderLocked || !canAccessTest) return;
    setIsCylinderLocked(true);
    setActiveCylinder(cylinder);

    if (isConnected) {
      sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);
      heartbeatTimer.current = setInterval(() => {
        sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);
      }, 300);
    }
    autoStopTimer.current = setTimeout(stopCylinderTest, 5000);
  };

  const handlePressOut = () => {
    if (activeCylinder !== null) stopCylinderTest();
  };

  // --- RENDER LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.lockContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockTitle}>DIAGNOSTICS LOCKED</Text>
          <Text style={styles.lockDesc}>Masukkan PIN Khusus ProDash</Text>
          <TextInput
            style={[
              styles.pinInput,
              isPhoneLandscape && {
                fontSize: 24,
                paddingVertical: 10,
                width: 250,
              },
            ]}
            value={pinInput}
            onChangeText={handleVerifyPin}
            placeholder="••••"
            placeholderTextColor="#333"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- RENDER MENU UTAMA ---
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={[
          styles.container,
          {
            paddingHorizontal: isPhoneLandscape ? 35 : 35,
            flex: 1,
            marginBottom: 20,
          },
        ]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: isLandscape ? 60 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SECTION */}
        <View style={styles.headerContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>DIAGNOSTICS</Text>
            <TouchableOpacity
              onPress={() => setIsUnlocked(false)}
              style={styles.lockBtn}
            >
              <Text
                style={{ color: "#FF453A", fontSize: 12, fontWeight: "700" }}
              >
                LOCK
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Nissan Consult Advanced Mode
          </Text>

          {/* INDIKATOR STATUS KONEKSI & BYPASS TRIGGER */}
          {!isConnected && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleBypassTrigger}
              style={{
                alignSelf: "flex-start",
                marginTop: 10,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: isBypassed
                  ? "rgba(255, 204, 0, 0.15)"
                  : "rgba(255, 69, 58, 0.15)",
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isBypassed ? "#FFCC00" : "#FF453A",
              }}
            >
              <Text
                style={{
                  color: isBypassed ? "#FFCC00" : "#FF453A",
                  fontSize: 12,
                  fontWeight: "700",
                }}
              >
                {isBypassed
                  ? "🟡 DEV BYPASS ACTIVE (Simulasi Mode)"
                  : `🔴 Modul Offline`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 1. MENU PEMILIHAN TEST */}
        {!showActiveTest && !showO2Stream && (
          <View style={styles.menuContainer}>
            <Text style={styles.sectionTitle}>Available Tests</Text>

            <View
              style={{
                flexDirection: isTabletLandscape ? "row" : "column",
                gap: 12,
              }}
            >
              {/* KARTU ACTIVE TEST */}
              <TouchableOpacity
                style={[
                  styles.menuCard,
                  !canAccessTest && styles.disabledCard,
                  isTabletLandscape && { flex: 1, marginBottom: 0 },
                ]}
                activeOpacity={canAccessTest ? 0.7 : 1}
                onPress={() =>
                  canAccessTest
                    ? setShowActiveTest(true)
                    : showAlert(
                        "Koneksi Diperlukan",
                        "Hubungkan ke modul BLE atau gunakan Bypass Mode.",
                        "error",
                      )
                }
              >
                <View
                  style={[
                    styles.menuCardIcon,
                    !canAccessTest && styles.disabledIcon,
                  ]}
                >
                  <Text style={styles.iconText}>⚡</Text>
                </View>
                <View style={styles.menuCardContent}>
                  <Text
                    style={[
                      styles.menuCardTitle,
                      !canAccessTest && styles.disabledText,
                    ]}
                  >
                    Active Test
                  </Text>
                  <Text style={styles.menuCardDesc}>
                    Cylinder Cut, Relay Control, etc.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>

              {/* KARTU OXYGEN SENSOR */}
              <TouchableOpacity
                style={[
                  styles.menuCard,
                  !canAccessTest && styles.disabledCard,
                  isTabletLandscape && { flex: 1, marginBottom: 0 },
                ]}
                activeOpacity={canAccessTest ? 0.7 : 1}
                onPress={() =>
                  canAccessTest
                    ? setShowO2Stream(true)
                    : showAlert(
                        "Koneksi Diperlukan",
                        "Hubungkan ke modul BLE atau gunakan Bypass Mode.",
                        "error",
                      )
                }
              >
                <View
                  style={[
                    styles.menuCardIcon,
                    !canAccessTest && styles.disabledIcon,
                  ]}
                >
                  <Text style={styles.iconText}>🧪</Text>
                </View>
                <View style={styles.menuCardContent}>
                  <Text
                    style={[
                      styles.menuCardTitle,
                      !canAccessTest && styles.disabledText,
                    ]}
                  >
                    Oxygen Sensor Monitor
                  </Text>
                  <Text style={styles.menuCardDesc}>
                    Live stream data voltage HO2S (B1S1)
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 2. SUB-MENU ACTIVE TEST (CYLINDER CUT) */}
        {showActiveTest && (
          <View style={styles.activeTestContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowActiveTest(false)}
            >
              <Text style={styles.backButtonText}>‹ Back to Menu</Text>
            </TouchableOpacity>

            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ SAFETY WARNING</Text>
              <Text style={styles.warningText}>
                TAHAN tombol untuk memutus pengapian silinder. Lepas untuk
                menyalakan kembali.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Cylinder Power Balance</Text>

            {/* CYLINDER GRID RESPONSIF */}
            <View
              style={[
                styles.cylinderGrid,
                isLandscape && {
                  flexWrap: "nowrap",
                  gap: 10,
                },
              ]}
            >
              {[1, 2, 3, 4].map((cyl) => (
                <Pressable
                  key={cyl}
                  disabled={isCylinderLocked && activeCylinder !== cyl}
                  style={[
                    styles.cylButton,
                    isLandscape
                      ? { flex: 1, aspectRatio: 1.3 }
                      : { width: "48%" },
                    activeCylinder === cyl && styles.cylButtonPressed,
                    isCylinderLocked &&
                      activeCylinder !== cyl && { opacity: 0.3 },
                  ]}
                  onPressIn={() => handlePressIn(cyl)}
                  onPressOut={handlePressOut}
                >
                  <Text
                    style={[
                      styles.cylButtonNumber,
                      isPhoneLandscape && { fontSize: 22 },
                    ]}
                  >
                    CYL {cyl}
                  </Text>
                  <Text
                    style={[
                      styles.cylButtonLabel,
                      isPhoneLandscape && { fontSize: 10 },
                    ]}
                  >
                    {activeCylinder === cyl ? "CUTTING..." : "HOLD TO CUT"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 3. SUB-MENU LIVE STREAM O2 SENSOR */}
        {showO2Stream && (
          <View style={styles.activeTestContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowO2Stream(false)}
            >
              <Text style={styles.backButtonText}>‹ Back to Menu</Text>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: isLandscape ? "row" : "column",
                gap: 16,
                alignItems: isLandscape ? "stretch" : "center",
              }}
            >
              {/* KOLOM KIRI / ATAS: DISPLAY VOLTAGE */}
              <View
                style={[
                  styles.o2DisplayCard,
                  isLandscape && { flex: 1.2, marginBottom: 0 },
                ]}
              >
                <Text style={styles.o2CardTitle}>O2 SENSOR BANK 1 S1</Text>
                <Text
                  style={[
                    styles.o2CardValue,
                    isPhoneLandscape && { fontSize: 42, marginBottom: 10 },
                  ]}
                >
                  {o2Voltage.toFixed(2)}{" "}
                  <Text style={{ fontSize: 24, color: "#8E8E93" }}>V</Text>
                </Text>

                <View
                  style={[
                    styles.mixtureBadge,
                    {
                      backgroundColor: o2Voltage > 0.45 ? "#3A1414" : "#1C3A27",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: o2Voltage > 0.45 ? "#FF453A" : "#30D158",
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    {o2Voltage > 0.45
                      ? "RICH MIXTURE (Kaya)"
                      : "LEAN MIXTURE (Miskin)"}
                  </Text>
                </View>
              </View>

              {/* KOLOM KANAN / BAWAH: INFO CARD */}
              <View
                style={[
                  styles.infoCard,
                  isLandscape && { flex: 1, justifyContent: "center" },
                ]}
              >
                <Text style={styles.infoText}>
                  💡 Tegangan sensor O2 normalnya akan berosilasi naik turun
                  dengan cepat antara{" "}
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    0.1V s/d 0.9V
                  </Text>{" "}
                  saat mesin berada dalam loop tertutup (Closed Loop).
                </Text>
                {isBypassed && !isConnected && (
                  <Text
                    style={{
                      color: "#FFCC00",
                      fontSize: 11,
                      marginTop: 10,
                      fontStyle: "italic",
                    }}
                  >
                    * Menampilkan data simulasi osilasi O2 (Bypass Mode).
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#000000" },
  container: { flex: 1, backgroundColor: "#000000" },
  contentContainer: { paddingTop: 20 },
  lockContainer: {
    flexGrow: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  lockIcon: { fontSize: 48, marginBottom: 16 },
  lockTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 8,
  },
  lockDesc: {
    color: "#666666",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
  },
  pinInput: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
    borderWidth: 1,
    color: "#00ff88",
    fontSize: 32,
    fontWeight: "900",
    width: "80%",
    maxWidth: 280,
    paddingVertical: 14,
    borderRadius: 16,
    textAlign: "center",
    letterSpacing: 12,
  },
  headerContainer: { marginBottom: 24 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  lockBtn: {
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#00ff88",
    marginBottom: 14,
  },
  menuContainer: { flex: 1 },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  menuCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconText: { fontSize: 22 },
  menuCardContent: { flex: 1 },
  menuCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  menuCardDesc: { fontSize: 13, color: "#8E8E93" },
  chevron: { fontSize: 26, color: "#555555", marginLeft: 10 },

  disabledCard: {
    backgroundColor: "#121214",
    borderColor: "#1C1C1E",
    opacity: 0.4,
  },
  disabledIcon: { backgroundColor: "#1C1C1E" },
  disabledText: { color: "#8E8E93" },

  activeTestContainer: { flex: 1 },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#1C1C1E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  backButtonText: { color: "#00ff88", fontSize: 14, fontWeight: "700" },
  warningCard: {
    backgroundColor: "#3A1414",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FF453A",
  },
  warningTitle: {
    color: "#FF453A",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  warningText: { color: "#FFD6D6", fontSize: 13, lineHeight: 20 },
  cylinderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cylButton: {
    aspectRatio: 1.1,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  cylButtonPressed: {
    backgroundColor: "#FF453A",
    borderColor: "#FF6961",
    transform: [{ scale: 0.95 }],
  },
  cylButtonNumber: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  cylButtonLabel: { fontSize: 11, fontWeight: "700", color: "#8E8E93" },
  o2DisplayCard: {
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#2C2C2E",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  o2CardTitle: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  o2CardValue: {
    color: "#00ff88",
    fontSize: 52,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 16,
  },
  mixtureBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  infoCard: {
    backgroundColor: "#121214",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1C1C1E",
    width: "100%",
  },
  infoText: { color: "#8E8E93", fontSize: 13, lineHeight: 20 },
});
