import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { getDashboardStyles } from "../../../styles/dashboard.styles";
import { useAppTheme } from "../../AppThemeContext";
import { useGaugeTheme } from "../../GaugeThemeContext";

// Ikon representasi tiap bentuk gauge di daftar pilihan tema
const LAYOUT_ICON: Record<string, any> = {
  arc: "speedometer-outline",
  ring: "radio-button-on-outline",
  bar: "reorder-two-outline",
  digital: "hardware-chip-outline",
};

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
  hudMirrorEnabled,
  onToggleHudMirror,
}: any) {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  const {
    theme: activeGaugeTheme,
    themeIndex,
    themes,
    setTheme,
  } = useGaugeTheme();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  // ✅ Bedakan HP landscape (layar pendek) vs Tablet/Head Unit landscape,
  // supaya modal tidak numpuk/overflow di HP yang diputar.
  const isTabletLandscape = isLandscape && height >= 480;
  const isPhoneLandscape = isLandscape && height < 480;

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
        toValue: -(e.endCoordinates.height / 2) - 20,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
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

  // ✅ Tinggi maksimum area scroll dihitung dinamis dari tinggi layar,
  // bukan angka fix — supaya di HP landscape (tinggi ~360-420px) modal
  // tidak overflow ke luar layar atau ketiban keyboard.
  const scrollMaxHeight = isPhoneLandscape
    ? height * 0.65
    : isTabletLandscape
      ? 450
      : 650;

  const sectionSpacing = isPhoneLandscape ? 12 : 20;
  const labelFontSize = isPhoneLandscape ? 11 : 13;

  return (
    <>
      {/* 1. MODAL UTAMA PENGATURAN */}
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <Animated.View
            style={[
              styles.modalBox,
              { transform: [{ translateY: keyboardOffset }] },
              isPhoneLandscape && {
                width: "94%",
                maxWidth: 640,
                padding: 16,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: isPhoneLandscape ? 10 : 20,
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setSecretTapCount((prev) => prev + 1)}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    isPhoneLandscape && { fontSize: 16 },
                  ]}
                >
                  Pengaturan Modul
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: scrollMaxHeight }}
              contentContainerStyle={{
                paddingBottom: isPhoneLandscape ? 10 : 20,
                paddingHorizontal: 2,
              }}
              showsVerticalScrollIndicator={true}
            >
              {/* TAB SELECTOR */}
              <View
                style={[styles.tabSelector, { marginBottom: sectionSpacing }]}
              >
                <TouchableOpacity
                  onPress={() => setObdType("bluetooth")}
                  style={[
                    styles.tabBtn,
                    obdType === "bluetooth" && styles.tabActive,
                    isPhoneLandscape && { padding: 8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      obdType === "bluetooth" && { color: "#fff" },
                      isPhoneLandscape && { fontSize: 12 },
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
                    isPhoneLandscape && { padding: 8 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      obdType === "wifi" && { color: "#000" },
                      isPhoneLandscape && { fontSize: 12 },
                    ]}
                  >
                    WiFi
                  </Text>
                </TouchableOpacity>
              </View>

              {/* KONTEN TAB BLUETOOTH */}
              {obdType === "bluetooth" ? (
                <View style={{ marginBottom: sectionSpacing }}>
                  <Text
                    style={[styles.configLabel, { fontSize: labelFontSize }]}
                  >
                    ALAMAT MAC ELM327 TARGET
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
                    <TextInput
                      style={[
                        styles.configInput,
                        { flex: 1 },
                        isPhoneLandscape && { padding: 10, fontSize: 13 },
                      ]}
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
                  <Text
                    style={[
                      styles.configLabel,
                      {
                        marginTop: isPhoneLandscape ? 10 : 15,
                        fontSize: labelFontSize,
                      },
                    ]}
                  >
                    PIN / PASSWORD BLUETOOTH
                  </Text>
                  <TextInput
                    style={[
                      styles.configInput,
                      { marginTop: 5 },
                      isPhoneLandscape && { padding: 10, fontSize: 13 },
                    ]}
                    value={obdPin}
                    onChangeText={setObdPin}
                    placeholder="1234"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              ) : (
                <View style={{ marginBottom: sectionSpacing }}>
                  <Text
                    style={[styles.configLabel, { fontSize: labelFontSize }]}
                  >
                    NAMA WIFI OBD2 (SSID)
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginTop: 5,
                      marginBottom: isPhoneLandscape ? 10 : 15,
                    }}
                  >
                    <TextInput
                      style={[
                        styles.configInput,
                        { flex: 1 },
                        isPhoneLandscape && { padding: 10, fontSize: 13 },
                      ]}
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
                      <Text
                        style={[
                          styles.configLabel,
                          { fontSize: labelFontSize },
                        ]}
                      >
                        IP ADDRESS
                      </Text>
                      <TextInput
                        style={[
                          styles.configInput,
                          isPhoneLandscape && { padding: 10, fontSize: 13 },
                        ]}
                        value={obdIp}
                        onChangeText={setObdIp}
                        placeholder="192.168.0.10"
                        placeholderTextColor="#444"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.configLabel,
                          { fontSize: labelFontSize },
                        ]}
                      >
                        PORT
                      </Text>
                      <TextInput
                        style={[
                          styles.configInput,
                          isPhoneLandscape && { padding: 10, fontSize: 13 },
                        ]}
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
                  marginTop: isPhoneLandscape ? 10 : 20,
                  paddingTop: isPhoneLandscape ? 10 : 20,
                  borderTopWidth: 1,
                  borderTopColor: "#222",
                  marginBottom: sectionSpacing,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: isPhoneLandscape ? 8 : 15,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: isPhoneLandscape ? 13 : 14,
                      }}
                    >
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
                    <Text
                      style={[styles.configLabel, { fontSize: labelFontSize }]}
                    >
                      KUNCI PADA KECEPATAN (KM/H)
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 10, marginTop: 5 }}
                    >
                      <TextInput
                        style={[
                          styles.configInput,
                          { flex: 1 },
                          isPhoneLandscape && { padding: 10, fontSize: 13 },
                        ]}
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

              {/* ✅ MODE TAMPILAN HUD (FLIP MIRROR) */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#222",
                  paddingTop: isPhoneLandscape ? 10 : 20,
                  marginBottom: sectionSpacing,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: isPhoneLandscape ? 13 : 14,
                      }}
                    >
                      Mode Tampilan HUD
                    </Text>
                    <Text style={{ color: "#666", fontSize: 10 }}>
                      {hudMirrorEnabled
                        ? "Mirror: untuk dipantulkan di kaca depan (reflektor)"
                        : "Normal: untuk head unit / layar langsung"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onToggleHudMirror}
                    style={{
                      backgroundColor: hudMirrorEnabled ? "#00ffcc" : "#333",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: hudMirrorEnabled ? "#000" : "#fff",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {hudMirrorEnabled ? "MIRROR" : "NORMAL"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ✅ TEMA GAUGE (Bentuk + Warna RPM & Speed) */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#222",
                  paddingTop: isPhoneLandscape ? 10 : 20,
                  marginBottom: sectionSpacing,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "bold",
                    marginBottom: 4,
                    fontSize: isPhoneLandscape ? 13 : 14,
                  }}
                >
                  Tema Gauge
                </Text>
                <Text
                  style={{
                    color: "#666",
                    fontSize: 10,
                    marginBottom: isPhoneLandscape ? 8 : 12,
                  }}
                >
                  Ganti bentuk & warna gauge RPM/Speed di dashboard & HUD.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {themes.map((t: any, idx: number) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setTheme(idx)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: isPhoneLandscape ? 6 : 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: themeIndex === idx ? t.rpmColor : "#333",
                        backgroundColor:
                          themeIndex === idx ? "#1a1a1a" : "#000",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={LAYOUT_ICON[t.layout] || "apps-outline"}
                        size={14}
                        color={themeIndex === idx ? t.rpmColor : "#666"}
                      />
                      <View
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: t.rpmColor,
                        }}
                      />
                      <View
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 5,
                          backgroundColor: t.speedColor,
                        }}
                      />
                      <Text
                        style={{
                          color: themeIndex === idx ? "#fff" : "#888",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      >
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  isPhoneLandscape && { paddingVertical: 12 },
                ]}
                onPress={onApply}
              >
                <Text
                  style={[
                    styles.saveBtnText,
                    isPhoneLandscape && { fontSize: 12 },
                  ]}
                >
                  TERAPKAN & RESTART MODUL
                </Text>
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
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* 2. MODAL LAPISAN KEDUA: RADAR SCANNER */}
      <Modal visible={showScanner} transparent animationType="fade">
        <View style={[styles.modalBg, { backgroundColor: "rgba(0,0,0,0.9)" }]}>
          <View
            style={[
              styles.modalBox,
              { borderColor: "#00ff88" },
              isPhoneLandscape && { width: "90%", maxWidth: 520, padding: 16 },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: isPhoneLandscape ? 10 : 20,
              }}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: "#00ff88" },
                  isPhoneLandscape && { fontSize: 16 },
                ]}
              >
                Radar OBD2
              </Text>
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {isSearchingOBD ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: isPhoneLandscape ? 14 : 30,
                }}
              >
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
              <ScrollView
                style={{
                  maxHeight: isPhoneLandscape
                    ? height * 0.45
                    : isTabletLandscape
                      ? 140
                      : 250,
                }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
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
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
