import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  AppStateStatus,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TerminalModalProps {
  visible: boolean;
  onClose: () => void;
  logs: string[];
  onSend: (cmd: string) => void;
  // ✅ Kirim command BLE mentah TANPA prefix "RAW:".
  // Dipakai khusus untuk command kontrol firmware seperti
  // ACTIVE_TEST_CYL:N dan ACTIVE_TEST_STOP, yang harus ditangkap
  // langsung oleh BLE callback ESP32 (bukan diteruskan ke ELM327).
  onSendRaw: (cmd: string) => void;
}

// Harus lebih cepat dari ACTIVE_TEST_HEARTBEAT_TIMEOUT di firmware (1500ms)
// agar ada margin aman -- kalau satu heartbeat telat/gagal kirim,
// masih ada kesempatan heartbeat berikutnya nyampe sebelum firmware
// menganggap HP "hilang" dan auto-stop sendiri.
const HEARTBEAT_INTERVAL_MS = 400;

// Cadangan tambahan SISI APP, independen dari hard-cap firmware (6 detik).
// Kalau karena alasan apapun onPressOut tidak pernah terpanggil (kasus
// sangat jarang di RN, misal gesture system mengambil-alih touch),
// app sendiri akan memaksa stop setelah durasi ini.
const CLIENT_SIDE_MAX_HOLD_MS = 5000;

export default function TerminalModal({
  visible,
  onClose,
  logs,
  onSend,
  onSendRaw,
}: TerminalModalProps) {
  const [inputText, setInputText] = useState("");
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  // Cylinder yang sedang ditahan untuk Active Test (0 = tidak ada)
  const [activeCylinder, setActiveCylinder] = useState<number>(0);
  const activeCylinderRef = useRef(0); // ref agar interval selalu baca nilai terbaru
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientMaxHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height + 10, // sedikit lebih rendah dari keyboard
        duration: Platform.OS === "ios" ? e.duration : 150,
        useNativeDriver: false,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 150,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // =====================================================
  // ⚠️ SAFETY: pusat kendali stop active test, dipanggil dari
  // semua jalur (lepas tombol, tutup modal, app background, unmount).
  // Memastikan heartbeat timer selalu dibersihkan & command STOP
  // selalu terkirim, tidak peduli dari mana trigger-nya datang.
  // =====================================================
  const stopActiveTestLocal = (sendStopCommand: boolean) => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (clientMaxHoldTimer.current) {
      clearTimeout(clientMaxHoldTimer.current);
      clientMaxHoldTimer.current = null;
    }
    if (activeCylinderRef.current !== 0) {
      if (sendStopCommand) onSendRaw("ACTIVE_TEST_STOP");
      activeCylinderRef.current = 0;
      setActiveCylinder(0);
    }
  };

  // ✅ Safety Lapis 3: kalau app masuk background/inactive (user keluar
  // app, terima telepon, dst) sementara test masih ditahan, langsung
  // stop. Sentuhan jari yang "kebawa" minimize tidak akan membuat test
  // nyangkut, karena begitu app tidak lagi "active", kita putus paksa.
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== "active") {
        stopActiveTestLocal(true);
      }
    };
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

  // ✅ Safety: kalau modal Terminal ditutup sementara test masih
  // ditahan, pastikan kita kirim STOP agar koil tidak ke-cut terus.
  useEffect(() => {
    if (!visible) {
      stopActiveTestLocal(true);
    }
  }, [visible]);

  // ✅ Safety: kalau komponen ini ter-unmount total (misal karena
  // navigasi/reload), pastikan semua timer ikut dibersihkan.
  useEffect(() => {
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      if (clientMaxHoldTimer.current) clearTimeout(clientMaxHoldTimer.current);
    };
  }, []);

  const handlePressInCylinder = (cyl: number) => {
    activeCylinderRef.current = cyl;
    setActiveCylinder(cyl);

    // Kirim sinyal pertama langsung...
    onSendRaw(`ACTIVE_TEST_CYL:${cyl}`);

    // ...lalu kirim ULANG terus sebagai heartbeat selama tombol ditahan.
    // Ini "dead-man's switch" sisi app: kalau app freeze/crash, interval
    // ini otomatis berhenti, dan firmware akan timeout sendiri.
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    heartbeatTimer.current = setInterval(() => {
      if (activeCylinderRef.current !== 0) {
        onSendRaw(`ACTIVE_TEST_CYL:${activeCylinderRef.current}`);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Cadangan: kalau onPressOut entah kenapa tidak pernah terpanggil,
    // paksa stop sendiri setelah CLIENT_SIDE_MAX_HOLD_MS.
    if (clientMaxHoldTimer.current) clearTimeout(clientMaxHoldTimer.current);
    clientMaxHoldTimer.current = setTimeout(() => {
      stopActiveTestLocal(true);
    }, CLIENT_SIDE_MAX_HOLD_MS);
  };

  const handlePressOutCylinder = () => {
    stopActiveTestLocal(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <Animated.View
        style={[styles.container, { paddingBottom: keyboardOffset }]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>root@livina-ecu:~#</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#ff4444" />
          </TouchableOpacity>
        </View>

        {/* LOG AREA */}
        <ScrollView
          style={styles.logArea}
          ref={(scrollView) => scrollView?.scrollToEnd({ animated: true })}
        >
          {logs.map((log, index) => (
            <Text
              key={index}
              style={[
                styles.logText,
                { color: log.startsWith("$") ? "#fff" : "#00ff88" },
              ]}
            >
              {log}
            </Text>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.testButton}
          onPress={() => onSend("TEST_RELAY")}
        >
          <Ionicons name="hardware-chip-outline" size={20} color="#fff" />
          <Text style={styles.testButtonText}>TEST RELAY PCB</Text>
        </TouchableOpacity>

        {/* INPUT AREA */}
        <View style={styles.inputArea}>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            style={styles.input}
            placeholder="Ketik PID (Contoh: 2211150401)"
            placeholderTextColor="#005522"
            autoCapitalize="characters"
            autoCorrect={false}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => {
              if (!inputText.trim()) return;
              onSend(inputText);
              setInputText("");
            }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 15, paddingTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerTitle: {
    color: "#00ff88",
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "monospace",
  },
  logArea: { flex: 1, marginBottom: 10 },
  logText: { fontFamily: "monospace", fontSize: 14, marginBottom: 4 },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#333",
    paddingTop: 10,
    paddingBottom: 10,
  },
  prompt: {
    color: "#fff",
    fontFamily: "monospace",
    marginRight: 8,
    fontSize: 16,
  },
  input: { flex: 1, color: "#00ff88", fontFamily: "monospace", fontSize: 16 },
  testButton: {
    backgroundColor: "#ff3333", // Merah menyala
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ff6666",
  },
  testButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontFamily: "monospace",
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 1,
  },
  // ✅ Warning banner saat active test berjalan
  warningBanner: {
    backgroundColor: "#cc0000",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  warningTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  warningText: {
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  forceStopButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  forceStopButtonText: {
    color: "#ff4444",
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "900",
  },
  // ✅ Style panel Active Test Cylinder Cut
  activeTestBox: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#332b00",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  activeTestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  activeTestTitle: {
    color: "#ffcc00",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  activeTestHint: {
    color: "#666",
    fontFamily: "monospace",
    fontSize: 10,
    marginBottom: 10,
    lineHeight: 14,
  },
  cylinderRow: {
    flexDirection: "row",
    gap: 10,
  },
  cylinderButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cylinderButtonActive: {
    backgroundColor: "#3a0000",
    borderColor: "#ff3333",
  },
  cylinderButtonText: {
    color: "#fff",
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "900",
  },
  cylinderButtonTextActive: {
    color: "#ff5555",
  },
  cylinderButtonStatus: {
    color: "#ff5555",
    fontFamily: "monospace",
    fontSize: 8,
    fontWeight: "bold",
    marginTop: 2,
  },
});
