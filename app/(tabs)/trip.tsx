// app/(tabs)/trip.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAlert } from "../../components/AlertContext";

// === IMPORT KOMPONEN & STYLE YANG SUDAH DIPISAH ===
import ShareModal from "../../components/trip/ShareModal";
import { tripStyles as styles } from "../../styles/trip.styles";
import { getDB } from "../../utils/database";
import { getMapHtml } from "../../utils/tripTemplates";

const GLOBAL_FUEL_KEY = "@prodash_lifetime_fuel_global";
const GLOBAL_DIST_KEY = "@prodash_lifetime_dist_global";

export default function TripScreen() {
  const { showAlert, showConfirm } = useAlert();
  const [globalAvgFuel, setGlobalAvgFuel] = useState<string>("0.0");
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [playbackMapType, setPlaybackMapType] = useState<
    "dark" | "normal" | "satellite"
  >("dark");
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  // State untuk Share Modal Pamer Rute
  const [shareTripData, setShareTripData] = useState<any>(null);

  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lifetimeDistance, setLifetimeDistance] = useState("0");
  const [lifetimeAvgFuel, setLifetimeAvgFuel] = useState("0.0");
  const insets = useSafeAreaInsets();

  const syncGlobalStats = async () => {
    try {
      const savedFuel = await AsyncStorage.getItem(GLOBAL_FUEL_KEY);
      const savedDist = await AsyncStorage.getItem(GLOBAL_DIST_KEY);

      const fuel = savedFuel ? parseFloat(savedFuel) : 0;
      const dist = savedDist ? parseFloat(savedDist) : 0;

      // Hitung rata-rata jika bensin > 0 agar tidak error infinity
      if (fuel > 0 && dist > 0) {
        const avg = dist / fuel;
        setGlobalAvgFuel(avg.toFixed(1));
      } else {
        setGlobalAvgFuel("0.0");
      }
    } catch (e) {
      console.log("Gagal memuat statistik global", e);
    }
  };

  const getTripPoints = (tripId: string) => {
    try {
      const db = getDB();
      return db.getAllSync(
        "SELECT * FROM trip_points WHERE trip_id = ? ORDER BY id ASC",
        [tripId],
      );
    } catch (error) {
      console.error("Gagal tarik telemetri:", error);
      return [];
    }
  };

  const deleteTrip = (tripId: string) => {
    showConfirm(
      "Hapus Perjalanan",
      "Yakin untuk menghapus perjalanan ini secara permanen?",
      () => {
        try {
          const db = getDB();
          db.execSync(`DELETE FROM trips WHERE id = '${tripId}'`);

          syncTrips(); // Refresh layar
          setSelectedTrip(null); // Tutup modal
          showAlert(
            "TERHAPUS",
            "Data perjalanan berhasil dibumihanguskan.",
            "success",
          );
        } catch (error) {
          showAlert(
            "GAGAL",
            "Terjadi kesalahan saat menghapus data DB.",
            "error",
          );
        }
      },
    );
  };

  const downloadToDevice = async (trip: any) => {
    if (!trip || !trip.routeData || trip.routeData.length === 0) {
      showAlert(
        "KOSONG",
        "Tidak ada data telemetri detail pada perjalanan ini.",
        "error",
      );
      return;
    }

    try {
      let csvString =
        "Time,Latitude,Longitude,Speed (km/h),RPM,Coolant Temp (C),IAT (C),MAF (g/s),STFT (%),LTFT (%),Timing (deg),Volt (V),Throttle (%),Inst Fuel (km/L),Note\n";

      trip.routeData.forEach((data: any) => {
        const safeTime = data.time ? String(data.time).replace(/,/g, " ") : "";
        const safeNote = data.note ? String(data.note).replace(/,/g, " ") : "";

        csvString += `${safeTime},${data.latitude},${data.longitude},${data.speed},${data.rpm},${data.temp},${data.iat},${data.maf},${data.stft},${data.ltft || 0},${data.timing},${data.volt || 0},${data.throttle || 0},${data.instFuel},${safeNote}\n`;
      });

      const safeDateName = trip.date.replace(/ /g, "_").replace(/,/g, "");
      const fileName = `Telemetry_Log_${safeDateName}.csv`;

      // ==========================================
      // BAGIAN BARU: DOWNLOAD KE FOLDER INTERNAL HP
      // ==========================================
      let directoryUri = await AsyncStorage.getItem("@livina_export_dir");

      if (!directoryUri) {
        showAlert(
          "SETUP PENYIMPANAN",
          "Silakan pilih atau buat folder (misal: Documents/Livina) untuk menyimpan file CSV.",
          "info",
        );

        // Jeda agar alert sempat terbaca sebelum File Manager HP terbuka
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          directoryUri = permissions.directoryUri;
          await AsyncStorage.setItem("@livina_export_dir", directoryUri);
        } else {
          showAlert("BATAL", "Izin akses folder tidak diberikan.", "warning");
          return;
        }
      }

      try {
        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          directoryUri,
          fileName,
          "text/csv",
        );

        await FileSystem.writeAsStringAsync(fileUri, csvString, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        showAlert(
          "SUKSES",
          `File berhasil di-download dengan nama:\n${fileName}`,
          "success",
        );
      } catch (writeError) {
        console.log("Folder default hilang. Reset folder...", writeError);
        await AsyncStorage.removeItem("@livina_export_dir");
        showAlert(
          "FOLDER HILANG",
          "Folder lama terhapus/pindah. Silakan klik Download lagi untuk setup ulang.",
          "error",
        );
      }
    } catch (error) {
      showAlert("SYSTEM ERROR", String(error), "error");
    }
  };

  const syncTrips = () => {
    setIsSyncing(true);
    try {
      const db = getDB();
      // Sedot data header trip dari SQLite
      const savedTrips = db.getAllSync("SELECT * FROM trips ORDER BY id DESC");

      // SQLite mengembalikan string JSON untuk details, kita parse dulu
      const formattedTrips = savedTrips.map((t: any) => ({
        ...t,
        details: {
          topSpeed: t.topSpeed,
          maxRpm: t.maxRpm,
          fuelUsed: t.fuel,
          cost: t.cost,
          peakAlt: t.peakAlt,
          climb: t.climb,
        },
      }));

      setTripHistory(formattedTrips);
    } catch (error) {
      console.error("Gagal load DB:", error);
      showAlert(
        "GAGAL SINKRONISASI",
        "Tidak dapat memuat data dari database.",
        "error",
      );
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const injectDummyData = () => {
    // Bikin ID pakai Date.now() biar bisa ditekan berkali-kali tanpa error duplikat
    const dummyTrips = [
      // ---------------------------------------------------------
      // RUTE 1: TOL BOCIMI (HIGH SPEED CRUISING)
      // ---------------------------------------------------------
      {
        id: `dummy-bocimi-${Date.now()}`,
        date: "02 Jun 2026, 06:30",
        route: "Tol Bocimi (Parungkuda - Ciawi)",
        distance: "35.5 km",
        time: "30m",
        fuel: "2.1 L",
        ecoScore: 85, // Cukup efisien karena gigi konstan walau kencang
        details: {
          topSpeed: "120",
          maxRpm: "3500",
          fuelUsed: "2.1",
          cost: "Rp 21.000",
          peakAlt: "520",
          climb: "150",
        },
        routeData: [
          {
            time: "06:30",
            latitude: -6.84,
            longitude: 106.77,
            speed: 40,
            rpm: 1800,
            temp: 85,
            instFuel: 12.0,
            iat: 30,
            maf: 14.5,
            stft: 1,
            timing: 15,
            throttle: 15,
            note: "Gerbang Tol Parungkuda",
          },
          {
            time: "06:40",
            latitude: -6.78,
            longitude: 106.81,
            speed: 100,
            rpm: 2800,
            temp: 88,
            instFuel: 16.5,
            iat: 31,
            maf: 22.1,
            stft: -2,
            timing: 32,
            throttle: 20,
            note: "Cruising Stabil",
          },
          {
            time: "06:45",
            latitude: -6.72,
            longitude: 106.83,
            speed: 120,
            rpm: 3500,
            temp: 92,
            instFuel: 10.5,
            iat: 32,
            maf: 30.0,
            stft: 3,
            timing: 38,
            throttle: 35,
            note: "Overtaking (Gaspol)",
          },
          {
            time: "06:55",
            latitude: -6.68,
            longitude: 106.84,
            speed: 80,
            rpm: 2200,
            temp: 89,
            instFuel: 18.0,
            iat: 31,
            maf: 18.0,
            stft: 0,
            timing: 28,
            throttle: 15,
            note: "Turunan (Eco Mode)",
          },
          {
            time: "07:00",
            latitude: -6.65,
            longitude: 106.85,
            speed: 30,
            rpm: 1500,
            temp: 86,
            instFuel: 14.0,
            iat: 33,
            maf: 12.0,
            stft: -1,
            timing: 14,
            throttle: 10,
            note: "Keluar GT Ciawi",
          },
        ],
      },
      // ---------------------------------------------------------
      // RUTE 2: MACET KOTA
      // ---------------------------------------------------------
      {
        id: `dummy-macet-${Date.now()}`,
        date: "02 Jun 2026, 16:45",
        route: "Macet Jl. A. Yani - Cisaat",
        distance: "4.2 km",
        time: "45m",
        fuel: "0.8 L",
        ecoScore: 40, // Jelek karena banyak diam (idle) tapi bensin ngucur
        details: {
          topSpeed: "35",
          maxRpm: "2200",
          fuelUsed: "0.8",
          cost: "Rp 8.000",
          peakAlt: "600",
          climb: "40",
        },
        routeData: [
          {
            time: "16:45",
            latitude: -6.92,
            longitude: 106.92,
            speed: 10,
            rpm: 900,
            temp: 95,
            instFuel: 4.0,
            iat: 38,
            maf: 8.5,
            stft: 5,
            timing: 8,
            throttle: 8,
            note: "Macet Merayap",
          },
          {
            time: "17:00",
            latitude: -6.918,
            longitude: 106.915,
            speed: 0,
            rpm: 800,
            temp: 98,
            instFuel: 0.0,
            iat: 40,
            maf: 4.0,
            stft: 6,
            timing: 5,
            throttle: 0,
            note: "Idle Parah (Lampu Merah)",
          },
          {
            time: "17:15",
            latitude: -6.915,
            longitude: 106.91,
            speed: 25,
            rpm: 1800,
            temp: 94,
            instFuel: 9.0,
            iat: 36,
            maf: 15.0,
            stft: 2,
            timing: 18,
            throttle: 18,
            note: "Mulai Jalan Sedikit",
          },
          {
            time: "17:30",
            latitude: -6.91,
            longitude: 106.9,
            speed: 35,
            rpm: 2200,
            temp: 92,
            instFuel: 12.0,
            iat: 34,
            maf: 18.0,
            stft: 0,
            timing: 22,
            throttle: 20,
            note: "Tiba di Tujuan",
          },
        ],
      },
    ];

    try {
      const db = getDB();

      // Looping untuk memasukkan data ke SQLite
      dummyTrips.forEach((trip) => {
        // 1. Simpan Header ke tabel `trips`
        const tripStmt = db.prepareSync(
          `INSERT INTO trips (id, date, route, distance, time, fuel, ecoScore, topSpeed, maxRpm, cost, peakAlt, climb) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        tripStmt.executeSync([
          trip.id,
          trip.date,
          trip.route,
          trip.distance,
          trip.time,
          trip.details.fuelUsed,
          trip.ecoScore,
          trip.details.topSpeed,
          trip.details.maxRpm,
          trip.details.cost,
          trip.details.peakAlt,
          trip.details.climb,
        ]);

        // 2. Simpan Koordinat ke tabel `trip_points`
        const pointStmt = db.prepareSync(
          `INSERT INTO trip_points (trip_id, time, latitude, longitude, speed, rpm, temp, instFuel, iat, maf, stft, timing, throttle, note, altitude, ltft, volt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 13.8)`,
        );
        trip.routeData.forEach((point) => {
          pointStmt.executeSync([
            trip.id,
            point.time,
            point.latitude,
            point.longitude,
            point.speed,
            point.rpm,
            point.temp,
            point.instFuel,
            point.iat,
            point.maf,
            point.stft,
            point.timing,
            point.throttle,
            point.note,
          ]);
        });
      });

      showAlert(
        "SUKSES",
        "Data Dummy (Tol Bocimi & Macet Kota) berhasil disuntikkan ke Database SQLite!",
        "success",
      );

      syncTrips(); // Panggil ulang untuk merefresh daftar di layar
    } catch (error) {
      console.error("Error Inject Dummy:", error);
      showAlert(
        "ERROR DB",
        "Gagal menyuntikkan data dummy ke database.",
        "error",
      );
    }
  };

  const handleResetGlobalFuel = () => {
    showConfirm(
      "Reset Konsumsi Global",
      "Apakah Anda yakin ingin mengosongkan rekaman total konsumsi bahan bakar aplikasi dari awal?",
      async () => {
        try {
          await AsyncStorage.setItem(GLOBAL_FUEL_KEY, "0.0");
          await AsyncStorage.setItem(GLOBAL_DIST_KEY, "0.0"); // <--- Reset jarak juga
          setGlobalAvgFuel("0.0");
          showAlert(
            "BERHASIL",
            "Data total konsumsi global telah dibersihkan kembali ke nol.",
            "success",
          );
        } catch (err) {
          showAlert("GAGAL", "Gagal mereset penyimpanan internal HP.", "error");
        }
      },
    );
  };

  useEffect(() => {
    if (tripHistory && tripHistory.length > 0) {
      let totalDist = 0;
      let totalFuelLiters = 0;

      tripHistory.forEach((trip) => {
        const dist = parseFloat(trip.distance) || 0;
        const fuel = parseFloat(trip.details?.fuelUsed) || 0;

        totalDist += dist;
        totalFuelLiters += fuel;
      });

      setLifetimeDistance(
        totalDist > 1000
          ? totalDist.toLocaleString("id-ID", { maximumFractionDigits: 0 })
          : totalDist.toFixed(1),
      );

      const avg = totalFuelLiters > 0 ? totalDist / totalFuelLiters : 0;
      setLifetimeAvgFuel(avg.toFixed(1));
    } else {
      setLifetimeDistance("0");
      setLifetimeAvgFuel("0.0");
    }
  }, [tripHistory]);

  useFocusEffect(
    useCallback(() => {
      syncTrips();
      syncGlobalStats();
    }, []),
  );

  useEffect(() => {
    let interval: any;
    if (isPlaying && selectedTrip) {
      interval = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= selectedTrip.routeData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedTrip]);

  useEffect(() => {
    if (selectedTrip && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof updatePlayback === 'function') updatePlayback(${playbackIndex});
        true;
      `);
    }
  }, [playbackIndex]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 15 }]}>
      {/* HEADER LOGS */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.headerTitle}>
            TRIP <Text style={{ color: "#00ff88" }}>LOGS</Text>
          </Text>
          <TouchableOpacity
            onPress={injectDummyData}
            style={{
              marginLeft: 15,
              backgroundColor: "#333",
              padding: 5,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10 }}>Inject Dummy</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={() => {
            syncTrips();
            syncGlobalStats();
          }}
          disabled={isSyncing}
        >
          <Ionicons name="sync-circle-outline" size={24} color="#00ff88" />
        </TouchableOpacity>
      </View>

      {/* CARD BARU: PANEL AKUMULASI GLOBAL DARI APLIKASI BERJALAN */}
      <View
        style={[
          styles.summaryCard,
          { marginBottom: 15, borderColor: "#30D158", borderWidth: 0.5 },
        ]}
      >
        <Text style={[styles.summaryTitle, { color: "#30D158" }]}>
          GLOBAL ECU POWER ON CONSUMPTION
        </Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryItem, { flex: 2 }]}>
            <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>
              {globalAvgFuel} {/* <--- Variabel baru */}
              <Text style={styles.summaryUnit}> km/L</Text>{" "}
              {/* <--- Satuan berubah */}
            </Text>
            <Text style={styles.summaryLabel}>AVERAGE FUEL (ALL TIME)</Text>
            {/* <--- Label berubah */}
          </View>
          <View style={styles.summaryDivider} />
          <TouchableOpacity
            onPress={handleResetGlobalFuel}
            style={{
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 15,
            }}
          >
            <Ionicons name="refresh-circle" size={32} color="#FF453A" />
            <Text
              style={{
                color: "#FF453A",
                fontSize: 9,
                fontWeight: "800",
                marginTop: 2,
              }}
            >
              RESET
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* STATISTIK BAWAAN TRIP SEBELUMNYA */}
      {/* <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          LIFETIME STATS (TRIP RECORD ONLY)
        </Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {lifetimeAvgFuel}
              <Text style={styles.summaryUnit}> km/L</Text>
            </Text>
            <Text style={styles.summaryLabel}>AVG FUEL</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {lifetimeDistance}
              <Text style={styles.summaryUnit}> km</Text>
            </Text>
            <Text style={styles.summaryLabel}>TOTAL DISTANCE</Text>
          </View>
        </View>
      </View> */}

      <Text style={styles.sectionTitle}>RECENT TRIPS</Text>

      {tripHistory.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="car-sport-outline" size={64} color="#333" />
          <Text style={styles.emptyStateTitle}>BELUM ADA DATA</Text>
          <Text style={styles.emptyStateDesc}>
            Perjalanan yang terekam akan muncul di sini.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {tripHistory.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              activeOpacity={0.7}
              onPress={() => {
                const points = getTripPoints(trip.id);
                setSelectedTrip({ ...trip, routeData: points });
              }}
            >
              <View style={styles.tripHeader}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color="#888"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.tripDate}>{trip.date}</Text>
                </View>
                <View
                  style={[
                    styles.ecoBadge,
                    {
                      backgroundColor:
                        trip.ecoScore > 80
                          ? "rgba(0, 204, 0, 0.2)"
                          : "rgba(255, 204, 0, 0.2)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.ecoText,
                      { color: trip.ecoScore > 80 ? "#00cc00" : "#ffcc00" },
                    ]}
                  >
                    ECO {trip.ecoScore}
                  </Text>
                </View>
              </View>

              <View style={styles.routeContainer}>
                <Ionicons name="map-outline" size={24} color="#00ff88" />
                <Text style={styles.routeText}>{trip.route}</Text>
              </View>

              <View style={styles.tripStatsGrid}>
                <View style={styles.tripStatBox}>
                  <Ionicons name="speedometer-outline" size={16} color="#aaa" />
                  <Text style={styles.tripStatText}>{trip.distance}</Text>
                </View>
                <View style={styles.tripStatBox}>
                  <Ionicons name="time-outline" size={16} color="#aaa" />
                  <Text style={styles.tripStatText}>{trip.time}</Text>
                </View>
                <View style={styles.tripStatBox}>
                  <Ionicons name="water-outline" size={16} color="#aaa" />
                  <Text style={styles.tripStatText}>{trip.fuel || "0 L"}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ========================================================= */}
      {/* MODAL PLAYBACK TELEMETRY - 100% SESUAI DESAIN LAMA MAS      */}
      {/* ========================================================= */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={selectedTrip !== null}
        onRequestClose={() => setSelectedTrip(null)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          {selectedTrip && (
            <ScrollView
              style={styles.modalContent}
              scrollEnabled={isScrollEnabled}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                {/* 1. Tambahkan flex: 1 dan marginRight agar tidak mendorong tombol */}
                <View style={{ flex: 1, marginRight: 15 }}>
                  {/* 2. Tambahkan numberOfLines={1} agar teks kepanjangan jadi titik-titik */}
                  <Text
                    style={styles.modalTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {selectedTrip.route}
                  </Text>
                  <Text style={styles.modalSubtitle}>Telemetry Playback</Text>
                </View>

                {/* Kumpulan Tombol Tetap Sama */}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShareTripData(selectedTrip)}
                    style={[styles.closeBtn, { backgroundColor: "#2a5298" }]}
                  >
                    <Ionicons name="share-social" size={24} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteTrip(selectedTrip.id)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => downloadToDevice(selectedTrip)}
                    style={styles.closeBtn}
                  >
                    <Ionicons
                      name="download-outline"
                      size={24}
                      color="#00ff88"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedTrip(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: 20,
                  marginBottom: 15,
                  justifyContent: "center",
                }}
              >
                {(["dark", "normal", "satellite"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setPlaybackMapType(type)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor:
                        playbackMapType === type ? "#00ff88" : "#333",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        color: playbackMapType === type ? "#121212" : "#fff",
                      }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* AREA MAPS INTERAKTIF */}
              <View
                style={styles.mapContainer}
                onTouchStart={(e) => {
                  if (e.nativeEvent.touches.length > 1)
                    setIsScrollEnabled(false);
                }}
                onTouchMove={(e) => {
                  // Evaluasi ulang terus menerus saat jari bergerak
                  if (e.nativeEvent.touches.length > 1) {
                    setIsScrollEnabled(false);
                  } else {
                    setIsScrollEnabled(true);
                  }
                }}
                onTouchEnd={(e) => {
                  // Gembok HANYA DIBUKA jika jari yang menempel kurang dari 2
                  if (e.nativeEvent.touches.length < 2)
                    setIsScrollEnabled(true);
                }}
                onTouchCancel={(e) => {
                  if (e.nativeEvent.touches.length < 2)
                    setIsScrollEnabled(true);
                }}
              >
                <WebView
                  ref={webViewRef}
                  style={styles.map}
                  source={{ html: getMapHtml(selectedTrip, playbackMapType) }}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                />
              </View>

              {/* KONTROL PLAYBACK & SLIDER */}
              <View style={styles.playbackContainer}>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => {
                    if (playbackIndex >= selectedTrip.routeData.length - 1)
                      setPlaybackIndex(0);
                    setIsPlaying(!isPlaying);
                  }}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={24}
                    color="#121212"
                  />
                </TouchableOpacity>

                <View style={styles.sliderWrapper}>
                  <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={0}
                    maximumValue={selectedTrip.routeData.length - 1}
                    step={1}
                    value={playbackIndex}
                    onValueChange={(val) => {
                      setIsPlaying(false);
                      setPlaybackIndex(val);
                    }}
                    minimumTrackTintColor="#00ff88"
                    maximumTrackTintColor="#333"
                    thumbTintColor="#fff"
                  />
                  <View style={styles.timeLabels}>
                    <Text style={styles.timeText}>00:00</Text>
                    <Text style={styles.timeTextCurrent}>
                      {selectedTrip.routeData[playbackIndex]?.time || "00:00"}
                    </Text>
                    <Text style={styles.timeText}>{selectedTrip.time}</Text>
                  </View>
                </View>
              </View>

              {/* PANEL TELEMETRI REAL-TIME (8 SENSOR) */}
              <View style={styles.inspectorCard}>
                <View style={styles.inspectorHeader}>
                  <Ionicons name="analytics" size={20} color="#00ff88" />
                  <Text style={styles.inspectorTitle}>LIVE TELEMETRY</Text>
                  <Text style={styles.inspectorNote}>
                    {selectedTrip.routeData[playbackIndex]?.note || ""}
                  </Text>
                </View>

                {/* Grid 2 Baris untuk menampung semua sensor */}
                <View style={styles.inspectorGrid}>
                  {/* BARIS 1: Sensor Dasar */}
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>SPEED</Text>
                    <Text style={[styles.inspectorValue, { color: "#00ff88" }]}>
                      {selectedTrip.routeData[playbackIndex]?.speed || 0}{" "}
                      <Text style={styles.inspectorUnit}>km/h</Text>
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>RPM</Text>
                    <Text style={[styles.inspectorValue, { color: "#ff4444" }]}>
                      {selectedTrip.routeData[playbackIndex]?.rpm || 0}
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>TEMP</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex]?.temp || 0}°C
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>INST FUEL</Text>
                    <Text style={[styles.inspectorValue, { color: "#ffcc00" }]}>
                      {selectedTrip.routeData[playbackIndex]?.instFuel || 0}
                    </Text>
                  </View>

                  {/* Garis Pemisah Tipis */}
                  <View style={styles.gridDivider} />

                  {/* BARIS 2: Sensor Lanjutan (Advanced) */}
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>IAT</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex]?.iat || 0}°C
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>MAF</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex]?.maf || 0}{" "}
                      <Text style={styles.inspectorUnit}>g/s</Text>
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>STFT</Text>
                    <Text
                      style={[
                        styles.inspectorValue,
                        {
                          color:
                            selectedTrip.routeData[playbackIndex]?.stft > 0
                              ? "#ff4444"
                              : "#00cc00",
                        },
                      ]}
                    >
                      {selectedTrip.routeData[playbackIndex]?.stft || 0}%
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>TIMING</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex]?.timing || 0}°
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>TRIP SUMMARY</Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>TOP SPEED</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.details?.topSpeed || 0}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>MAX RPM</Text>
                  <Text style={[styles.detailValue, { color: "#ff4444" }]}>
                    {selectedTrip.details?.maxRpm || 0}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>FUEL USED</Text>
                  <Text style={[styles.detailValue, { color: "#00cc00" }]}>
                    {selectedTrip.details?.fuelUsed || "0 L"}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>EST COST</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.details?.cost || "Rp 0"}
                  </Text>
                </View>
              </View>

              <View style={{ height: 50 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* MODAL SHARE EKSTERNAL */}
      <ShareModal
        visible={shareTripData !== null}
        tripData={shareTripData}
        onClose={() => setShareTripData(null)}
        showAlert={showAlert}
      />
    </View>
  );
}
