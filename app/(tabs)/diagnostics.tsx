import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAlert } from "../../components/AlertContext";

export default function DiagnosticsScreen() {
  const { showAlert } = useAlert();
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [dtcList, setDtcList] = useState<{ code: string; desc: string }[]>([]);
  const insets = useSafeAreaInsets();

  const espIpRef = useRef("192.168.4.1");

  useFocusEffect(
    useCallback(() => {
      const loadIp = async () => {
        const savedIp = await AsyncStorage.getItem("@esp_ip");
        if (savedIp) {
          espIpRef.current = savedIp;
        }
      };
      loadIp();
    }, []),
  );

  const startScan = async () => {
    setIsScanning(true);
    setHasScanned(false);
    setDtcList([]);

    try {
      const response = await fetch(`http://${espIpRef.current}/scan_dtc`);
      const data = await response.json();

      // Bersihkan spasi dari balasan ECU agar mudah dibaca sistem
      const raw = data.raw_dtc
        ? data.raw_dtc.toUpperCase().replace(/\s/g, "")
        : "";

      // Logika Pintar Paham Bahasa ECU Nissan
      if (
        raw.includes("NODATA") ||
        raw.includes("ERROR") ||
        raw === "" ||
        raw === "OK" ||
        raw === "?"
      ) {
        setHasScanned(true); // Aman
      } else if (raw.startsWith("5802")) {
        // 5802 adalah header jawaban normal dari request 1802 di Nissan Livina
        if (raw === "58020000" || raw === "5802") {
          setHasScanned(true);
        } else {
          // Kalau ada penyakit, balasannya seperti "58020118" dsb.
          setDtcList([{ code: "RAW HEX", desc: raw }]);
          setHasScanned(true); // <--- KUNCI AGAR LAYAR TIDAK BLANK
          showAlert(
            "KODE ERROR DITEMUKAN",
            "ECU mendeteksi adanya malfungsi. Cek daftar DTC.",
            "error",
          );
        }
      } else {
        // Jaga-jaga kalau ada balasan format lain yang aneh
        if (raw.length > 4) {
          setDtcList([{ code: "RAW HEX", desc: raw }]);
          setHasScanned(true); // <--- KUNCI AGAR LAYAR TIDAK BLANK
          showAlert(
            "KODE ERROR DITEMUKAN",
            "ECU mendeteksi adanya malfungsi. Cek daftar DTC.",
            "error",
          );
        } else {
          setHasScanned(true);
        }
      }
    } catch (error) {
      showAlert(
        "SCAN GAGAL",
        "Gagal menghubungi ESP32 / OBD2. Pastikan mesin menyala.",
        "error",
      );
    } finally {
      setIsScanning(false);
    }
  };

  const clearDtc = async () => {
    setIsScanning(true);
    try {
      await fetch(`http://${espIpRef.current}/clear_dtc`);
      setDtcList([]);
      showAlert(
        "BERHASIL",
        "Memory ECU / DTC telah berhasil direset.",
        "success",
      );
    } catch (error) {
      showAlert("GAGAL RESET", "Tidak dapat mereset DTC. Coba lagi.", "error");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 15 }]}>
      <Text style={styles.headerTitle}>
        ECU <Text style={{ color: "#ff4444" }}>DIAGNOSTICS</Text>
      </Text>

      {/* Status Bar */}
      <View style={styles.statusCard}>
        <Ionicons
          name="hardware-chip-outline"
          size={32}
          color={hasScanned && dtcList.length === 0 ? "#00cc00" : "#ffcc00"}
        />
        <View style={styles.statusTextContainer}>
          <Text style={styles.statusLabel}>ECU STATUS</Text>
          <Text style={styles.statusValue}>
            {!hasScanned
              ? "READY TO SCAN"
              : dtcList.length > 0
                ? `${dtcList.length} FAULTS DETECTED`
                : "SYSTEM NORMAL"}
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {isScanning ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color="#ff4444" />
            <Text style={styles.loadingText}>Communicating with OBD2...</Text>
          </View>
        ) : hasScanned && dtcList.length > 0 ? (
          <ScrollView style={styles.dtcList}>
            {dtcList.map((item, index) => (
              <View key={index} style={styles.dtcCard}>
                <View style={styles.dtcHeader}>
                  <Ionicons name="warning" size={20} color="#ff4444" />
                  <Text style={styles.dtcCode}>{item.code}</Text>
                </View>
                <Text style={styles.dtcDesc}>{item.desc}</Text>
              </View>
            ))}
          </ScrollView>
        ) : hasScanned && dtcList.length === 0 ? (
          <View style={styles.loadingArea}>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color="#00cc00"
            />
            <Text style={[styles.loadingText, { color: "#00cc00" }]}>
              NO DTC FOUND
            </Text>
            <Text style={{ color: "#888", marginTop: 5 }}>
              Engine is running perfectly.
            </Text>
          </View>
        ) : (
          <View style={styles.loadingArea}>
            <Ionicons name="car-sport-outline" size={64} color="#333" />
            <Text style={styles.loadingText}>
              Press Scan to check engine health
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.btnScan}
          onPress={startScan}
          disabled={isScanning}
        >
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.btnText}>SCAN DTC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btnClear,
            { opacity: dtcList.length > 0 && !isScanning ? 1 : 0.5 },
          ]}
          onPress={clearDtc}
          disabled={dtcList.length === 0 || isScanning}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>CLEAR DTC</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 3,
    marginBottom: 20,
  },

  statusCard: {
    flexDirection: "row",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#ffcc00",
  },
  statusTextContainer: { marginLeft: 15 },
  statusLabel: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statusValue: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  contentArea: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    marginTop: 20,
    borderRadius: 12,
    padding: 15,
    justifyContent: "center",
  },
  loadingArea: { alignItems: "center", justifyContent: "center" },
  loadingText: {
    color: "#aaa",
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
  },

  dtcList: { flex: 1 },
  dtcCard: {
    backgroundColor: "#252525",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#ff4444",
  },
  dtcHeader: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  dtcCode: {
    color: "#ff4444",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  dtcDesc: { color: "#ccc", fontSize: 14, lineHeight: 20 },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  btnScan: {
    flex: 1,
    backgroundColor: "#00ffcc",
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  btnClear: {
    flex: 1,
    backgroundColor: "#ff4444",
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "#121212",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 1,
  },
});
