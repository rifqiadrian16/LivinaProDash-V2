// import { Ionicons } from "@expo/vector-icons";
// import React from "react";
// import { StyleSheet, Text, View } from "react-native";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// export default function DiagnosticsScreen() {
//   const insets = useSafeAreaInsets();

//   return (
//     <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
//       <View style={styles.content}>
//         {/* ICON ANIMASI ATAU STATIS */}
//         <View style={styles.iconCircle}>
//           <Ionicons name="construct-outline" size={80} color="#333" />
//           <View style={styles.badge}>
//             <Text style={styles.badgeText}>PRO</Text>
//           </View>
//         </View>

//         <Text style={styles.title}>DIAGNOSTICS</Text>
//         <Text style={styles.comingSoon}>COMING SOON</Text>

//         <View style={styles.divider} />

//         <Text style={styles.description}>
//           Fitur pemindaian DTC (Diagnostic Trouble Codes) dan pembersihan memori
//           ECU sedang dalam tahap pengembangan untuk versi ProDash selanjutnya.
//         </Text>

//         <View style={styles.featureList}>
//           <View style={styles.featureItem}>
//             <Ionicons name="checkmark-circle" size={16} color="#444" />
//             <Text style={styles.featureText}>
//               Deep ECU Scan (Nissan Protocol)
//             </Text>
//           </View>
//           <View style={styles.featureItem}>
//             <Ionicons name="checkmark-circle" size={16} color="#444" />
//             <Text style={styles.featureText}>Clear Trouble Codes</Text>
//           </View>
//           <View style={styles.featureItem}>
//             <Ionicons name="checkmark-circle" size={16} color="#444" />
//             <Text style={styles.featureText}>Freeze Frame Data</Text>
//           </View>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#050505",
//     padding: 25,
//   },
//   content: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   iconCircle: {
//     width: 160,
//     height: 160,
//     borderRadius: 80,
//     backgroundColor: "#0a0a0a",
//     borderWidth: 1,
//     borderColor: "#151515",
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 30,
//   },
//   badge: {
//     position: "absolute",
//     top: 20,
//     right: 10,
//     backgroundColor: "#ff4444",
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 5,
//   },
//   badgeText: {
//     color: "#fff",
//     fontSize: 10,
//     fontWeight: "bold",
//   },
//   title: {
//     color: "#fff",
//     fontSize: 28,
//     fontWeight: "900",
//     letterSpacing: 4,
//   },
//   comingSoon: {
//     color: "#ff4444",
//     fontSize: 14,
//     fontWeight: "bold",
//     letterSpacing: 2,
//     marginTop: 5,
//   },
//   divider: {
//     width: 40,
//     height: 4,
//     backgroundColor: "#333",
//     borderRadius: 2,
//     marginVertical: 25,
//   },
//   description: {
//     color: "#666",
//     textAlign: "center",
//     fontSize: 14,
//     lineHeight: 22,
//     paddingHorizontal: 20,
//     marginBottom: 40,
//   },
//   featureList: {
//     width: "100%",
//     paddingHorizontal: 40,
//   },
//   featureItem: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//     gap: 10,
//   },
//   featureText: {
//     color: "#444",
//     fontSize: 13,
//     fontWeight: "500",
//   },
// });

import React, { useEffect, useRef, useState } from "react";
import {
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
import useBLE from "../../hooks/useBLE";

export default function DiagnosticsScreen() {
  // State untuk Kunci PIN
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");

  // State menu utama
  const [showActiveTest, setShowActiveTest] = useState(false);
  const [showO2Stream, setShowO2Stream] = useState(false);

  // State data tes
  const [isBypassed, setIsBypassed] = useState(false);
  const [isCylinderLocked, setIsCylinderLocked] = useState(false);
  const [activeCylinder, setActiveCylinder] = useState<number | null>(null);
  const [o2Voltage, setO2Voltage] = useState<number>(0.0);

  const { showAlert } = useAlert();
  const o2IntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Callback internal untuk menangani respon RAW data dari ESP32 (Respon O2 Sensor)
  const handleRawTextReceived = (raw: string) => {
    if (raw.startsWith("RAW_RES:")) {
      const balasan = raw.substring(8).replace(/\s+/g, ""); // Bersihkan spasi
      // Deteksi Header response Consult-II / UDS untuk PID 1118 (62 11 18)
      const idx = balasan.indexOf("621118");
      if (idx !== -1 && balasan.length >= idx + 8) {
        const hexA = balasan.substring(idx + 6, idx + 8);
        const decimalA = parseInt(hexA, 16);

        // Rumus konversi standar O2 Sensor Nissan Consult: Volt = A * 0.01 (atau A * 0.005 tergantung tipe sensor)
        const computedVolt = decimalA * 0.01;
        setO2Voltage(computedVolt);
      }
    }
  };

  const { isConnected, sendMessage } = useBLE(undefined, handleRawTextReceived);
  const canAccessActiveTest = isConnected || isBypassed;

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- LOGIKA POLLING OXYGEN SENSOR ---
  useEffect(() => {
    if (showO2Stream && isConnected) {
      // Jalankan polling setiap 400ms hanya ketika sub-menu O2 dibuka
      o2IntervalRef.current = setInterval(() => {
        sendMessage("RAW:2211180401");
      }, 400);
    } else {
      if (o2IntervalRef.current) {
        clearInterval(o2IntervalRef.current);
        o2IntervalRef.current = null;
      }
    }

    return () => {
      if (o2IntervalRef.current) clearInterval(o2IntervalRef.current);
    };
  }, [showO2Stream, isConnected]);

  // --- LOGIKA VERIFIKASI PIN ---
  const handleVerifyPin = (text: string) => {
    setPinInput(text);
    if (text === "8888") {
      // PIN Langsung Ditetapkan untuk Customer
      setIsUnlocked(true);
      setPinInput("");
      showAlert(
        "Akses Diberikan",
        "Menu diagnostik tingkat lanjut terbuka.",
        "success",
      );
    } else if (text.length === 4) {
      showAlert("Akses Ditolak", "PIN Mas salah. Silakan coba lagi.", "error");
      setPinInput("");
    }
  };

  const stopCylinderTest = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }
    sendMessage("ACTIVE_TEST_STOP");
    setActiveCylinder(null);
    setTimeout(() => {
      setIsCylinderLocked(false);
    }, 1000);
  };

  const handlePressIn = (cylinder: number) => {
    if (isCylinderLocked) return;
    setIsCylinderLocked(true);
    setActiveCylinder(cylinder);
    sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);

    heartbeatTimer.current = setInterval(() => {
      sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);
    }, 300);

    autoStopTimer.current = setTimeout(() => {
      stopCylinderTest();
    }, 5000);
  };

  const handlePressOut = () => {
    if (activeCylinder === null) return;
    stopCylinderTest();
  };

  const handleDevBypass = () => {
    const nextState = !isBypassed;
    setIsBypassed(nextState);
    showAlert(
      "Development Mode",
      nextState
        ? "Bypass ECU teraktifkan! Anda bisa menguji UI Active Test."
        : "Bypass dimatikan. Mengikuti koneksi asli ECU.",
    );
  };

  // --- RENDER SCREEN LOCK JIKA BELUM TERVERIFIKASI ---
  if (!isUnlocked) {
    return (
      <View style={styles.lockContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockTitle}>DIAGNOSTICS LOCKED</Text>
        <Text style={styles.lockDesc}>
          Masukkan PIN Khusus ProDash untuk Mengakses Alat Mekanik
        </Text>
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
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
        <TouchableOpacity onLongPress={handleDevBypass} activeOpacity={1}>
          <Text style={styles.headerSubtitle}>
            Nissan Consult Advanced Mode
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAMPILAN MENU UTAMA DIAGNOSTIK */}
      {!showActiveTest && !showO2Stream && (
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Available Tests</Text>

          {/* Card Menu 1: Active Test */}
          <TouchableOpacity
            style={[
              styles.menuCard,
              !canAccessActiveTest && styles.disabledCard,
            ]}
            activeOpacity={canAccessActiveTest ? 0.7 : 1}
            onPress={() =>
              canAccessActiveTest
                ? setShowActiveTest(true)
                : showAlert(
                    "Koneksi Diperlukan",
                    "Hubungkan aplikasi ke ECU terlebih dahulu.",
                    "error",
                  )
            }
          >
            <View
              style={[
                styles.menuCardIcon,
                !canAccessActiveTest && styles.disabledIcon,
              ]}
            >
              <Text style={styles.iconText}>⚡</Text>
            </View>
            <View style={styles.menuCardContent}>
              <Text
                style={[
                  styles.menuCardTitle,
                  !canAccessActiveTest && styles.disabledText,
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

          {/* Card Menu Baru: Oxygen Sensor Live Stream */}
          <TouchableOpacity
            style={[styles.menuCard, !isConnected && styles.disabledCard]}
            activeOpacity={isConnected ? 0.7 : 1}
            onPress={() =>
              isConnected
                ? setShowO2Stream(true)
                : showAlert(
                    "Koneksi Diperlukan",
                    "Fitur Live Stream O2 membutuhkan koneksi real-time ke modul OBD2.",
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
                Live stream data voltage HO2S (Bank 1 Sensor 1)
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* SUB-MENU 1: ACTIVE TEST */}
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
              TAHAN tombol untuk memutus pengapian silinder. Mesin akan pincang
              sesaat demi uji keseimbangan daya.
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

      {/* SUB-MENU Baru: OXYGEN SENSOR STREAM */}
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

            {/* Indikator Kondisi Campuran Udara-Bahan Bakar */}
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
