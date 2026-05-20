import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../../../styles/dashboard.styles";

export default function SettingsModal({
  visible,
  onClose,
  obdType,
  setObdType,
  obdMac,
  setObdMac,
  obdPin,
  setObdPin,
  obdWifiSsid,
  setObdWifiSsid,
  obdIp,
  setObdIp,
  obdPort,
  setObdPort,
  autoLock,
  setAutoLock,
  lockSpeed,
  setLockSpeed,
  onApply,
  onStartScan,
  showScanner,
  setShowScanner,
  isSearchingOBD,
  scannedDevices,
  onSelectDevice,
  sendMessage,
}: any) {
  const [secretTapCount, setSecretTapCount] = useState(0);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  // ==========================================
  // LOGIKA ANIMASI KEYBOARD: TRANSLATE Y
  // ==========================================
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardOffset, {
        // Menggeser fisik kotak secara visual ke atas (Minus Y)
        toValue: -(e.endCoordinates.height / 2) - 20,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true, // Animasi diproses di GPU, dijamin super mulus!
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0, // Kembali turun ke posisi semula
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    if (!visible) {
      setSecretTapCount(0);
    }
  }, [visible]);

  return (
    <>
      {/* 1. MODAL UTAMA PENGATURAN */}
      <Modal visible={visible} transparent animationType="slide">
        {/* Background tetap diam */}
        <View style={styles.modalBg}>
          {/* Kotak Modal ini yang akan TERBANG ke atas menghindari Keyboard */}
          <Animated.View
            style={[
              styles.modalBox,
              { transform: [{ translateY: keyboardOffset }] }, // <--- KUNCI SIHIRNYA DI SINI
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setSecretTapCount((prev) => prev + 1)}
              >
                <Text style={styles.modalTitle}>Pengaturan Modul</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* SCROLLVIEW SUDAH MUSNAH */}
            <View style={{ paddingBottom: 20 }}>
              {/* TAB SELECTOR */}
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 20,
                  backgroundColor: "#000",
                  borderRadius: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => setObdType("bluetooth")}
                  style={[
                    styles.tabBtn,
                    obdType === "bluetooth" && styles.tabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      obdType === "bluetooth" && { color: "#000" },
                    ]}
                  >
                    Bluetooth
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setObdType("wifi")}
                  style={[
                    styles.tabBtn,
                    obdType === "wifi" && styles.tabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      obdType === "wifi" && { color: "#000" },
                    ]}
                  >
                    WiFi
                  </Text>
                </TouchableOpacity>
              </View>

              {/* KONTEN TAB BLUETOOTH */}
              {obdType === "bluetooth" ? (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.configLabel}>
                    ALAMAT MAC ELM327 TARGET
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
                    <TextInput
                      style={[styles.configInput, { flex: 1 }]}
                      value={obdMac}
                      onChangeText={setObdMac}
                      placeholder="00:1D:A5..."
                      placeholderTextColor="#444"
                    />
                    <TouchableOpacity
                      style={styles.scanBtnMini}
                      onPress={() => onStartScan("bluetooth")}
                    >
                      <Ionicons name="search" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.configLabel, { marginTop: 15 }]}>
                    PIN / PASSWORD BLUETOOTH
                  </Text>
                  <TextInput
                    style={[styles.configInput, { marginTop: 5 }]}
                    value={obdPin}
                    onChangeText={setObdPin}
                    placeholder="1234"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.configLabel}>NAMA WIFI OBD2 (SSID)</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginTop: 5,
                      marginBottom: 15,
                    }}
                  >
                    <TextInput
                      style={[styles.configInput, { flex: 1 }]}
                      value={obdWifiSsid}
                      onChangeText={setObdWifiSsid}
                      placeholder="WiFi_OBDII"
                      placeholderTextColor="#444"
                    />
                    <TouchableOpacity
                      style={styles.scanBtnMini}
                      onPress={() => onStartScan("wifi")}
                    >
                      <Ionicons name="search" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.configLabel}>IP ADDRESS</Text>
                      <TextInput
                        style={styles.configInput}
                        value={obdIp}
                        onChangeText={setObdIp}
                        placeholder="192.168.0.10"
                        placeholderTextColor="#444"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.configLabel}>PORT</Text>
                      <TextInput
                        style={styles.configInput}
                        value={obdPort}
                        onChangeText={setObdPort}
                        placeholder="35000"
                        placeholderTextColor="#444"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* AUTO DOOR LOCK */}
              <View
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTopWidth: 1,
                  borderTopColor: "#222",
                  marginBottom: 20,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <View>
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>
                      Auto Door Lock
                    </Text>
                    <Text style={{ color: "#666", fontSize: 10 }}>
                      Kunci pintu otomatis saat berjalan
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      const nextState = !autoLock;
                      setAutoLock(nextState);
                      sendMessage(nextState ? "AUTOLOCK_ON" : "AUTOLOCK_OFF");
                    }}
                    style={{
                      backgroundColor: autoLock ? "#00ff88" : "#333",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: "#000",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {autoLock ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {autoLock && (
                  <View>
                    <Text style={styles.configLabel}>
                      KUNCI PADA KECEPATAN (KM/H)
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 10, marginTop: 5 }}
                    >
                      <TextInput
                        style={[styles.configInput, { flex: 1 }]}
                        value={lockSpeed}
                        onChangeText={(val) => {
                          setLockSpeed(val);
                          if (val) sendMessage(`SET_LOCK_SPEED:${val}`);
                        }}
                        keyboardType="numeric"
                      />
                      <View style={styles.scanBtnMini}>
                        <Ionicons
                          name="speedometer-outline"
                          size={20}
                          color="#000"
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={onApply}>
                <Text style={styles.saveBtnText}>TERAPKAN & RESTART MODUL</Text>
              </TouchableOpacity>

              {secretTapCount >= 7 && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#c0392b",
                    padding: 14,
                    borderRadius: 8,
                    marginTop: 20,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#e74c3c",
                  }}
                  onPress={() => {
                    sendMessage("FACTORY_RESET");
                    setSecretTapCount(0);
                    onClose();
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}
                  >
                    🚨 DEVELOPER MODE: FACTORY RESET MODUL
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* 2. MODAL LAPISAN KEDUA: RADAR SCANNER */}
      <Modal visible={showScanner} transparent animationType="fade">
        <View style={[styles.modalBg, { backgroundColor: "rgba(0,0,0,0.9)" }]}>
          <View style={[styles.modalBox, { borderColor: "#00ff88" }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={[styles.modalTitle, { color: "#00ff88" }]}>
                Radar OBD2
              </Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {isSearchingOBD ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <ActivityIndicator size="large" color="#00ff88" />
                <Text
                  style={{
                    color: "#00ff88",
                    marginTop: 15,
                    fontWeight: "bold",
                  }}
                >
                  ESP32 sedang memindai kabin...
                </Text>
              </View>
            ) : (
              // SCROLLVIEW DIHAPUS, DIGANTI VIEW BIASA
              <View style={{ maxHeight: 250 }}>
                {scannedDevices.length === 0 ? (
                  <Text
                    style={{ color: "#888", textAlign: "center", padding: 20 }}
                  >
                    Tidak menemukan perangkat OBD2 Bluetooth.
                  </Text>
                ) : (
                  scannedDevices.map((dev: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.scannedItem}
                      onPress={() => onSelectDevice(dev.name, dev.mac)}
                    >
                      <Ionicons name="bluetooth" size={24} color="#00ff88" />
                      <View style={{ marginLeft: 15 }}>
                        <Text style={styles.scannedItemName}>{dev.name}</Text>
                        <Text style={styles.scannedItemMac}>{dev.mac}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
