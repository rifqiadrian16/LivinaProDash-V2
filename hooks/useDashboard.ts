import AsyncStorage from "@react-native-async-storage/async-storage";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as ExpoLocation from "expo-location";
import * as MediaLibrary from "expo-media-library";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  PermissionsAndroid,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { useAlert } from "../components/AlertContext";
import {
  getDB,
  insertNewTrip,
  insertTripPoint,
  updateTripStats,
} from "../utils/database";
import useBLE from "./useBLE";

const BACKGROUND_LOCATION_TASK = "LIVINA_BACKGROUND_TRACKING";

export default function useDashboard() {
  const { showAlert } = useAlert();

  const [isHudMode, setIsHudMode] = useState(false);
  const [isNightTime, setIsNightTime] = useState(false);
  const [transmission, setTransmission] = useState<"manual" | "matic" | null>(
    null,
  );
  const [showTransModal, setShowTransModal] = useState(false);

  const [otaTapCount, setOtaTapCount] = useState(0);
  const [showOTAModal, setShowOTAModal] = useState(false);
  const lastTapTime = useRef(0);
  const [isBypassed, setIsBypassed] = useState(false);
  const [bypassTapCount, setBypassTapCount] = useState(0);

  const [hudTapCount, setHudTapCount] = useState(0);
  const hudTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // const tripDataRef = useRef<any[]>([]);
  const lastUpdateTime = useRef(Date.now());
  // const lastSaveTime = useRef(0);
  const lastStatsSaveTime = useRef(0);

  // === TAHANAN WAKTU UNTUK LOGGING (MENGURANGI UKURAN FILE JSON 90%) ===
  const lastPointSaveTime = useRef(0);

  const currentTripId = useRef("");
  const latestLocation = useRef<ExpoLocation.LocationObjectCoords | null>(null);
  const runningStats = useRef({ distance: 0, fuel: 0, startTime: 0 });
  const isRecordingRef = useRef(isRecording);

  const [showSaveTripModal, setShowSaveTripModal] = useState(false);
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
  const [obdStatus, setObdStatus] = useState<
    "disconnected" | "waiting_mac" | "checking" | "connecting_ecu" | "ready"
  >("disconnected");
  const [isObdStandby, setIsObdStandby] = useState(false);

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

  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "LivinaProDash OBD Terminal v1.0",
    "Ketik PID lalu tekan Enter/Kirim...",
    "--------------------------------",
  ]);

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

  const [bgPermissionsGranted, setBgPermissionsGranted] = useState(false);

  useEffect(() => {
    const requestAllPermissions = async () => {
      if (Platform.OS !== "android") return;

      // 1. TODONG IZIN NOTIFIKASI (Khusus Android 13+)
      if (Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        } catch (err) {
          console.warn("[PERMISSIONS] Gagal minta izin notifikasi:", err);
        }
      }

      // 2. TODONG IZIN FOTO / GALERI (Untuk menyimpan Kartu Trip)
      try {
        const mediaStatus = await MediaLibrary.requestPermissionsAsync();
        if (!mediaStatus.granted) {
          console.log("[PERMISSIONS] User menolak izin Foto/Galeri");
        }
      } catch (err) {
        console.warn("[PERMISSIONS] Gagal minta izin galeri:", err);
      }

      // 3. TODONG IZIN LOKASI (Foreground dulu, baru Background)
      try {
        const fgStatus = await ExpoLocation.requestForegroundPermissionsAsync();
        if (fgStatus.granted) {
          const bgStatus =
            await ExpoLocation.requestBackgroundPermissionsAsync();
          setBgPermissionsGranted(bgStatus.granted);
        }
      } catch (err) {
        console.warn("[PERMISSIONS] Gagal minta izin lokasi:", err);
      }
    };

    // Eksekusi fungsi sapu jagatnya!
    requestAllPermissions();
  }, []);

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
      const orphanStats = await AsyncStorage.getItem("@livina_running_stats");

      if (orphanStats) {
        try {
          const stats = JSON.parse(orphanStats);

          if (stats.tripId) {
            // 1. Set ulang State sementara (seolah-olah kita masih jalan)
            currentTripId.current = stats.tripId;
            runningStats.current = {
              distance: stats.distance || 0,
              fuel: stats.fuel || 0,
              startTime: stats.startTime || Date.now(),
            };

            // 2. Panggil fungsi saveTripData agar data dikunci ke SQLite
            const autoName = `Auto-Save (Recovery ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})`;
            saveTripData(autoName);

            // 3. Bersihkan sampah agar tidak looping recovery terus menerus
            await AsyncStorage.removeItem("@livina_running_stats");

            showAlert(
              "Trip Dipulihkan",
              "Aplikasi sempat terhenti. Data perjalanan berhasil diselamatkan dari SQLite!",
              "success",
            );
          }
        } catch (e) {
          await AsyncStorage.removeItem("@livina_running_stats");
        }
      }

      if (savedMac) setObdMac(savedMac);
      if (savedPin) setObdPin(savedPin);
      if (savedOtaSsid) setOtaSsid(savedOtaSsid);
      if (savedOtaPass) setOtaPass(savedOtaPass);
    };
    loadInitData();
  }, []);

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

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const saveTripData = (tripName: string, fuelPrice: number = 10000) => {
    try {
      const db = getDB();

      // Ambil seluruh telemetri dari trip ini untuk menghitung statistik
      const points = db.getAllSync(
        "SELECT altitude, speed, rpm FROM trip_points WHERE trip_id = ?",
        [currentTripId.current],
      );

      let topSpeed = 0;
      let maxRpm = 0;
      let peakAlt = 0;
      let totalClimb = 0;
      let previousAlt: number | null = null;

      points.forEach((p: any) => {
        if (p.speed > topSpeed) topSpeed = p.speed;
        if (p.rpm > maxRpm) maxRpm = p.rpm;
        if (p.altitude > peakAlt) peakAlt = p.altitude;
        if (previousAlt !== null && p.altitude > previousAlt)
          totalClimb += p.altitude - previousAlt;
        previousAlt = p.altitude;
      });

      const fuelUsed = runningStats.current.fuel.toFixed(1);

      // Kunci datanya!
      const finalStats = {
        route: tripName.trim() || `Livina Drive`,
        distance: runningStats.current.distance.toFixed(1) + " km",
        time:
          Math.round((Date.now() - runningStats.current.startTime) / 60000) +
          "m",
        fuel: fuelUsed + " L",
        ecoScore: topSpeed > 110 ? 60 : 90,
        topSpeed: topSpeed + " km/h",
        maxRpm: maxRpm,
        cost:
          "Rp " +
          Math.round(runningStats.current.fuel * fuelPrice).toLocaleString(
            "id-ID",
          ),
        peakAlt: Math.round(peakAlt).toString(),
        climb: Math.round(totalClimb).toString(),
      };

      updateTripStats(currentTripId.current, finalStats);

      // Bersihkan indikator live
      AsyncStorage.removeItem("@livina_running_stats");
      showAlert("Tersimpan!", "Data perjalanan aman di Database.", "success");
    } catch (error) {
      console.error("[DB SAVE ERROR]", error);
      showAlert("Error", "Gagal merangkum data perjalanan.", "error");
    }
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      const newTripId = Date.now().toString();
      currentTripId.current = newTripId;
      runningStats.current = { distance: 0, fuel: 0, startTime: Date.now() };
      lastUpdateTime.current = Date.now();
      lastPointSaveTime.current = Date.now();

      insertNewTrip(newTripId, "Merekam...");

      setIsRecording(true);
      activateKeepAwakeAsync("recording");

      // === AKTIFKAN FOREGROUND SERVICE ===
      if (bgPermissionsGranted) {
        try {
          await ExpoLocation.startLocationUpdatesAsync(
            BACKGROUND_LOCATION_TASK,
            {
              accuracy: ExpoLocation.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 1,
              // Ini yang bikin notifikasi melayang anti-kill muncul!
              foregroundService: {
                notificationTitle: "LivinaProDash Aktif",
                notificationBody:
                  "Merekam telemetri & koordinat GPS di latar belakang...",
                notificationColor: "#00ffcc",
              },
            },
          );
        } catch (err) {
          console.log("Gagal start background task", err);
        }
      }

      showAlert(
        "Recording",
        "GPS & Telemetri aktif merekam ke Database.",
        "success",
      );
    } else {
      setIsRecording(false);
      deactivateKeepAwake("recording");

      // === MATIKAN FOREGROUND SERVICE ===
      try {
        await ExpoLocation.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch (err) {
        // Abaikan kalau memang gak jalan
      }

      setShowSaveTripModal(true);
    }
  };

  const confirmSaveTrip = (tripName: string, fuelPrice: number) => {
    setShowSaveTripModal(false);
    AsyncStorage.removeItem("@livina_running_stats");
    saveTripData(tripName, fuelPrice);
  };

  const discardTrip = () => {
    setShowSaveTripModal(false);

    try {
      const db = getDB();
      db.execSync(`DELETE FROM trips WHERE id = '${currentTripId.current}';`);
    } catch (e) {
      console.log("Gagal hapus trip dari DB:", e);
    }

    AsyncStorage.removeItem("@livina_running_stats");
    showAlert(
      "Dibatalkan",
      "Trip tidak disimpan dan dihapus dari memori.",
      "error",
    );
  };

  const handleRawText = (raw: string) => {
    if (raw.startsWith("RAW_RES:")) {
      const balasan = raw.substring(8);
      setTerminalLogs((prev) => [...prev, `ECU > ${balasan || "NO DATA"}`]);
      return;
    }
    if (raw === "STATUS:WAITING_MAC") setObdStatus("waiting_mac");
    else if (raw === "SCAN_STATUS:SCANNING") setIsSearchingOBD(true);
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

      if (config.hasmac === "0") setObdStatus("waiting_mac");
      else if (config.hasmac === "1" && obdStatus !== "ready")
        setObdStatus("connecting_ecu");
    }
  };

  const updateData = (newData: any) => {
    setData(newData);
    if (newData.v > 0 || newData.r > 0) setObdStatus("ready");

    const now = Date.now();
    const dt = (now - lastUpdateTime.current) / 3600000;
    lastUpdateTime.current = now;

    // === RUMUS BENSIN BARU (LEBIH REALISTIS / TIDAK TERLALU IRIT) ===
    let targetAFR = 14.7;

    if (newData.th > 60) targetAFR = 11.5;
    else if (newData.th > 40) targetAFR = 12.5;
    else if (newData.th > 20) targetAFR = 13.5;

    let fuelFlow = (newData.m / targetAFR / 730.0) * 3600.0;

    const fuelCalibration = 1.28;
    fuelFlow =
      fuelFlow * (1 + (newData.st + newData.lt) / 100) * fuelCalibration;

    const isDFCO = newData.th < 0 && newData.s > 20 && newData.r > 1200;
    if (isDFCO) fuelFlow = 0;
    // ===============================================================

    if (dt > 0 && dt < 0.003) {
      // 1. Akumulasi jarak dan bensin selama ECU terkoneksi
      sessionStats.current.distance += newData.s * dt;
      sessionStats.current.fuel += fuelFlow * dt;

      // 2. Kalkulasi rata-rata (Jarak / Bensin) dan update ke layar
      if (sessionStats.current.fuel > 0) {
        setAvgFuel(sessionStats.current.distance / sessionStats.current.fuel);
      }
    }

    if (isRecordingRef.current) {
      if (dt > 0 && dt < 0.003) {
        runningStats.current.distance += newData.s * dt;
        runningStats.current.fuel += fuelFlow * dt;

        if (now - lastStatsSaveTime.current > 10000) {
          lastStatsSaveTime.current = now;
          AsyncStorage.setItem(
            "@livina_running_stats",
            JSON.stringify({
              ...runningStats.current,
              tripId: currentTripId.current,
            }),
          ).catch(() => {});
        }
      }

      // DATA LOGGER (THROTTLED): 2 Detik Sekali
      if (now - lastPointSaveTime.current > 2000) {
        lastPointSaveTime.current = now;

        let recInst = 0.0;
        if (isDFCO) recInst = 99.9;
        else if (newData.s > 2 && fuelFlow > 0)
          recInst = Math.min(newData.s / fuelFlow, 99.9);

        // Langsung Tembak Baris Baru ke SQLite! (0% RAM)
        try {
          insertTripPoint(currentTripId.current, {
            latitude: latestLocation.current?.latitude || 0,
            longitude: latestLocation.current?.longitude || 0,
            altitude: latestLocation.current?.altitude || 0,
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
            instFuel: recInst.toFixed(1),
            time: new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            note: isDFCO
              ? "Engine Brake (0%)"
              : newData.s > 80
                ? "High Speed"
                : newData.r > 3500
                  ? "Aggressive"
                  : "Cruising",
          });
        } catch (dbError) {
          console.warn("Gagal simpan titik, mungkin storage penuh:", dbError);
          // Aplikasi tidak akan crash, hanya melewati 1 frame data ini
        }
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
      lastUpdateTime.current = Date.now();
      if (connectingTimerRef.current) {
        clearTimeout(connectingTimerRef.current);
        connectingTimerRef.current = null;
      }
      setIsConnectingBLE(false);
      const timer = setTimeout(() => {
        setIsObdStandby(false);
        sendMessage("CONNECT_OBD");
        sendMessage("GET_CONFIG");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  useEffect(() => {
    const isDashboardUtama = obdStatus === "ready" || isBypassed;
    if (isDashboardUtama && isNightTime) {
      const AlertTimer = setTimeout(() => {
        showAlert(
          "Mode Malam Terdeteksi",
          "Ketuk ikon 'mata' untuk masuk ke mode HUD",
          "success",
        );
      }, 1500);
      return () => clearTimeout(AlertTimer);
    }
  }, [obdStatus, isBypassed, isNightTime]);

  useEffect(() => {
    if (!isConnected) {
      setObdStatus("disconnected");
      setIsHudMode(false);
      setShowSettings(false);
      setShowTransModal(false);
      setShowOTAModal(false);
      setShowTerminal(false);
      setShowScanner(false);
      setShowSaveTripModal(false);
      deactivateKeepAwake("hud");

      if (isRecordingRef.current) {
        console.log("⚠️ BLE Putus! Memicu Auto-Save Trip...");
        setIsRecording(false);
        isRecordingRef.current = false;
        deactivateKeepAwake("recording");

        setTimeout(() => {
          const autoName = `Auto-Save (${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})`;
          saveTripData(autoName);
          showAlert(
            "Koneksi Terputus",
            "Sistem mematikan perekaman dan mengamankan data otomatis.",
            "success",
          );
        }, 300);
      }
    } else {
      setObdStatus("checking");
    }
  }, [isConnected]);

  useEffect(() => {
    if (isBypassed) return;
    if (!isConnected && isRecording) {
      console.warn(
        "Bluetooth putus di tengah jalan! Menghentikan perekaman...",
      );
      // Panggil fungsi toggleRecord untuk mematikan mode record
      toggleRecording();

      // Beri tahu user
      showAlert(
        "Koneksi Terputus",
        "Perekaman Trip dihentikan otomatis karena modul OBD/ESP32 terputus.",
        "error",
      );
    }
  }, [isConnected, isRecording, isBypassed]);

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
    if (hudTapTimer.current) clearTimeout(hudTapTimer.current);
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

      // Murni dijejerin saja, Queue yang akan mengaturnya!
      sendMessage(`SET_OBD_MAC:${obdMac}`);
      sendMessage(`SET_OBD_PIN:${obdPin}`);
      sendMessage("SET_MODE_1");
    } else {
      if (!obdWifiSsid) return showAlert("Error", "SSID kosong!", "error");

      sendMessage(`SET_OBD_WIFI_SSID:${obdWifiSsid}`);
      sendMessage(`SET_OBD_WIFI_IP:${obdIp}`);
      sendMessage(`SET_OBD_WIFI_PORT:${obdPort}`);
      sendMessage("SET_MODE_2");
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
    await activateKeepAwakeAsync("hud");
    setIsHudMode(true);
  };

  const exitHudMode = async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    );
    await NavigationBar.setVisibilityAsync("visible");
    RNStatusBar.setHidden(false, "slide");
    await deactivateKeepAwake("hud");
    setIsHudMode(false);
    if (hudTapTimer.current) {
      clearTimeout(hudTapTimer.current);
      setHudTapCount(0);
    }
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
    if (isObdStandby) {
      sendMessage("CONNECT_OBD");
      setIsObdStandby(false);
      setObdStatus("connecting_ecu");
      showAlert(
        "Menghubungkan",
        "ESP32 mencoba mengunci ulang OBD2...",
        "success",
      );
    } else {
      setConfirmAlert({
        visible: true,
        title: "Masuk Mode Standby",
        message: "Memutus ESP32 dari OBD2. Lanjutkan?",
        confirmText: "Ya, Putuskan",
        cancelText: "Batal",
        isDanger: true,
        onConfirm: () => {
          sendMessage("DISCONNECT_OBD");
          setIsObdStandby(true);
          setConfirmAlert((prev) => ({ ...prev, visible: false }));
          showAlert("Standby Aktif", "Koneksi OBD2 dilepas", "success");
        },
      });
    }
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

    setConfirmAlert({
      visible: true,
      title: "Masuk Mode Update (OTA)?",
      message: `Modul akan restart dan mencari Hotspot:\n"${otaSsid}"\n\nPastikan Hotspot HP Mas sudah aktif.`,
      confirmText: "Ya",
      cancelText: "Batal",
      isDanger: true,
      onConfirm: () => {
        // Bebas tumpuk perintah, aman 100%!
        sendMessage(`WIFI_SSID:${otaSsid}`);
        sendMessage(`WIFI_PASS:${otaPass}`);
        sendMessage("SET_MODE_0");

        setConfirmAlert((prev) => ({ ...prev, visible: false }));
        showAlert(
          "Mode OTA Aktif",
          `Nyalakan Hotspot "${otaSsid}" dan buka Aplikasi OTA.`,
          "success",
        );
      },
    });
  };

  let targetAFR = 14.7;
  if (data.th > 50) targetAFR = 12.0;
  else if (data.th > 30) targetAFR = 13.5;

  let currentFuelFlow = (data.m / targetAFR / 740.0) * 3600.0;
  const fuelCalibration = 1.15;
  currentFuelFlow =
    currentFuelFlow * (1 + (data.st + data.lt) / 100) * fuelCalibration;

  const isDFCO = data.th === 0 && data.s > 20 && data.r > 1200;
  if (isDFCO) currentFuelFlow = 0;

  let instFuel = 0.0;
  if (isDFCO) instFuel = 99.9;
  else if (data.s > 2 && currentFuelFlow > 0)
    instFuel = Math.min(data.s / currentFuelFlow, 99.9);
  else instFuel = 0.0;

  const sendToTerminal = (cmd: string) => {
    if (!cmd.trim()) return;
    setTerminalLogs((prev) => [...prev, `$ ${cmd}`]);
    sendMessage(`RAW:${cmd}`);
  };

  const closeTerminal = () => {
    setShowTerminal(false);
    setTerminalLogs([
      "LivinaProDash OBD Terminal v1.0",
      "Ketik PID lalu tekan Enter/Kirim...",
      "--------------------------------",
    ]);
  };

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
      obdStatus,
      isObdStandby,
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
      showTerminal,
      terminalLogs,
      showSaveTripModal,
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
      setShowTerminal,
      sendToTerminal,
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
      closeTerminal,
      confirmSaveTrip,
      discardTrip,
    },
  };
}
