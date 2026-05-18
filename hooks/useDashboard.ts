import AsyncStorage from "@react-native-async-storage/async-storage";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as ExpoLocation from "expo-location";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, StatusBar as RNStatusBar } from "react-native";
import { useAlert } from "../components/AlertContext";
import useBLE from "./useBLE";

export default function useDashboard() {
  const { showAlert } = useAlert();

  // --- 1. UI STATE ---
  const [isHudMode, setIsHudMode] = useState(false);
  const [isNightTime, setIsNightTime] = useState(false);
  const [transmission, setTransmission] = useState<"manual" | "matic" | null>(
    null,
  );
  const [showTransModal, setShowTransModal] = useState(false);

  // --- 2. OTA & BYPASS STATE ---
  const [otaTapCount, setOtaTapCount] = useState(0);
  const [showOTAModal, setShowOTAModal] = useState(false);
  const lastTapTime = useRef(0);
  const [isBypassed, setIsBypassed] = useState(false);
  const [bypassTapCount, setBypassTapCount] = useState(0);

  // --- 3. HUD TAP STATE ---
  const [hudTapCount, setHudTapCount] = useState(0);
  const hudTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 4. SENSOR DATA STATE ---
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
  const sessionStats = useRef({ distance: 0, fuel: 0 });
  const tripDataRef = useRef<any[]>([]);
  const lastUpdateTime = useRef(Date.now());
  const lastSaveTime = useRef(0);
  const currentTripId = useRef("");
  const latestLocation = useRef<ExpoLocation.LocationObjectCoords | null>(null);
  const runningStats = useRef({ distance: 0, fuel: 0, startTime: 0 });
  const isRecordingRef = useRef(isRecording);

  // --- 5. SETTINGS STATE ---
  const [showSettings, setShowSettings] = useState(false);
  const [obdType, setObdType] = useState<"bluetooth" | "wifi">("bluetooth");
  const [obdMac, setObdMac] = useState("");
  const [obdPin, setObdPin] = useState("1234");
  const [obdWifiSsid, setObdWifiSsid] = useState("WiFi_OBDII");
  const [obdIp, setObdIp] = useState("192.168.0.10");
  const [obdPort, setObdPort] = useState("35000");
  const [autoLock, setAutoLock] = useState(true);
  const [lockSpeed, setLockSpeed] = useState("15");
  const [otaSsid, setOtaSsid] = useState("Iqi");
  const [otaPass, setOtaPass] = useState("12345678");
  const [isConnectingBLE, setIsConnectingBLE] = useState(false);
  const connectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 6. RADAR & ALERT STATE ---
  const [showScanner, setShowScanner] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<
    { name: string; mac: string }[]
  >([]);
  const [isSearchingOBD, setIsSearchingOBD] = useState(false);
  const [confirmAlert, setConfirmAlert] = useState({
    visible: false,
    title: "",
    message: "",
    confirmText: "Ya",
    cancelText: "Batal",
    isDanger: false,
    onConfirm: () => {},
  });

  // --- FAB ANIMATION ---
  const fabX = useRef(new Animated.Value(45)).current;
  const [isFabOpen, setIsFabOpen] = useState(false);

  const toggleFab = (open: boolean) => {
    setIsFabOpen(open);
    Animated.spring(fabX, {
      toValue: open ? 0 : 45,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -20) toggleFab(true);
        if (gestureState.dx > 20) toggleFab(false);
      },
    }),
  ).current;

  // --- LOAD INIT DATA ---
  useEffect(() => {
    const loadInitData = async () => {
      const hour = new Date().getHours();
      setIsNightTime(hour >= 18 || hour < 5);
      const savedTrans = await AsyncStorage.getItem("@livina_trans");
      if (savedTrans) setTransmission(savedTrans as "manual" | "matic");
      else setShowTransModal(true);

      const savedMac = await AsyncStorage.getItem("@obd_mac");
      const savedPin = await AsyncStorage.getItem("@obd_pin");
      const savedOtaSsid = await AsyncStorage.getItem("@ota_ssid");
      const savedOtaPass = await AsyncStorage.getItem("@ota_pass");

      if (savedMac) setObdMac(savedMac);
      if (savedPin) setObdPin(savedPin);
      if (savedOtaSsid) setOtaSsid(savedOtaSsid);
      if (savedOtaPass) setOtaPass(savedOtaPass);
    };
    loadInitData();
  }, []);

  // --- LOCATION TRACKER ---
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
        (loc) => {
          latestLocation.current = loc.coords;
        },
      );
    };
    startWatching();
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // --- TRIP DATA RECORDING LOGIC ---
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

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

  // --- BLE HANDLERS ---
  const handleRawText = (raw: string) => {
    console.log("📨 [BALASAN ECU]:", raw);
    if (raw === "SCAN_STATUS:SCANNING") setIsSearchingOBD(true);
    else if (raw === "SCAN_STATUS:DONE") setIsSearchingOBD(false);
    else if (raw.startsWith("SCAN_FOUND:")) {
      const parts = raw.replace("SCAN_FOUND:", "").split("|");
      if (parts.length === 2) {
        setScannedDevices((prev) =>
          prev.find((d) => d.mac === parts[1])
            ? prev
            : [...prev, { name: parts[0], mac: parts[1] }],
        );
      }
    } else if (raw.startsWith("CONFIG:")) {
      const pairs = raw.replace("CONFIG:", "").split(",");
      const config: Record<string, string> = {};
      pairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) config[key] = value;
      });
      if (config.autolock !== undefined) setAutoLock(config.autolock === "1");
      if (config.lockspeed !== undefined) setLockSpeed(config.lockspeed);
    }
  };

  const updateData = (newData: any) => {
    setData(newData);
    const now = Date.now();
    const dt = (now - lastUpdateTime.current) / 3600000; // Delta Time dalam Jam (h)
    lastUpdateTime.current = now;

    // --- 1. RUMUS FUEL FLOW (L/h) ---
    // MAF * 0.3309 (Bensin RON 90-92, Stoich 14.7)
    let fuelFlow = newData.m * 0.3309;

    // --- 2. KOREKSI FUEL TRIMS ---
    fuelFlow = fuelFlow * (1 + (newData.st + newData.lt) / 100);

    // --- 3. DFCO (Deceleration Fuel Cut-Off) ---
    // Kompensasi Absolute Throttle Nissan (Lepas gas biasanya 12-16%)
    const isDFCO = newData.th < 18 && newData.s > 20 && newData.r > 1200;
    if (isDFCO) {
      fuelFlow = 0; // Injektor mati
    }

    // --- 4. KALKULASI AVG FUEL (TOTAL DISTANCE / TOTAL FUEL) ---
    if (dt > 0 && dt < 1) {
      // Abaikan lonjakan waktu saat pertama connect
      sessionStats.current.distance += newData.s * dt;
      sessionStats.current.fuel += fuelFlow * dt;

      if (sessionStats.current.fuel > 0) {
        setAvgFuel(sessionStats.current.distance / sessionStats.current.fuel);
      }
    }

    // --- 5. LOGIC RECORDING KE DALAM RIWAYAT PERJALANAN ---
    if (isRecordingRef.current) {
      runningStats.current.distance += newData.s * dt;
      runningStats.current.fuel += fuelFlow * dt;

      // Hitung Inst Fuel khusus untuk rekaman CSV
      let recInst = 0.0;
      if (isDFCO) recInst = 99.9;
      else if (newData.s > 2 && fuelFlow > 0)
        recInst = Math.min(newData.s / fuelFlow, 99.9);

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
        instFuel: recInst.toFixed(1), // Simpan nilai Inst Fuel akurat
        time: new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: isDFCO
          ? "DFCO Active (Fuel Cut)"
          : newData.s > 80
            ? "High Speed"
            : newData.r > 3500
              ? "Aggressive"
              : "Cruising",
      });

      // (Logic buffer 500 dan autosave tetap aman di bawah sini...)
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

  const {
    isConnected,
    requestPermissions,
    scanForDevices,
    sendMessage,
    disconnectDevice,
  } = useBLE(updateData, handleRawText);
  const isConnectedRef = useRef(isConnected);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);
  useEffect(() => {
    if (isConnected) {
      if (connectingTimerRef.current) {
        clearTimeout(connectingTimerRef.current);
        connectingTimerRef.current = null;
      }
      setIsConnectingBLE(false);
      const timer = setTimeout(() => {
        sendMessage("GET_CONFIG");
        if (isNightTime)
          setTimeout(
            () =>
              showAlert(
                "Mode Malam Terdeteksi",
                "Ketuk ikon 'Mata' untuk HUD.",
                "success",
              ),
            1500,
          );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isNightTime]);

  // --- ACTIONS ---
  const handleConnectToModule = async () => {
    const hasPermission = await requestPermissions();
    if (hasPermission) {
      setIsConnectingBLE(true);
      connectingTimerRef.current = setTimeout(() => {
        if (!isConnectedRef.current) {
          setIsConnectingBLE(false);
          showAlert("Koneksi Gagal", "Modul tidak ditemukan.", "error");
        }
      }, 25000);
      scanForDevices();
    } else {
      showAlert(
        "Izin Ditolak",
        "Aplikasi butuh akses Bluetooth & Lokasi.",
        "error",
      );
    }
  };

  const handleHudTap = () => {
    // 1. Bersihkan timer lama jika ada (mencegah bentrok)
    if (hudTapTimer.current) {
      clearTimeout(hudTapTimer.current);
    }

    // 2. Cek dan update jumlah tap
    setHudTapCount((prevCount) => {
      if (prevCount >= 1) {
        exitHudMode();
        return 0;
      } else {
        hudTapTimer.current = setTimeout(() => {
          setHudTapCount(0);
        }, 800);

        return 1;
      }
    });
  };

  const applyOBDConfig = async () => {
    if (obdType === "bluetooth") {
      if (!obdMac || !obdPin)
        return showAlert("Error", "MAC/PIN kosong!", "error");
      await AsyncStorage.setItem("@obd_mac", obdMac);
      await AsyncStorage.setItem("@obd_pin", obdPin);
      sendMessage(`SET_OBD_MAC:${obdMac}`);
      setTimeout(() => sendMessage(`SET_OBD_PIN:${obdPin}`), 300);
      setTimeout(() => sendMessage("SET_MODE_1"), 600);
    } else {
      if (!obdWifiSsid) return showAlert("Error", "SSID kosong!", "error");
      sendMessage(`SET_OBD_WIFI_SSID:${obdWifiSsid}`);
      setTimeout(() => sendMessage(`SET_OBD_WIFI_IP:${obdIp}`), 300);
      setTimeout(() => sendMessage(`SET_OBD_WIFI_PORT:${obdPort}`), 600);
      setTimeout(() => sendMessage("SET_MODE_2"), 900);
    }
    setShowSettings(false);
    showAlert("Konfigurasi Tersimpan", "ESP32 akan restart.", "success");
  };

  const enterHudMode = async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    );
    await NavigationBar.setVisibilityAsync("hidden");
    RNStatusBar.setHidden(true, "none");
    await activateKeepAwakeAsync();
    setIsHudMode(true);
  };

  const exitHudMode = async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
    await NavigationBar.setVisibilityAsync("visible");
    RNStatusBar.setHidden(false, "slide");
    await deactivateKeepAwake();
    setIsHudMode(false);
  };

  const handleSetupSecretTap = () => {
    const newCount = bypassTapCount + 1;
    setBypassTapCount(newCount);
    if (newCount >= 7) {
      setIsBypassed(true);
      showAlert("Bypass Active", "Mode Demo diaktifkan.", "success");
    }
  };

  const handleSecretOtaTrigger = () => {
    const now = Date.now();
    if (now - lastTapTime.current > 1000) setOtaTapCount(1);
    else {
      const newCount = otaTapCount + 1;
      setOtaTapCount(newCount);
      if (newCount >= 5) {
        setShowOTAModal(true);
        setOtaTapCount(0);
      }
    }
    lastTapTime.current = now;
  };

  const saveTransmission = async (type: "manual" | "matic") => {
    await AsyncStorage.setItem("@livina_trans", type);
    setTransmission(type);
    setShowTransModal(false);
  };

  const disconnectOBD = () => {
    setConfirmAlert({
      visible: true,
      title: "Standby Mode",
      message: "Memutus ESP32 dari OBD2. Lanjutkan?",
      confirmText: "Ya",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: () => {
        sendMessage("DISCONNECT_OBD");
        setConfirmAlert((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const startScannerUI = (type: "bluetooth" | "wifi") => {
    setShowScanner(true);
    setScannedDevices([]);
    setIsSearchingOBD(true);
    if (type === "bluetooth") sendMessage("START_BT_SCAN");
    else sendMessage("START_WIFI_SCAN");
  };

  const selectDevice = (name: string, mac: string) => {
    if (mac === "WIFI") setObdWifiSsid(name);
    else setObdMac(mac);
    setShowScanner(false);
  };

  const enterOTAMode = async () => {
    if (!otaSsid || !otaPass)
      return showAlert(
        "Error",
        "SSID dan Password Hotspot tidak boleh kosong!",
        "error",
      );
    await AsyncStorage.setItem("@ota_ssid", otaSsid);
    await AsyncStorage.setItem("@ota_pass", otaPass);

    setShowOTAModal(false);

    setTimeout(() => {
      setConfirmAlert({
        visible: true,
        title: "Masuk Mode Update (OTA)?",
        message: `Modul akan restart dan mencari Hotspot:\n"${otaSsid}"\n\nPastikan Hotspot menyala.`,
        confirmText: "Ya, Masuk OTA",
        cancelText: "Batal",
        isDanger: false,
        onConfirm: () => {
          sendMessage(`WIFI_SSID:${otaSsid}`);
          setTimeout(() => sendMessage(`WIFI_PASS:${otaPass}`), 300);
          setTimeout(() => {
            sendMessage("SET_MODE_0");

            // 👇 3. Tutup Pop-Up Konfirmasinya
            setConfirmAlert((prev) => ({ ...prev, visible: false }));

            showAlert(
              "Mode OTA Aktif",
              `Nyalakan Hotspot "${otaSsid}" dan buka Aplikasi OTA.`,
              "success",
            );
          }, 600);
        },
      });
    }, 300);
  };

  let currentFuelFlow = data.m * 0.3309;
  currentFuelFlow = currentFuelFlow * (1 + (data.st + data.lt) / 100);

  const isDFCO = data.th < 23 && data.s > 20 && data.r > 1200;
  if (isDFCO) currentFuelFlow = 0;

  let instFuel = 0.0;
  if (isDFCO) {
    instFuel = 99.9; // Tampilkan angka mentok kalau DFCO (Injektor mati)
  } else if (data.s > 2 && currentFuelFlow > 0) {
    instFuel = Math.min(data.s / currentFuelFlow, 99.9); // Cap maksimal di 99.9 km/L
  } else {
    instFuel = 0.0; // Saat idle (speed <= 2)
  }

  // --- KEMBALIKAN SEMUA STATE & ACTIONS KE INDEX.TSX ---
  return {
    state: {
      isHudMode,
      isNightTime,
      transmission,
      showTransModal,
      showOTAModal,
      otaSsid,
      otaPass,
      isBypassed,
      bypassTapCount,
      data,
      isRecording,
      avgFuel,
      instFuel,
      showSettings,
      obdType,
      obdMac,
      obdPin,
      obdWifiSsid,
      obdIp,
      obdPort,
      autoLock,
      lockSpeed,
      isConnectingBLE,
      showScanner,
      scannedDevices,
      isSearchingOBD,
      confirmAlert,
      isConnected,
      fabX,
      isFabOpen,
      panResponder,
      hudTapCount,
    },
    actions: {
      setOtaSsid,
      setOtaPass,
      setShowOTAModal,
      setShowSettings,
      setObdType,
      setObdMac,
      setObdPin,
      setObdWifiSsid,
      setObdIp,
      setObdPort,
      setAutoLock,
      setLockSpeed,
      setShowScanner,
      setConfirmAlert,

      handleConnectToModule,
      applyOBDConfig,
      enterHudMode,
      exitHudMode,
      sendMessage,
      toggleFab,
      disconnectDevice,
      setHudTapCount,
      handleSetupSecretTap,
      handleSecretOtaTrigger,
      saveTransmission,
      disconnectOBD,
      startScannerUI,
      selectDevice,
      enterOTAMode,
      toggleRecording,
      handleHudTap,
    },
  };
}
