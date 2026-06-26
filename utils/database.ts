import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

// 1. Cek apakah ini sedang dibuka di Browser (Web)
const isWeb = Platform.OS === "web";

// 2. Buat database bayangan (dummy) agar aplikasi tidak crash saat memanggil fungsi DB di Web
const dummyDB = {
  execSync: () => {},
  prepareSync: () => ({
    executeSync: () => {},
  }),
  getAllSync: () => [], // <--- TAMBAHKAN INI
  getFirstSync: () => null, // <--- TAMBAHKAN INI (Buat jaga-jaga kalau nanti dipakai)
};

// 3. Buka (atau buat baru) DB di HP, tapi gunakan dummyDB jika di Web
const db = isWeb ? dummyDB : SQLite.openDatabaseSync("livina_telemetry.db");

export const initDB = () => {
  if (isWeb) {
    console.log("🖥️ Web Mode: SQLite dimatikan karena hanya fokus testing UI.");
    return; // Berhenti di sini, jangan jalankan pembuatan tabel
  }

  try {
    // Aktifkan fitur Foreign Key (Relasi antar tabel)
    db.execSync("PRAGMA foreign_keys = ON;");

    // TABEL 1: Menyimpan info sampul depan perjalanan (Header)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        date TEXT,
        route TEXT,
        distance TEXT,
        time TEXT,
        fuel TEXT,
        ecoScore INTEGER,
        topSpeed TEXT,
        maxRpm REAL,
        cost TEXT,
        peakAlt TEXT,
        climb TEXT
      );
    `);

    // TABEL 2: Menyimpan data kecepatan tinggi dari sensor (Detail)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS trip_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trip_id TEXT,
        time TEXT,
        latitude REAL,
        longitude REAL,
        altitude REAL,
        speed REAL,
        rpm INTEGER,
        temp INTEGER,
        iat INTEGER,
        maf REAL,
        stft REAL,
        ltft REAL,
        timing REAL,
        volt REAL,
        throttle REAL,
        instFuel TEXT,
        note TEXT,
        FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
      );
    `);
    console.log("✅ SQLite Database & Tables Ready!");
  } catch (error) {
    console.error("❌ Gagal inisialisasi database:", error);
  }
};

// Fungsi untuk memulai trip baru
export const insertNewTrip = (tripId: string, tripName: string) => {
  if (isWeb) return; // Bypass jika di web

  const statement = db.prepareSync(`
    INSERT INTO trips (id, date, route, distance, time, fuel, ecoScore, topSpeed, maxRpm, cost, peakAlt, climb)
    VALUES (?, ?, ?, '0 km', '0m', '0 L', 100, '0 km/h', 0, 'Rp 0', '0', '0')
  `);
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  statement.executeSync([tripId, dateStr, tripName]);
};

// Fungsi untuk menembakkan titik telemetri berkecepatan tinggi!
export const insertTripPoint = (tripId: string, point: any) => {
  if (isWeb) return; // Bypass jika di web

  const statement = db.prepareSync(`
    INSERT INTO trip_points (
      trip_id, time, latitude, longitude, altitude, speed, rpm, temp, 
      iat, maf, stft, ltft, timing, volt, throttle, instFuel, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  statement.executeSync([
    tripId,
    point.time,
    point.latitude,
    point.longitude,
    point.altitude,
    point.speed,
    point.rpm,
    point.temp,
    point.iat,
    point.maf,
    point.stft,
    point.ltft,
    point.timing,
    point.volt,
    point.throttle,
    point.instFuel,
    point.note,
  ]);
};

// Fungsi final untuk update total jarak & bensin saat trip selesai
export const updateTripStats = (tripId: string, stats: any) => {
  if (isWeb) return; // Bypass jika di web

  const statement = db.prepareSync(`
    UPDATE trips 
    SET route = ?, distance = ?, time = ?, fuel = ?, ecoScore = ?, 
        topSpeed = ?, maxRpm = ?, cost = ?, peakAlt = ?, climb = ?
    WHERE id = ?
  `);
  statement.executeSync([
    stats.route,
    stats.distance,
    stats.time,
    stats.fuel,
    stats.ecoScore,
    stats.topSpeed,
    stats.maxRpm,
    stats.cost,
    stats.peakAlt,
    stats.climb,
    tripId,
  ]);
};

// Ekspor akses langsung ke DB kalau sewaktu-waktu butuh (misal untuk narik data)
export const getDB = () => db;
