// BARUU
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAlert } from "../../components/AlertContext";
import useBLE from "../../hooks/useBLE";

export default function DashboardScreen() {
  const fabX = useRef(new Animated.Value(45)).current;
  const [isFabOpen, setIsFabOpen] = useState(false);

  const toggleFab = (open: boolean) => {
    setIsFabOpen(open);
    Animated.spring(fabX, {
      toValue: open ? 0 : 45, // 0 = Posisi normal, 45 = Nyumput
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -20) toggleFab(true); // Swipe Kiri -> Buka
        if (gestureState.dx > 20) toggleFab(false); // Swipe Kanan -> Tutup
      },
    }),
  ).current;

  const [otaTapCount, setOtaTapCount] = useState(0);
  const [showOTAModal, setShowOTAModal] = useState(false);
  const lastTapTime = useRef(0);

  const handleSecretOtaTrigger = () => {
    const now = Date.now();
    // Jika jeda antar klik > 1 detik, reset hitungan
    if (now - lastTapTime.current > 1000) {
      setOtaTapCount(1);
    } else {
      const newCount = otaTapCount + 1;
      setOtaTapCount(newCount);
      if (newCount >= 5) {
        setShowOTAModal(true);
        setOtaTapCount(0);
      }
    }
    lastTapTime.current = now;
  };

  const { showAlert } = useAlert();

  // --- 1. STATE UNTUK DATA SENSOR ---
  const [data, setData] = useState({
    s: 0,
    r: 0,
    t: 0,
    v: 0,
    m: 0,
    i: 0,
    st: 0,
    lt: 0,
    tm: 0,
    th: 0,
    l: 0,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [avgFuel, setAvgFuel] = useState(0);
  const fuelHistoryRef = useRef<number[]>([]);

  const tripDataRef = useRef<any[]>([]);
  const lastUpdateTime = useRef(Date.now());
  const lastSaveTime = useRef(0);
  const currentTripId = useRef("");
  const latestLocation = useRef<ExpoLocation.LocationObjectCoords | null>(null);
  const runningStats = useRef({ distance: 0, fuel: 0, startTime: 0 });
  const [isBypassed, setIsBypassed] = useState(false); // State bypass
  const [bypassTapCount, setBypassTapCount] = useState(0);

  const updateData = (newData: any) => {
    setData(newData);
    const now = Date.now();
    if (newData.m > 0 && newData.s > 2) {
      const inst = (14.7 * 737 * newData.s) / (3600 * newData.m);
      fuelHistoryRef.current = [...fuelHistoryRef.current, inst].slice(-100);
      const avg =
        fuelHistoryRef.current.reduce((a, b) => a + b, 0) /
        fuelHistoryRef.current.length;
      setAvgFuel(avg);
    }
    if (isRecordingRef.current) {
      const dt = (now - lastUpdateTime.current) / 3600000;
      lastUpdateTime.current = now;
      const fuelFlowLph = newData.m * 0.3355 * 1.3;
      runningStats.current.distance += newData.s * dt;
      runningStats.current.fuel += fuelFlowLph * dt;

      tripDataRef.current.push({
        latitude: latestLocation.current?.latitude || 0,
        longitude: latestLocation.current?.longitude || 0,
        speed: newData.s,
        rpm: newData.r,
        temp: newData.t,
        iat: newData.i,
        maf: newData.m,
        stft: newData.st,
        ltft: newData.lt,
        timing: newData.tm,
        volt: newData.v,
        throttle: newData.th,
        instFuel:
          newData.m > 0 && newData.s > 2
            ? (14.7 * 737 * newData.s) / (3600 * newData.m)
            : 0,
        time: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note:
          newData.s > 80
            ? "High Speed"
            : newData.r > 3500
              ? "Aggressive"
              : "Cruising",
      });

      if (tripDataRef.current.length > 500) {
        const overflow = tripDataRef.current.splice(
          0,
          tripDataRef.current.length - 500,
        );
        AsyncStorage.getItem("@livina_trip_buffer").then((existing) => {
          let buffer = existing ? JSON.parse(existing) : [];
          buffer = buffer.concat(overflow);
          AsyncStorage.setItem("@livina_trip_buffer", JSON.stringify(buffer));
        });
      }

      if (now - lastSaveTime.current > 30000) {
        lastSaveTime.current = now;
        saveTripData(false).catch((e) => console.log("[AUTOSAVE] Gagal:", e));
      }
    }
  };

  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);
  const instFuel =
    data.m > 0 && data.s > 2 ? (14.7 * 737 * data.s) / (3600 * data.m) : 0;

  // --- 2. LOGIKA RADAR SULTAN (HANDLE RAW TEXT) ---
  const [showScanner, setShowScanner] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<
    { name: string; mac: string }[]
  >([]);
  const [isSearchingOBD, setIsSearchingOBD] = useState(false);

  const handleRawText = (raw: string) => {
    if (raw === "SCAN_STATUS:SCANNING") {
      setIsSearchingOBD(true);
    } else if (raw === "SCAN_STATUS:DONE") {
      setIsSearchingOBD(false);
    } else if (raw.startsWith("SCAN_FOUND:")) {
      const parts = raw.replace("SCAN_FOUND:", "").split("|");
      if (parts.length === 2) {
        setScannedDevices((prev) => {
          if (prev.find((d) => d.mac === parts[1])) return prev;
          return [...prev, { name: parts[0], mac: parts[1] }];
        });
      }

      // ✅ TAMBAHKAN HANDLER INI
    } else if (raw.startsWith("CONFIG:")) {
      // Parse: "CONFIG:autolock=1,lockspeed=20,mode=1,hasmac=1"
      const pairs = raw.replace("CONFIG:", "").split(",");
      const config: Record<string, string> = {};

      pairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) config[key] = value;
      });

      if (config.autolock !== undefined) {
        setAutoLock(config.autolock === "1");
      }
      if (config.lockspeed !== undefined) {
        setLockSpeed(config.lockspeed);
      }

      console.log("[CONFIG] Sync dari ESP32:", config);
    }
  };

  // --- 3. PANGGIL OTAK BLUETOOTH ---
  const {
    isConnected,
    requestPermissions,
    scanForDevices,
    sendMessage,
    disconnectDevice,
  } = useBLE(updateData, handleRawText);

  // --- 4. STATE UNTUK SETTINGS (DI DALAM DASHBOARD) ---
  const [showSettings, setShowSettings] = useState(false);
  const [obdType, setObdType] = useState<"bluetooth" | "wifi">("bluetooth");
  const [obdMac, setObdMac] = useState("");
  const [obdWifiSsid, setObdWifiSsid] = useState("WiFi_OBDII");
  const [obdIp, setObdIp] = useState("192.168.0.10");
  const [obdPort, setObdPort] = useState("35000");
  const [isConnectingBLE, setIsConnectingBLE] = useState(false);
  const [autoLock, setAutoLock] = useState(true);
  const [lockSpeed, setLockSpeed] = useState("15");
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [obdPin, setObdPin] = useState("1234");
  const [otaSsid, setOtaSsid] = useState("Iqi");
  const [otaPass, setOtaPass] = useState("12345678");

  const [confirmAlert, setConfirmAlert] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Ya",
    cancelText: "Batal",
    isDanger: false,
    onConfirm: () => {},
  });

  useEffect(() => {
    const loadSettings = async () => {
      const savedMac = await AsyncStorage.getItem("@obd_mac");
      const savedPin = await AsyncStorage.getItem("@obd_pin");

      const savedOtaSsid = await AsyncStorage.getItem("@ota_ssid");
      const savedOtaPass = await AsyncStorage.getItem("@ota_pass");

      if (savedMac) setObdMac(savedMac);
      if (savedPin) setObdPin(savedPin);
      if (savedOtaSsid) setOtaSsid(savedOtaSsid);
      if (savedOtaPass) setOtaPass(savedOtaPass);
    };
    loadSettings();
  }, []);

  // Fungsi Konek HP ke ESP32 (Layar Awal)
  const handleConnectToModule = async () => {
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      setIsConnectingBLE(true);

      // ✅ PERPANJANG TIMEOUT: 10 detik scan + 15 detik koneksi BLE = 25 detik total
      connectingTimerRef.current = setTimeout(() => {
        // ✅ PENTING: Hanya tampilkan GAGAL kalau memang belum konek
        if (!isConnectedRef.current) {
          setIsConnectingBLE(false);
          showAlert(
            "Koneksi Gagal",
            "Modul Livina ProDash tidak ditemukan. Pastikan modul menyala (mesin/kontak ON) dan Bluetooth HP aktif.",
            "error",
          );
        }
      }, 25000); // 25 detik

      scanForDevices();
    } else {
      showAlert(
        "Izin Ditolak",
        "Aplikasi butuh akses Bluetooth & Lokasi.",
        "error",
      );
    }
  };

  // ✅ REF untuk cek isConnected di dalam timer
  const isConnectedRef = useRef(isConnected);
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    console.log("[APP] isConnected berubah:", isConnected);
    if (isConnected) {
      console.log("[APP] KONEK BERHASIL — matikan loading");
      if (connectingTimerRef.current) {
        clearTimeout(connectingTimerRef.current);
        connectingTimerRef.current = null;
      }
      setIsConnectingBLE(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        sendMessage("GET_CONFIG");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Fungsi Simpan Setting OBD ke ESP32
  const applyOBDConfig = async () => {
    if (obdType === "bluetooth") {
      if (!obdMac) return showAlert("Error", "Pilih MAC Address!", "error");
      if (!obdPin)
        return showAlert("Error", "PIN tidak boleh kosong!", "error");

      await AsyncStorage.setItem("@obd_mac", obdMac);
      await AsyncStorage.setItem("@obd_pin", obdPin);

      sendMessage(`SET_OBD_MAC:${obdMac}`);
      setTimeout(() => sendMessage(`SET_OBD_PIN:${obdPin}`), 300); // Jeda aman
      setTimeout(() => sendMessage("SET_MODE_1"), 600);
    } else {
      if (!obdWifiSsid)
        return showAlert(
          "Error",
          "Nama WiFi OBD2 (SSID) tidak boleh kosong!",
          "error",
        );
      sendMessage(`SET_OBD_WIFI_SSID:${obdWifiSsid}`);
      setTimeout(() => sendMessage(`SET_OBD_WIFI_IP:${obdIp}`), 300);
      setTimeout(() => sendMessage(`SET_OBD_WIFI_PORT:${obdPort}`), 600);
      setTimeout(() => sendMessage("SET_MODE_2"), 900);
    }
    setShowSettings(false);
    showAlert(
      "Konfigurasi Tersimpan",
      "ESP32 akan restart untuk menerapkan pengaturan. Silakan hubungkan ulang setelah beberapa detik.",
      "success",
    );
  };

  // Fungsi Start Radar (Dipanggil dari dalam Modal Settings)
  const startScannerUI = (type: "bluetooth" | "wifi") => {
    setShowScanner(true);
    setScannedDevices([]);
    setIsSearchingOBD(true);
    if (type === "bluetooth") {
      sendMessage("START_BT_SCAN");
    } else {
      sendMessage("START_WIFI_SCAN");
    }
  };

  const selectDevice = (name: string, mac: string) => {
    if (mac === "WIFI") {
      setObdWifiSsid(name); // Kalau yang diklik itu WiFi, masukkan ke form SSID
    } else {
      setObdMac(mac); // Kalau yang diklik Bluetooth, masukkan ke form MAC
    }
    setShowScanner(false);
  };

  const disconnectOBD = () => {
    setConfirmAlert({
      visible: true,
      title: "Standby Mode",
      message:
        "Memutus ESP32 dari OBD2 agar bisa pakai aplikasi Car Scanner. Lanjutkan?",
      confirmText: "Ya, Putuskan",
      cancelText: "Batal",
      isDanger: true, // Warna merah
      onConfirm: () => {
        sendMessage("DISCONNECT_OBD");
        setConfirmAlert((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const enterOTAMode = async () => {
    if (!otaSsid || !otaPass) {
      return showAlert(
        "Error",
        "SSID dan Password Hotspot tidak boleh kosong!",
        "error",
      );
    }

    await AsyncStorage.setItem("@ota_ssid", otaSsid);
    await AsyncStorage.setItem("@ota_pass", otaPass);

    setConfirmAlert({
      visible: true,
      title: "Masuk Mode Update (OTA)?",
      message: `Modul akan restart dan mencari Hotspot:\n"${otaSsid}"\n\nPastikan Hotspot menyala.`,
      confirmText: "Ya, Masuk OTA",
      cancelText: "Batal",
      isDanger: false, // Warna biru
      onConfirm: () => {
        sendMessage(`WIFI_SSID:${otaSsid}`);
        setTimeout(() => sendMessage(`WIFI_PASS:${otaPass}`), 300);

        setTimeout(() => {
          sendMessage("SET_MODE_0");
          setShowSettings(false);
          setConfirmAlert((prev) => ({ ...prev, visible: false }));
          showAlert(
            "Mode OTA Aktif",
            `Nyalakan Hotspot "${otaSsid}" dan buka PlatformIO.`,
            "success",
          );
        }, 600);
      },
    });
  };

  useEffect(() => {
    let sub: ExpoLocation.LocationSubscription | undefined;

    const startWatching = async () => {
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc: ExpoLocation.LocationObject) => {
          latestLocation.current = loc.coords;
        },
      );
    };

    startWatching();

    // ✅ Cleanup saat komponen unmount
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  const saveTripData = async (isFinal = false) => {
    if (tripDataRef.current.length < 5) return;
    try {
      const bufferRaw = await AsyncStorage.getItem("@livina_trip_buffer");
      let buffer: any[] = bufferRaw ? JSON.parse(bufferRaw) : [];
      const allData: any[] = buffer.concat(tripDataRef.current);
      const existing = await AsyncStorage.getItem("@livina_trips");
      let parsed = existing ? JSON.parse(existing) : [];
      const topSpeed = Math.max(...allData.map((d) => d.speed));
      const fuelUsed = runningStats.current.fuel.toFixed(1);

      const newTrip = {
        id: currentTripId.current,
        date: new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        route: `Livina Drive (${new Date().toLocaleTimeString()})`,
        distance: runningStats.current.distance.toFixed(1) + " km",
        time:
          Math.round((Date.now() - runningStats.current.startTime) / 60000) +
          "m",
        fuel: fuelUsed + " L",
        ecoScore: topSpeed > 110 ? 60 : 90,
        details: {
          topSpeed: topSpeed + " km/h",
          maxRpm: Math.max(...allData.map((d) => d.rpm)),
          fuelUsed: fuelUsed + " L",
          cost:
            "Rp " +
            Math.round(runningStats.current.fuel * 10000).toLocaleString(
              "id-ID",
            ),
        },
        routeData: allData,
      };

      const idx = parsed.findIndex((t: any) => t.id === currentTripId.current);
      if (idx !== -1) parsed[idx] = newTrip;
      else parsed.unshift(newTrip);
      await AsyncStorage.setItem("@livina_trips", JSON.stringify(parsed));
      if (isFinal) await AsyncStorage.removeItem("@livina_trip_buffer");
      if (isFinal)
        showAlert("Trip Saved", "Riwayat perjalanan aman.", "success");
    } catch (e) {}
  };

  const toggleRecording = () => {
    if (!isRecording) {
      tripDataRef.current = [];
      runningStats.current = { distance: 0, fuel: 0, startTime: Date.now() };
      currentTripId.current = Date.now().toString();
      lastUpdateTime.current = Date.now();
      lastSaveTime.current = Date.now();
      setIsRecording(true);
      showAlert("Recording", "GPS & Telemetri aktif.", "success");
    } else {
      setIsRecording(false);
      saveTripData(true).catch((e) => console.log("[TRIP] Gagal simpan:", e));
    }
  };

  // ========================================================
  // LAYAR 1: SETUP AWAL (HANYA KONEK KE ESP32)
  // ========================================================
  if (!isConnected && !isBypassed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.setupContainer}>
          <View style={styles.headerCentered}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {
                const newCount = bypassTapCount + 1;
                setBypassTapCount(newCount);
                if (newCount >= 7) {
                  setIsBypassed(true);
                  showAlert(
                    "Bypass Active",
                    "Mode Demo diaktifkan.",
                    "success",
                  );
                }
              }}
            >
              <Ionicons name="car-sport" size={80} color="#00ff88" />
            </TouchableOpacity>
            <Text style={styles.setupTitle}>LIVINA PRODASH</Text>
            <Text style={styles.setupSubtitle}>
              Sistem Telemetri & Diagnostik
            </Text>
          </View>

          <View
            style={{
              marginTop: 50,
              alignItems: "center",
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                color: "#888",
                textAlign: "center",
                marginBottom: 20,
                lineHeight: 22,
              }}
            >
              1. Nyalakan mesin atau kontak mobil ke posisi ON.{"\n"}
              2. Pastikan Modul Livina ProDash sudah menyala.
            </Text>

            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnectToModule}
              disabled={isConnectingBLE}
            >
              {isConnectingBLE ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.connectBtnText}>HUBUNGKAN KE MODUL</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ========================================================
  // LAYAR 2: DASHBOARD UTAMA
  // ========================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER DASHBOARD */}
        <View style={styles.header}>
          <Text style={styles.brandText}>PRODASH</Text>
          <View style={styles.headerRight}>
            {/* TOMBOL SETTINGS BARU DI SINI */}
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={styles.iconBtn}
            >
              <Ionicons name="settings" size={18} color="#888" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={disconnectOBD}
              style={[styles.iconBtn, { borderColor: "#ff4444" }]}
            >
              <Ionicons name="power" size={18} color="#ff4444" />
            </TouchableOpacity>

            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor: isConnected ? "#00ff8822" : "#ff444422",
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isConnected ? "#00ff88" : "#ff4444",
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isConnected ? "#00ff88" : "#ff4444" },
                ]}
              >
                {isConnected ? "STABLE" : "OFFLINE"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.gaugeContainerRow}>
          <View style={styles.gaugeWrapper}>
            <View
              style={[
                styles.mainRing,
                { borderColor: data.r > 5000 ? "#ff4444" : "#111" },
              ]}
            >
              <Text style={styles.gaugeValueText}>{data.r}</Text>
              <Text style={styles.gaugeUnitText}>RPM</Text>
            </View>
            <View style={styles.rpmTrackSmall}>
              <View
                style={[
                  styles.rpmFillSmall,
                  { width: `${Math.min((data.r / 7000) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.helperText}>RPM</Text>
          </View>

          <View style={styles.gaugeWrapper}>
            <View style={styles.mainRing}>
              <Text style={styles.gaugeValueText}>{data.s}</Text>
              <Text style={styles.gaugeUnitText}>KM/H</Text>
            </View>
            <Text style={styles.helperText}>SPEED</Text>
          </View>
        </View>

        <View style={styles.fuelRow}>
          <View style={styles.fuelItem}>
            <Text style={styles.fuelLabel}>INST. FUEL</Text>
            <Text style={styles.fuelValue}>
              {instFuel.toFixed(1)} <Text style={styles.unitSmall}>km/L</Text>
            </Text>
          </View>
          <View style={styles.fuelItem}>
            <Text style={styles.fuelLabel}>AVG. FUEL</Text>
            <Text style={styles.fuelValue}>
              {avgFuel.toFixed(1)} <Text style={styles.unitSmall}>km/L</Text>
            </Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <SensorCard
            icon="flash"
            label="VOLTAGE"
            value={`${data.v.toFixed(1)}V`}
            color="#f1c40f"
          />
          <SensorCard
            icon="leaf"
            label="MAF"
            value={`${data.m.toFixed(1)} g/s`}
            color="#00ff88"
          />
          <SensorCard
            icon="thermometer"
            label="COOLANT"
            value={`${data.t}°C`}
            color="#ff4444"
          />
          <SensorCard
            icon="snow"
            label="INTAKE"
            value={`${data.i}°C`}
            color="#3498db"
          />
          <SensorCard
            icon="timer"
            label="TIMING"
            value={`${data.tm}°`}
            color="#9b59b6"
          />
          <SensorCard
            icon="speedometer"
            label="THROTTLE"
            value={`${data.th}%`}
            color="#e67e22"
          />
        </View>

        <View style={styles.trimContainer}>
          <View style={styles.trimBox}>
            <Text style={styles.trimLabel}>STFT</Text>
            <Text style={styles.trimValue}>{data.st.toFixed(1)}%</Text>
          </View>
          <View style={styles.trimBox}>
            <Text style={styles.trimLabel}>LTFT</Text>
            <Text style={styles.trimValue}>{data.lt.toFixed(1)}%</Text>
          </View>
        </View>
      </ScrollView>

      {(isConnected || isBypassed) && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.recordFabContainer,
            { transform: [{ translateX: fabX }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.recordFab, isRecording && styles.recordFabActive]}
            onPress={() => {
              if (!isFabOpen) {
                toggleFab(true);
              } else {
                toggleRecording();
                // Setelah selesai rekam (atau stop), kita sembunyikan lagi
                if (isRecording) setTimeout(() => toggleFab(false), 500);
              }
            }}
          >
            <Ionicons
              name={
                isRecording ? "stop" : isFabOpen ? "videocam" : "chevron-back"
              }
              size={28}
              color={isRecording ? "#fff" : "#000"}
            />

            {!isFabOpen && !isRecording && (
              <Ionicons
                name="videocam"
                size={14}
                color="#000"
                style={{ position: "absolute", left: 6 }}
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity
        activeOpacity={1}
        style={styles.secretZone}
        onPress={handleSecretOtaTrigger}
      />

      <Modal visible={showOTAModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, { borderColor: "#00ff88" }]}>
            <Text style={styles.modalTitle}>Update Firmware (OTA)</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>SSID HOTSPOT</Text>
                <TextInput
                  style={[styles.configInput, { marginTop: 5 }]}
                  value={otaSsid}
                  onChangeText={setOtaSsid}
                  placeholder="Nama Hotspot"
                  placeholderTextColor="#444"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.configLabel}>PASSWORD</Text>
                <TextInput
                  style={[styles.configInput, { marginTop: 5 }]}
                  value={otaPass}
                  onChangeText={setOtaPass}
                  placeholder="Password"
                  placeholderTextColor="#444"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: "#00ff88", marginBottom: 15, marginTop: 20 },
              ]}
              onPress={enterOTAMode}
            >
              <Text style={[styles.saveBtnText, { width: "100%" }]}>
                MASUK MODE OTA (UPDATE)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: "#333" }]}
              onPress={() => setShowOTAModal(false)}
            >
              <Text style={{ color: "#fff", width: "100%" }}>TUTUP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL SETTINGS & RADAR SCANNER
          ======================================================== */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalBox, { maxHeight: "85%" }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={styles.modalTitle}>Pengaturan Modul</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
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
                      onPress={() => startScannerUI("bluetooth")}
                    >
                      <Ionicons name="search" size={20} color="#000" />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: "#666", fontSize: 10, marginTop: 8 }}>
                    Klik icon Kaca Pembesar untuk mencari Bluetooth OBD2 di
                    sekitar Anda.
                  </Text>

                  {/* 👇 MISI 2: FORM INPUT PIN BARU 👇 */}
                  <Text style={[styles.configLabel, { marginTop: 15 }]}>
                    PIN / PASSWORD BLUETOOTH
                  </Text>
                  <TextInput
                    style={[styles.configInput, { marginTop: 5 }]}
                    value={obdPin}
                    onChangeText={setObdPin}
                    placeholder="1234 atau 0000"
                    placeholderTextColor="#444"
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={{ color: "#666", fontSize: 10, marginTop: 8 }}>
                    Default ELM327 biasanya 1234 atau 0000.
                  </Text>
                </View>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  {/* 👇 KONTEN TAB WIFI YANG BARU 👇 */}
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
                      onPress={() => startScannerUI("wifi")}
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

              <TouchableOpacity style={styles.saveBtn} onPress={applyOBDConfig}>
                <Text style={styles.saveBtnText}>TERAPKAN & RESTART MODUL</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {/* MODAL LAPISAN KEDUA: RADAR SCANNER */}
        <Modal visible={showScanner} transparent animationType="fade">
          <View
            style={[styles.modalBg, { backgroundColor: "rgba(0,0,0,0.9)" }]}
          >
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
                <ScrollView style={{ maxHeight: 250 }}>
                  {scannedDevices.length === 0 ? (
                    <Text
                      style={{
                        color: "#888",
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      Tidak menemukan perangkat OBD2 Bluetooth. Pastikan ELM327
                      dicolok dengan benar.
                    </Text>
                  ) : (
                    scannedDevices.map((dev, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.scannedItem}
                        onPress={() => selectDevice(dev.name, dev.mac)}
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
        <Modal visible={confirmAlert.visible} transparent animationType="fade">
          <View
            style={[styles.modalBg, { backgroundColor: "rgba(0,0,0,0.9)" }]}
          >
            <View
              style={[
                styles.modalBox,
                {
                  borderColor: confirmAlert.isDanger ? "#ff4444" : "#3498db",
                  alignItems: "center",
                  paddingVertical: 30,
                  width: "80%",
                },
              ]}
            >
              <Ionicons
                name={confirmAlert.isDanger ? "warning" : "cloud-upload"}
                size={60}
                color={confirmAlert.isDanger ? "#ff4444" : "#3498db"}
                style={{ marginBottom: 15 }}
              />
              <Text
                style={[
                  styles.modalTitle,
                  { textAlign: "center", marginBottom: 10, fontSize: 18 },
                ]}
              >
                {confirmAlert.title}
              </Text>
              <Text
                style={{
                  color: "#888",
                  textAlign: "center",
                  marginBottom: 25,
                  lineHeight: 22,
                  fontSize: 14,
                }}
              >
                {confirmAlert.message}
              </Text>

              <View style={{ flexDirection: "row", gap: 15, width: "100%" }}>
                <TouchableOpacity
                  style={[styles.saveBtn, { flex: 1, backgroundColor: "#222" }]}
                  onPress={() =>
                    setConfirmAlert((prev) => ({ ...prev, visible: false }))
                  }
                >
                  <Text style={[styles.saveBtnText, { color: "#fff" }]}>
                    {confirmAlert.cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    {
                      flex: 1,
                      backgroundColor: confirmAlert.isDanger
                        ? "#ff4444"
                        : "#3498db",
                    },
                  ]}
                  onPress={confirmAlert.onConfirm}
                >
                  <Text style={[styles.saveBtnText, { color: "#fff" }]}>
                    {confirmAlert.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const SensorCard = ({ icon, label, value, color }: any) => (
  <View style={styles.card}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.cardValue}>{value}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#050505" },
  container: { flex: 1, padding: 20 },

  // LAYAR AWAL (CLEAN)
  setupContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    justifyContent: "center",
  },
  headerCentered: { alignItems: "center", marginBottom: 20 },
  setupTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 15,
    letterSpacing: 1,
  },
  setupSubtitle: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    width: "100%",
  },
  connectBtn: {
    backgroundColor: "#00ff88",
    paddingVertical: 18,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
  },
  connectBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // DASHBOARD HEADER
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  brandText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: "bold", marginLeft: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  // MODAL SETTINGS
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#141414",
    width: "85%",
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  tabBtn: { flex: 1, padding: 12, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#00ff88" },
  tabText: { color: "#666", fontWeight: "bold" },

  configLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  configInput: {
    backgroundColor: "#000",
    color: "#00ff88",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  scanBtnMini: {
    backgroundColor: "#00ff88",
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  saveBtn: {
    backgroundColor: "#00ff88",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnText: { color: "#000", fontWeight: "bold", letterSpacing: 1 },

  // MODAL RADAR
  scannedItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  scannedItemName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  scannedItemMac: { color: "#888", fontSize: 12, marginTop: 2 },

  // ... (SISA STYLE GAUGE TETAP SAMA)
  gaugeContainerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 35,
    gap: 10,
  },
  gaugeWrapper: { flex: 1, alignItems: "center" },
  mainRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "#111",
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    elevation: 15,
    shadowColor: "#00ff88",
    shadowRadius: 20,
    shadowOpacity: 0.15,
  },
  gaugeValueText: { color: "#fff", fontSize: 38, fontWeight: "900" },
  gaugeUnitText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: -2,
    letterSpacing: 1,
  },
  rpmTrackSmall: {
    width: "70%",
    height: 3,
    backgroundColor: "#111",
    borderRadius: 2,
    marginTop: 10,
    overflow: "hidden",
  },
  rpmFillSmall: { height: "100%", backgroundColor: "#00ff88" },
  helperText: {
    color: "#333",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 10,
    letterSpacing: 2,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    width: "31%",
    backgroundColor: "#0e0e0e",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#151515",
  },
  cardValue: { color: "#fff", fontSize: 16, fontWeight: "bold", marginTop: 8 },
  cardLabel: {
    color: "#444",
    fontSize: 8,
    fontWeight: "bold",
    marginTop: 2,
    letterSpacing: 1,
  },
  trimContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 10,
  },
  trimBox: {
    flex: 1,
    backgroundColor: "#0e0e0e",
    padding: 15,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trimLabel: { color: "#444", fontSize: 10, fontWeight: "bold" },
  trimValue: { color: "#00ff88", fontSize: 14, fontWeight: "bold" },
  fuelRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
    backgroundColor: "#0e0e0e",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#151515",
    marginBottom: 15,
  },
  fuelItem: { alignItems: "center" },
  fuelLabel: {
    color: "#444",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  fuelValue: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 5 },
  unitSmall: { fontSize: 10, color: "#666" },
  recordFabActive: { backgroundColor: "#ff4444" },
  recordingDot: {
    position: "absolute",
    top: 15,
    right: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  recordFabContainer: {
    position: "absolute",
    right: 0, // Tempel ke paling kanan
    bottom: 30,
  },
  recordFab: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#00ff88",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  secretZone: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60, // Menutupi area Tab Bar Dashboard
    backgroundColor: "transparent",
  },
});
