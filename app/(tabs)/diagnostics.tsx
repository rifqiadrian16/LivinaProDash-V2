import React, { useEffect, useRef, useState } from "react";
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
} from "react-native";
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

  // 👇 STATE BARU UNTUK KONEKSI 👇
  const { showAlert } = useAlert();
  const { isConnected, sendMessage, subscribeRaw } = useBLEContext();

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Menerima Balasan RAW & SINKRONISASI KONEKSI
  // 1. Reset sub-menu otomatis kalau koneksi global putus
  useEffect(() => {
    if (!isConnected) {
      setShowActiveTest(false);
      setShowO2Stream(false);
    }
  }, [isConnected]);

  // 2. Terima balasan RAW (O2 Sensor & Active Test) lewat Context — bukan event lagi
  useEffect(() => {
    const unsub = subscribeRaw((raw: string) => {
      // ⬇️ BARU: O2 sekarang push otonom dari ESP32, cek duluan & return
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
        console.log(
          "❌ [ACTIVE TEST] ECU MENOLAK PERINTAH! Kode Error: ",
          balasan,
        );
      }
    });

    return unsub;
  }, [subscribeRaw]);

  // 2. Mengirim Request O2 secara berkala saat Menu Dibuka
  useEffect(() => {
    if (showO2Stream && isConnected) {
      sendMessage("O2_STREAM_START");
    }
    return () => {
      if (showO2Stream) sendMessage("O2_STREAM_STOP");
    };
  }, [showO2Stream, isConnected]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && showO2Stream) {
        sendMessage("O2_STREAM_STOP");
      }
    });
    return () => sub.remove();
  }, [showO2Stream]);

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

  // Logika Active Test
  const stopCylinderTest = () => {
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
    sendMessage("ACTIVE_TEST_STOP");
    setActiveCylinder(null);
    setTimeout(() => setIsCylinderLocked(false), 1000);
  };

  const handlePressIn = (cylinder: number) => {
    if (isCylinderLocked || !isConnected) return;
    setIsCylinderLocked(true);
    setActiveCylinder(cylinder);

    sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);
    heartbeatTimer.current = setInterval(() => {
      sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);
    }, 300);
    autoStopTimer.current = setTimeout(stopCylinderTest, 5000);
  };

  const handlePressOut = () => {
    if (activeCylinder !== null) stopCylinderTest();
  };

  // --- RENDER LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockTitle}>DIAGNOSTICS LOCKED</Text>
        <Text style={styles.lockDesc}>Masukkan PIN Khusus ProDash</Text>
        <TextInput
          style={styles.pinInput}
          value={pinInput}
          onChangeText={handleVerifyPin}
          placeholder="••••"
          placeholderTextColor="#333"
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
        />
      </View>
    );
  }

  // --- RENDER MENU UTAMA ---
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>DIAGNOSTICS</Text>
          <TouchableOpacity
            onPress={() => setIsUnlocked(false)}
            style={styles.lockBtn}
          >
            <Text style={{ color: "#FF453A", fontSize: 12, fontWeight: "700" }}>
              LOCK
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Nissan Consult Advanced Mode</Text>

        {/* Indikator Status Koneksi Tambahan */}
        {!isConnected && (
          <Text
            style={{
              color: "#FF453A",
              fontSize: 13,
              fontWeight: "600",
              marginTop: 10,
            }}
          >
            🔴 Modul Offline - Menu Dikunci
          </Text>
        )}
      </View>

      {!showActiveTest && !showO2Stream && (
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Available Tests</Text>

          <TouchableOpacity
            style={[styles.menuCard, !isConnected && styles.disabledCard]}
            activeOpacity={isConnected ? 0.7 : 1}
            onPress={() =>
              isConnected
                ? setShowActiveTest(true)
                : showAlert(
                    "Koneksi Diperlukan",
                    "Hubungkan aplikasi ke modul ESP32 terlebih dahulu di tab Home.",
                    "error",
                  )
            }
          >
            <View
              style={[styles.menuCardIcon, !isConnected && styles.disabledIcon]}
            >
              <Text style={styles.iconText}>⚡</Text>
            </View>
            <View style={styles.menuCardContent}>
              <Text
                style={[
                  styles.menuCardTitle,
                  !isConnected && styles.disabledText,
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

          <TouchableOpacity
            style={[styles.menuCard, !isConnected && styles.disabledCard]}
            activeOpacity={isConnected ? 0.7 : 1}
            onPress={() =>
              isConnected
                ? setShowO2Stream(true)
                : showAlert(
                    "Koneksi Diperlukan",
                    "Hubungkan aplikasi ke modul ESP32 terlebih dahulu di tab Home.",
                    "error",
                  )
            }
          >
            <View
              style={[styles.menuCardIcon, !isConnected && styles.disabledIcon]}
            >
              <Text style={styles.iconText}>🧪</Text>
            </View>
            <View style={styles.menuCardContent}>
              <Text
                style={[
                  styles.menuCardTitle,
                  !isConnected && styles.disabledText,
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
      )}

      {showActiveTest && (
        <View style={styles.activeTestContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowActiveTest(false)}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ SAFETY WARNING</Text>
            <Text style={styles.warningText}>
              TAHAN tombol untuk memutus pengapian silinder.
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Cylinder Power Balance</Text>
          <View style={styles.cylinderGrid}>
            {[1, 2, 3, 4].map((cyl) => (
              <Pressable
                key={cyl}
                disabled={isCylinderLocked && activeCylinder !== cyl}
                style={[
                  styles.cylButton,
                  activeCylinder === cyl && styles.cylButtonPressed,
                  isCylinderLocked &&
                    activeCylinder !== cyl && { opacity: 0.4 },
                ]}
                onPressIn={() => handlePressIn(cyl)}
                onPressOut={handlePressOut}
              >
                <Text style={styles.cylButtonNumber}>CYL {cyl}</Text>
                <Text style={styles.cylButtonLabel}>
                  {activeCylinder === cyl ? "CUTTING..." : "HOLD TO CUT"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {showO2Stream && (
        <View style={styles.activeTestContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowO2Stream(false)}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.o2DisplayCard}>
            <Text style={styles.o2CardTitle}>O2 SENSOR BANK 1 S1</Text>
            <Text style={styles.o2CardValue}>
              {o2Voltage.toFixed(2)}{" "}
              <Text style={{ fontSize: 24, color: "#8E8E93" }}>V</Text>
            </Text>

            <View
              style={[
                styles.mixtureBadge,
                { backgroundColor: o2Voltage > 0.45 ? "#3A1414" : "#1C3A27" },
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

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              💡 Tegangan sensor O2 normalnya akan berosilasi naik turun dengan
              cepat antara 0.1V s/d 0.9V saat mesin berada dalam loop tertutup
              (Closed Loop).
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  contentContainer: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  lockContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  lockIcon: { fontSize: 48, marginBottom: 20 },
  lockTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 10,
  },
  lockDesc: {
    color: "#666666",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
  },
  pinInput: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
    borderWidth: 1,
    color: "#00ff88",
    fontSize: 32,
    fontWeight: "900",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 16,
    textAlign: "center",
    letterSpacing: 12,
  },
  headerContainer: { marginBottom: 30 },
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
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 6,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00ff88",
    marginBottom: 16,
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
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconText: { fontSize: 22 },
  menuCardContent: { flex: 1 },
  menuCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  menuCardDesc: { fontSize: 13, color: "#8E8E93" },
  chevron: { fontSize: 26, color: "#555555", marginLeft: 10 },

  // STYLE TAMBAHAN KETIKA MODUL BELUM KONEK
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
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  backButtonText: { color: "#00ff88", fontSize: 15, fontWeight: "700" },
  warningCard: {
    backgroundColor: "#3A1414",
    borderRadius: 16,
    padding: 18,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#FF453A",
  },
  warningTitle: {
    color: "#FF453A",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  warningText: { color: "#FFD6D6", fontSize: 14, lineHeight: 22 },
  cylinderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cylButton: {
    width: "48%",
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
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  cylButtonLabel: { fontSize: 12, fontWeight: "700", color: "#8E8E93" },
  o2DisplayCard: {
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#2C2C2E",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  o2CardTitle: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  o2CardValue: {
    color: "#00ff88",
    fontSize: 56,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 20,
  },
  mixtureBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  infoCard: {
    backgroundColor: "#121214",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1C1C1E",
  },
  infoText: { color: "#666666", fontSize: 13, lineHeight: 20 },
});
