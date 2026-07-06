import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { useBLEContext } from "./BLEContext";

const GLOBAL_FUEL_KEY = "@prodash_lifetime_fuel_global";
const GLOBAL_DIST_KEY = "@prodash_lifetime_dist_global";
const GLOBAL_AVG_FUEL_KEY = "@prodash_lifetime_avgfuel_global";
const FUEL_PRICE_KEY = "@prodash_fuel_price_default";
const FUEL_CALIBRATION_KEY = "@prodash_fuel_calibration"; // TAMBAHAN
const CALIBRATION_TRACKER_KEY = "@prodash_calibration_tracker"; // TAMBAHAN

const MOVING_SPEED_THRESHOLD = 2; // km/h — di bawah ini idle, exclude dari basis AVG
const STOICH_AFR = 14.7; // basis tetap, dikoreksi trim — bukan tebakan breakpoint throttle lagi
const DEFAULT_CALIBRATION = 1.2; // titik awal netral, WAJIB dikalibrasi ulang pas isi tangki penuh pertama

const FuelContext = createContext<any>(null);

export const useFuelContext = () => {
  const ctx = useContext(FuelContext);
  if (!ctx) {
    throw new Error("useFuelContext harus dipanggil di dalam <FuelProvider>");
  }
  return ctx;
};

// =======================================================
// RUMUS TUNGGAL — dipakai sama persis oleh instant fuel DAN
// akumulasi lifetime/session. Sengaja disederhanakan: AFR basis
// tetap 14.7 (stoikiometri), dikoreksi oleh trim ECU (STFT+LTFT)
// yang memang representasi REAL seberapa jauh ECU mengoreksi
// campuran — bukan tebakan breakpoint throttle lagi.
// =======================================================
function calcFuelFlowLPH(newData: any, calibration: number) {
  // DFCO: throttle full closed (dgn toleransi noise sensor 0-1%),
  // kecepatan & RPM masih tinggi = deselerasi/engine brake.
  // FIX: sebelumnya cek "th < 0" yang mustahil kejadian krn firmware
  // clamp throttle 0-100, jadi DFCO gak pernah kedeteksi.
  const isDFCO = newData.th <= 1 && newData.s > 20 && newData.r > 1200;
  if (isDFCO) return 0;

  const density = 730.0; // g/L bensin, konstanta — diserap oleh faktor kalibrasi
  let flow = (newData.m / STOICH_AFR / density) * 3600.0; // L/jam basis stoikiometri murni
  flow = flow * (1 + (newData.st + newData.lt) / 100); // koreksi trim aktual dari ECU
  flow = flow * calibration; // SATU-SATUNYA faktor kalibrasi, diatur lewat app

  return flow;
}

export const FuelProvider = ({ children }: { children: React.ReactNode }) => {
  const { subscribeData } = useBLEContext();

  const [instFuel, setInstFuel] = useState(0);
  const [avgFuel, setAvgFuel] = useState(0);
  const [globalAvgFuel, setGlobalAvgFuel] = useState("0.0");
  const [globalTotalFuel, setGlobalTotalFuel] = useState("0.0");
  const [fuelPrice, setFuelPriceState] = useState(10000);
  const [calibration, setCalibrationState] = useState(DEFAULT_CALIBRATION);

  // TAMBAHAN: tracker buat wizard kalibrasi (independen dari global/session)
  const [isTracking, setIsTracking] = useState(false);
  const [trackerFuel, setTrackerFuel] = useState(0); // liter terpakai (versi terkalibrasi) sejak tracking mulai
  const [trackerDistance, setTrackerDistance] = useState(0); // km sejak tracking mulai

  const sessionStats = useRef({ distance: 0, fuel: 0 });
  const lastUpdateTime = useRef(Date.now());
  const lastGlobalFuelSaveTime = useRef(Date.now());
  const globalFuelAccumulator = useRef(0.0);
  const globalDistAccumulator = useRef(0.0);
  const globalAvgFuelAccumulator = useRef(0.0);

  const calibrationRef = useRef(DEFAULT_CALIBRATION);
  const isTrackingRef = useRef(false);
  const trackerFuelAccumulator = useRef(0.0);
  const trackerDistAccumulator = useRef(0.0);
  const lastTrackerSaveTime = useRef(Date.now());

  const syncGlobalStats = async () => {
    try {
      const savedFuel = await AsyncStorage.getItem(GLOBAL_FUEL_KEY);
      const savedDist = await AsyncStorage.getItem(GLOBAL_DIST_KEY);
      const savedAvgFuel = await AsyncStorage.getItem(GLOBAL_AVG_FUEL_KEY);

      const fuel = savedFuel ? parseFloat(savedFuel) : 0;
      const dist = savedDist ? parseFloat(savedDist) : 0;
      const avgFuelBasis = savedAvgFuel ? parseFloat(savedAvgFuel) : 0;

      setGlobalTotalFuel(fuel.toFixed(1));
      setGlobalAvgFuel(
        avgFuelBasis > 0 && dist > 0 ? (dist / avgFuelBasis).toFixed(1) : "0.0",
      );
    } catch (e) {
      console.log("[FuelContext] Gagal memuat statistik global", e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const price = await AsyncStorage.getItem(FUEL_PRICE_KEY);
        if (price) setFuelPriceState(parseInt(price));

        const cal = await AsyncStorage.getItem(FUEL_CALIBRATION_KEY);
        if (cal) {
          const parsedCal = parseFloat(cal);
          setCalibrationState(parsedCal);
          calibrationRef.current = parsedCal;
        }

        const tracker = await AsyncStorage.getItem(CALIBRATION_TRACKER_KEY);
        if (tracker) {
          const t = JSON.parse(tracker);
          setIsTracking(t.active);
          isTrackingRef.current = t.active;
          setTrackerFuel(t.fuel || 0);
          setTrackerDistance(t.distance || 0);
          trackerFuelAccumulator.current = 0;
          trackerDistAccumulator.current = 0;
        }
      } catch (e) {
        console.log("[FuelContext] Gagal load pengaturan", e);
      }
      await syncGlobalStats();
    })();
  }, []);

  const setFuelPrice = async (price: number) => {
    setFuelPriceState(price);
    await AsyncStorage.setItem(FUEL_PRICE_KEY, price.toString());
  };

  // TAMBAHAN: set kalibrasi manual langsung (buat power-user yang mau fine-tune sendiri)
  const setCalibrationManual = async (value: number) => {
    setCalibrationState(value);
    calibrationRef.current = value;
    await AsyncStorage.setItem(FUEL_CALIBRATION_KEY, value.toString());
  };

  // TAMBAHAN: mulai sesi tracking wizard (dipanggil pas user baru isi tangki penuh)
  const startCalibrationTracking = async () => {
    setIsTracking(true);
    isTrackingRef.current = true;
    setTrackerFuel(0);
    setTrackerDistance(0);
    trackerFuelAccumulator.current = 0;
    trackerDistAccumulator.current = 0;
    await AsyncStorage.setItem(
      CALIBRATION_TRACKER_KEY,
      JSON.stringify({ active: true, fuel: 0, distance: 0 }),
    );
  };

  // TAMBAHAN: batal tracking tanpa mengubah kalibrasi
  const cancelCalibrationTracking = async () => {
    setIsTracking(false);
    isTrackingRef.current = false;
    setTrackerFuel(0);
    setTrackerDistance(0);
    await AsyncStorage.removeItem(CALIBRATION_TRACKER_KEY);
  };

  // TAMBAHAN: selesai — user masukin liter ASLI dari pom, kita hitung
  // kalibrasi baru = kalibrasi lama * (liter asli / liter yang dihitung app)
  const finishCalibrationTracking = async (actualLiters: number) => {
    const computedLiters = trackerFuel;
    if (computedLiters <= 0) {
      throw new Error("Belum ada data konsumsi terekam, coba jalan dulu.");
    }
    const newCalibration =
      calibrationRef.current * (actualLiters / computedLiters);

    await setCalibrationManual(newCalibration);
    setIsTracking(false);
    isTrackingRef.current = false;
    setTrackerFuel(0);
    setTrackerDistance(0);
    await AsyncStorage.removeItem(CALIBRATION_TRACKER_KEY);

    return newCalibration;
  };

  const resetGlobalFuel = async () => {
    await AsyncStorage.setItem(GLOBAL_FUEL_KEY, "0.0");
    await AsyncStorage.setItem(GLOBAL_DIST_KEY, "0.0");
    await AsyncStorage.setItem(GLOBAL_AVG_FUEL_KEY, "0.0");
    setGlobalAvgFuel("0.0");
    setGlobalTotalFuel("0.0");
    sessionStats.current = { distance: 0, fuel: 0 };
    setAvgFuel(0);
  };

  const handleData = (newData: any) => {
    const now = Date.now();
    const dt = (now - lastUpdateTime.current) / 3600000;
    lastUpdateTime.current = now;

    const fuelFlow = calcFuelFlowLPH(newData, calibrationRef.current);
    const isMoving = newData.s > MOVING_SPEED_THRESHOLD;

    if (dt > 0 && dt < 0.003) {
      const frameFuelConsumption = fuelFlow * dt;

      // Session avg (exclude idle)
      if (isMoving) {
        sessionStats.current.distance += newData.s * dt;
        sessionStats.current.fuel += frameFuelConsumption;
      }
      if (sessionStats.current.fuel > 0) {
        setAvgFuel(sessionStats.current.distance / sessionStats.current.fuel);
      }

      // Total BBM terpakai (termasuk idle)
      globalFuelAccumulator.current += frameFuelConsumption;
      globalDistAccumulator.current += newData.s * dt;

      // Basis AVG lifetime (exclude idle)
      if (isMoving) {
        globalAvgFuelAccumulator.current += frameFuelConsumption;
      }

      // TAMBAHAN: tracker wizard kalibrasi (kalau lagi aktif) —
      // catat SEMUA fuel & distance apa adanya, termasuk idle,
      // karena yang mau divalidasi adalah "isi tangki habis berapa liter total"
      if (isTrackingRef.current) {
        trackerFuelAccumulator.current += frameFuelConsumption;
        trackerDistAccumulator.current += newData.s * dt;
      }

      if (now - lastGlobalFuelSaveTime.current > 5000) {
        lastGlobalFuelSaveTime.current = now;
        const cachedFuel = globalFuelAccumulator.current;
        const cachedDist = globalDistAccumulator.current;
        const cachedAvgFuel = globalAvgFuelAccumulator.current;

        globalFuelAccumulator.current = 0.0;
        globalDistAccumulator.current = 0.0;
        globalAvgFuelAccumulator.current = 0.0;

        AsyncStorage.getItem(GLOBAL_FUEL_KEY)
          .then((v) => {
            const total = (v ? parseFloat(v) : 0) + cachedFuel;
            AsyncStorage.setItem(GLOBAL_FUEL_KEY, total.toString());
            setGlobalTotalFuel(total.toFixed(1));
          })
          .catch((e) => console.log("Gagal simpan bensin global", e));

        AsyncStorage.getItem(GLOBAL_DIST_KEY)
          .then(async (v) => {
            const totalDist = (v ? parseFloat(v) : 0) + cachedDist;
            await AsyncStorage.setItem(GLOBAL_DIST_KEY, totalDist.toString());

            const avgFuelVal = await AsyncStorage.getItem(GLOBAL_AVG_FUEL_KEY);
            const totalAvgFuelBasis =
              (avgFuelVal ? parseFloat(avgFuelVal) : 0) + cachedAvgFuel;
            await AsyncStorage.setItem(
              GLOBAL_AVG_FUEL_KEY,
              totalAvgFuelBasis.toString(),
            );

            if (totalAvgFuelBasis > 0 && totalDist > 0) {
              setGlobalAvgFuel((totalDist / totalAvgFuelBasis).toFixed(1));
            }
          })
          .catch((e) => console.log("Gagal simpan jarak/avg global", e));
      }

      // TAMBAHAN: flush tracker tiap 5 detik juga (biar persist kalau app ke-kill)
      if (isTrackingRef.current && now - lastTrackerSaveTime.current > 5000) {
        lastTrackerSaveTime.current = now;
        const newTrackerFuel = trackerFuel + trackerFuelAccumulator.current;
        const newTrackerDist = trackerDistance + trackerDistAccumulator.current;
        trackerFuelAccumulator.current = 0;
        trackerDistAccumulator.current = 0;

        setTrackerFuel(newTrackerFuel);
        setTrackerDistance(newTrackerDist);
        AsyncStorage.setItem(
          CALIBRATION_TRACKER_KEY,
          JSON.stringify({
            active: true,
            fuel: newTrackerFuel,
            distance: newTrackerDist,
          }),
        ).catch((e) => console.log("Gagal simpan tracker kalibrasi", e));
      }
    }

    // Instant fuel LIVE — rumus SAMA PERSIS, cuma dikonversi ke km/L
    if (newData.s > 2 && fuelFlow > 0) {
      setInstFuel(Math.min(newData.s / fuelFlow, 99.9));
    } else if (
      fuelFlow === 0 &&
      newData.th <= 1 &&
      newData.s > 20 &&
      newData.r > 1200
    ) {
      setInstFuel(99.9); // DFCO — BBM cut total, "tak terhingga" km/L
    } else {
      setInstFuel(0.0);
    }
  };

  const handleDataRef = useRef(handleData);
  handleDataRef.current = handleData;

  useEffect(() => {
    const unsub = subscribeData((d: any) => handleDataRef.current(d));
    return unsub;
  }, []);

  return (
    <FuelContext.Provider
      value={{
        instFuel,
        avgFuel,
        globalAvgFuel,
        globalTotalFuel,
        fuelPrice,
        setFuelPrice,
        resetGlobalFuel,
        calibration,
        setCalibrationManual,
        isTracking,
        trackerFuel,
        trackerDistance,
        startCalibrationTracking,
        cancelCalibrationTracking,
        finishCalibrationTracking,
      }}
    >
      {children}
    </FuelContext.Provider>
  );
};
