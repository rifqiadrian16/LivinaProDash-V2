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
import { ALARM_SOUND_PRESETS } from "../../../constants/alarmSounds";
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
  tempAlarmEnabled,
  setTempAlarmEnabled,
  tempAlarmThreshold,
  setTempAlarmThreshold,
  onTestTempAlarm,
  alarmSoundId,
  customSoundName,
  setAlarmSoundId,
  pickCustomAlarmSound,
  previewAlarmSound,
  isSimulatingTemp,
  onSimulateTempRamp,
}: any) {
  const { colors, isDark } = useAppTheme();
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

  // ✅ Tinggi maksimum area scroll selalu dihitung BERDASARKAN TINGGI LAYAR.
  // Ini menjamin modal TIDAK AKAN PERNAH menembus batas bawah layar.
  const scrollMaxHeight = isPhoneLandscape
    ? height * 0.65
    : isTabletLandscape
      ? height * 0.7 // Untuk head unit landscape, gunakan 75% tinggi layarnya
      : height * 0.7; // Untuk HP portrait

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
              // ✅ Beri batasan tinggi agar boks modal tidak lebih dari 90% layar
              {
                maxHeight: height * 0.9,
                width: isPhoneLandscape || isTabletLandscape ? "94%" : "100%",
                maxWidth: 640,
              },
              (isPhoneLandscape || isTabletLandscape) && { padding: 16 },
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
                      obdType === "bluetooth" && {
                        color: isDark ? "#000" : "#fff",
                      },
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
                      obdType === "wifi" && { color: isDark ? "#000" : "#fff" },
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
                      <Ionicons
                        name="search"
                        size={20}
                        color={isDark ? "#000" : "#fff"}
                      />
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
                      <Ionicons
                        name="search"
                        size={20}
                        color={isDark ? "#000" : "#FFF"}
                      />
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
                      style={[
                        styles.doorLockLabel,
                        { fontSize: isPhoneLandscape ? 13 : 14 },
                      ]}
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
                      backgroundColor: autoLock ? colors.accent : "#333",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: isDark ? "#000" : "#FFF",
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
                          color={isDark ? "#000" : "#fff"}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* ALARM SUHU MESIN */}
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
                    marginBottom: isPhoneLandscape ? 8 : 15,
                  }}
                >
                  <View>
                    <Text
                      style={[
                        styles.doorLockLabel,
                        { fontSize: isPhoneLandscape ? 13 : 14 },
                      ]}
                    >
                      Alarm Suhu Mesin
                    </Text>
                    <Text style={{ color: "#666", fontSize: 10 }}>
                      Peringatkan saat suhu coolant terlalu panas
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setTempAlarmEnabled(!tempAlarmEnabled)}
                    style={{
                      backgroundColor: tempAlarmEnabled
                        ? colors.accent
                        : "#333",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.bg,
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {tempAlarmEnabled ? "ON" : "OFF"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {tempAlarmEnabled && (
                  <View>
                    <Text
                      style={[styles.configLabel, { fontSize: labelFontSize }]}
                    >
                      AKTIFKAN ALARM PADA SUHU (°C)
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
                        value={tempAlarmThreshold}
                        onChangeText={(val) =>
                          setTempAlarmThreshold(val.replace(/[^0-9]/g, ""))
                        }
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor="#444"
                      />
                      <View style={styles.scanBtnMini}>
                        <Ionicons
                          name="thermometer-outline"
                          size={20}
                          color={isDark ? "#000" : "#fff"}
                        />
                      </View>
                    </View>

                    {/* ⬇️⬇️⬇️ SISIPKAN SELURUH BLOK "SUARA ALARM" DI SINI ⬇️⬇️⬇️ */}
                    <Text
                      style={[
                        styles.configLabel,
                        { fontSize: labelFontSize, marginTop: 14 },
                      ]}
                    >
                      SUARA ALARM
                    </Text>
                    <View style={{ gap: 8, marginTop: 6 }}>
                      {ALARM_SOUND_PRESETS.map((s: any) => (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => setAlarmSoundId(s.id)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: colors.inputBg,
                            borderWidth: 1,
                            borderColor:
                              alarmSoundId === s.id
                                ? colors.accent
                                : colors.border,
                            borderRadius: 8,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
                            {s.name}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 14,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => previewAlarmSound(s.id)}
                              hitSlop={8}
                            >
                              <Ionicons
                                name="play-circle-outline"
                                size={20}
                                color={colors.accent}
                              />
                            </TouchableOpacity>
                            {alarmSoundId === s.id && (
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color={colors.accent}
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* SUARA KUSTOM DARI FILE HP */}
                      <TouchableOpacity
                        onPress={pickCustomAlarmSound}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: colors.inputBg,
                          borderWidth: 1,
                          borderColor:
                            alarmSoundId === "custom"
                              ? colors.accent
                              : colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 13,
                            fontWeight: "600",
                          }}
                          numberOfLines={1}
                        >
                          {customSoundName
                            ? `📁 ${customSoundName}`
                            : "📁 Pilih File Sendiri..."}
                        </Text>
                        {alarmSoundId === "custom" && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={colors.accent}
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                    {/* ⬆️⬆️⬆️ SAMPAI SINI ⬆️⬆️⬆️ */}

                    {/* 🧪 TOMBOL SEMENTARA UNTUK TESTING — hapus kalau sudah yakin alarm jalan */}
                    <TouchableOpacity
                      onPress={onTestTempAlarm}
                      style={{
                        marginTop: 10,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: "#ffcc00",
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name="flask-outline"
                        size={16}
                        color="#ffcc00"
                      />
                      <Text
                        style={{
                          color: "#ffcc00",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      >
                        TEST ALARM (SEMENTARA)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onSimulateTempRamp}
                      style={{
                        marginTop: 8,
                        paddingVertical: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: isSimulatingTemp ? "#ff4444" : "#00ffcc",
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={
                          isSimulatingTemp
                            ? "stop-circle-outline"
                            : "thermometer-outline"
                        }
                        size={16}
                        color={isSimulatingTemp ? "#ff4444" : "#00ffcc"}
                      />
                      <Text
                        style={{
                          color: isSimulatingTemp ? "#ff4444" : "#00ffcc",
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      >
                        {isSimulatingTemp
                          ? "HENTIKAN SIMULASI"
                          : "SIMULASI NAIK-TURUN (REAL TEST)"}
                      </Text>
                    </TouchableOpacity>
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
                      style={[
                        styles.doorLockLabel,
                        { fontSize: isPhoneLandscape ? 13 : 14 },
                      ]}
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
                      backgroundColor: hudMirrorEnabled
                        ? colors.accent
                        : "#333",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: hudMirrorEnabled ? colors.bg : "#fff",
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
                  style={[
                    styles.doorLockLabel,
                    { fontSize: isPhoneLandscape ? 13 : 14, marginBottom: 4 },
                  ]}
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
                        borderColor:
                          themeIndex === idx ? colors.text : colors.border,
                        backgroundColor:
                          themeIndex === idx ? colors.card : colors.inputBg,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons
                        name={LAYOUT_ICON[t.layout] || "apps-outline"}
                        size={14}
                        color={
                          themeIndex === idx ? colors.text : colors.textMuted
                        }
                      />
                      <Text
                        style={{
                          color:
                            themeIndex === idx ? colors.text : colors.textMuted,
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
                      ? height * 0.5 // ✅ Scanner juga diubah ke persentase
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
