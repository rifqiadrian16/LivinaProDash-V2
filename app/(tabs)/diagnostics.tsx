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

import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useBLE from "../../hooks/useBLE";
// Tambahkan import AlertContext
import { useAlert } from "../../components/AlertContext";

export default function DiagnosticsScreen() {
  const [showActiveTest, setShowActiveTest] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);
  const [isCylinderLocked, setIsCylinderLocked] = useState(false);
  const [activeCylinder, setActiveCylinder] = useState<number | null>(null);

  const { isConnected, sendMessage } = useBLE();
  // Gunakan hook dari AlertContext
  const { showAlert } = useAlert();

  const canAccessActiveTest = isConnected || isBypassed;

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCylinderTest = () => {
    console.log("[CYL CUT] STOP");

    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
      console.log("[TIMER] Heartbeat dihentikan");
    }

    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }

    console.log("[BLE SEND] ACTIVE_TEST_STOP");
    sendMessage("ACTIVE_TEST_STOP");

    setActiveCylinder(null);

    setTimeout(() => {
      console.log("[LOCK] Cylinder test unlocked");
      setIsCylinderLocked(false);
    }, 1000);
  };

  const handlePressIn = (cylinder: number) => {
    if (isCylinderLocked) {
      console.log("[CYL CUT] Tombol terkunci");
      return;
    }

    console.log(`[CYL CUT] START Cylinder ${cylinder}`);

    setIsCylinderLocked(true);
    setActiveCylinder(cylinder);

    console.log(`[BLE SEND] ACTIVE_TEST_CYL:${cylinder}`);
    sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);

    heartbeatTimer.current = setInterval(() => {
      console.log(`[BLE SEND] ACTIVE_TEST_CYL:${cylinder} (heartbeat)`);
      sendMessage(`ACTIVE_TEST_CYL:${cylinder}`);
    }, 300);

    autoStopTimer.current = setTimeout(() => {
      console.log(`[CYL CUT] AUTO STOP Cylinder ${cylinder} setelah 5 detik`);

      stopCylinderTest();
    }, 5000);
  };

  const handlePressOut = () => {
    if (activeCylinder === null) return;

    console.log("[CYL CUT] Tombol dilepas");

    stopCylinderTest();
  };

  const handleDevBypass = () => {
    const nextState = !isBypassed;
    setIsBypassed(nextState);

    // Ganti Alert bawaan dengan showAlert dari AlertContext
    showAlert(
      "Development Mode",
      nextState
        ? "Bypass ECU teraktifkan! Anda bisa menguji UI Active Test."
        : "Bypass dimatikan. Mengikuti koneksi asli ECU.",
    );
  };

  const handleActiveTestPress = () => {
    if (canAccessActiveTest) {
      setShowActiveTest(true);
    } else {
      // Ganti Alert bawaan dengan showAlert dari AlertContext
      showAlert(
        "Koneksi Diperlukan",
        "Aplikasi belum terhubung ke ECU. Silakan hubungkan terlebih dahulu di halaman Utama.",
      );
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>DIAGNOSTICS</Text>
          {isBypassed && (
            <View style={styles.bypassBadge}>
              <Text style={styles.bypassText}>🟢 DEV MODE</Text>
            </View>
          )}
        </View>

        {/* LAKUKAN LONG PRESS DI SINI UNTUK BYPASS */}
        <TouchableOpacity onLongPress={handleDevBypass} activeOpacity={1}>
          <Text style={styles.headerSubtitle}>
            Nissan Consult Advanced Mode
          </Text>
        </TouchableOpacity>
      </View>

      {!showActiveTest ? (
        // --- MENU UTAMA DIAGNOSTICS ---
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Available Tests</Text>

          <TouchableOpacity
            style={[
              styles.menuCard,
              !canAccessActiveTest && styles.disabledCard,
            ]}
            activeOpacity={canAccessActiveTest ? 0.7 : 1}
            onPress={handleActiveTestPress}
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

          {/* Menu Read DTC (Selalu Terkunci / Coming Soon) */}
          <TouchableOpacity
            style={[styles.menuCard, styles.disabledCard]}
            activeOpacity={1}
          >
            <View style={[styles.menuCardIcon, styles.disabledIcon]}>
              <Text style={styles.iconText}>🔍</Text>
            </View>
            <View style={styles.menuCardContent}>
              <Text style={[styles.menuCardTitle, styles.disabledText]}>
                Read DTC
              </Text>
              <Text style={styles.menuCardDesc}>
                Read engine fault codes (Coming Soon)
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        // --- SUB-MENU ACTIVE TEST ---
        <View style={styles.activeTestContainer}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => setShowActiveTest(false)}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ SAFETY WARNING</Text>
            <Text style={styles.warningText}>
              TAHAN tombol untuk memutus pengapian silinder. LEPAS untuk
              menormalkan kembali. Hati-hati, mesin bisa bergetar/pincang.
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
                <>
                  <Text
                    style={[
                      styles.cylButtonNumber,
                      activeCylinder === cyl && styles.textPressed,
                    ]}
                  >
                    CYL {cyl}
                  </Text>

                  <Text
                    style={[
                      styles.cylButtonLabel,
                      activeCylinder === cyl && styles.textPressed,
                    ]}
                  >
                    {activeCylinder === cyl
                      ? "CUTTING..."
                      : isCylinderLocked
                        ? "LOCKED"
                        : "HOLD TO CUT"}
                  </Text>
                </>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  contentContainer: { padding: 20, paddingTop: 50, paddingBottom: 40 },

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
  headerSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 6,
    fontWeight: "500",
  },

  bypassBadge: {
    backgroundColor: "#1C3A27",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30D158",
  },
  bypassText: { color: "#30D158", fontSize: 11, fontWeight: "700" },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00ff88",
    marginBottom: 16,
    letterSpacing: 0.5,
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
  menuCardDesc: { fontSize: 13, color: "#8E8E93", lineHeight: 18 },
  chevron: {
    fontSize: 26,
    color: "#555555",
    marginLeft: 10,
    fontWeight: "300",
  },

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
  warningText: {
    color: "#FFD6D6",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },

  cylinderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 5,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
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
  cylButtonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 1.2,
  },
  textPressed: { color: "#FFFFFF" },
});
