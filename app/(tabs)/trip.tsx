// app/(tabs)/trip.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAlert } from "../../components/AlertContext";

// === IMPORT KOMPONEN & STYLE YANG SUDAH DIPISAH ===
import ShareModal from "../../components/trip/ShareModal";
import { tripStyles as styles } from "../../styles/trip.styles";
import { getMapHtml } from "../../utils/tripTemplates";

export default function TripScreen() {
  const { showAlert, showConfirm } = useAlert();
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // State untuk Share Modal Pamer Rute
  const [shareTripData, setShareTripData] = useState<any>(null);

  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lifetimeDistance, setLifetimeDistance] = useState("0");
  const [lifetimeAvgFuel, setLifetimeAvgFuel] = useState("0.0");
  const insets = useSafeAreaInsets();

  const deleteTrip = (tripId: string) => {
    showConfirm(
      "Hapus Perjalanan",
      "Yakin untuk menghapus perjalanan ini secara permanen?",
      async () => {
        try {
          const updatedTrips = tripHistory.filter((t) => t.id !== tripId);

          await AsyncStorage.setItem(
            "@livina_trips",
            JSON.stringify(updatedTrips),
          );
          setTripHistory(updatedTrips);
          setSelectedTrip(null);

          showAlert("TERHAPUS", "Data perjalanan berhasil dihapus.", "success");
        } catch (error) {
          showAlert("GAGAL", "Terjadi kesalahan saat menghapus data.", "error");
        }
      },
    );
  };

  const exportToCSV = async (trip: any) => {
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
      const fileUri =
        FileSystem.documentDirectory + `Telemetry_Log_${safeDateName}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, csvString);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: `Ekspor Telemetri: ${trip.route}`,
          UTI: "public.comma-separated-values-text",
        });
      } else {
        showAlert("GAGAL", "Fitur berbagi tidak didukung di HP ini.", "error");
      }
    } catch (error) {
      showAlert("SYSTEM ERROR", String(error), "error");
    }
  };

  const syncTrips = async () => {
    setIsSyncing(true);
    try {
      const storedTrips = await AsyncStorage.getItem("@livina_trips");
      if (storedTrips !== null) {
        setTripHistory(JSON.parse(storedTrips));
      } else {
        setTripHistory([]);
      }
    } catch (error) {
      showAlert(
        "GAGAL SINKRONISASI",
        "Tidak dapat memuat data perjalanan dari memori HP.",
        "error",
      );
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const injectDummyData = async () => {
    const dummyTrips = [
      {
        id: "dummy-trip-cikidang",
        date: "24 Mei 2026, 07:15",
        route: "Jalur Ekstrem Cikidang",
        distance: "42.8 km",
        time: "1h 10m",
        fuel: "3.2 L",
        ecoScore: 65, // Merah/Kuning karena sering RPM tinggi di tanjakan
        details: {
          topSpeed: "85",
          maxRpm: "4500",
          fuelUsed: "3.2",
          cost: "Rp 32.000",
        },
        routeData: [
          // Start: Cibadak
          {
            time: "07:15",
            latitude: -6.89,
            longitude: 106.78,
            speed: 40,
            rpm: 2000,
            temp: 85,
            instFuel: 12.0,
            iat: 32,
            maf: 14.5,
            stft: 1,
            timing: 15,
            throttle: 15,
            note: "Start Cibadak",
          },
          // Masuk Cikidang (Mulai Nanjak)
          {
            time: "07:25",
            latitude: -6.905,
            longitude: 106.75,
            speed: 60,
            rpm: 2800,
            temp: 88,
            instFuel: 10.5,
            iat: 33,
            maf: 20.1,
            stft: -2,
            timing: 22,
            throttle: 25,
            note: "Masuk Jalur Alternatif",
          },

          // --- MULAI ZIG-ZAG EKSTREM (MELIAK-LIUK) ---
          // Tikungan Tajam 1 (Ke Utara/Kanan)
          {
            time: "07:35",
            latitude: -6.895,
            longitude: 106.73,
            speed: 35,
            rpm: 3200,
            temp: 92,
            instFuel: 8.5,
            iat: 34,
            maf: 25.0,
            stft: 3,
            timing: 28,
            throttle: 45,
            note: "Hairpin 1 - Gaspol",
          },
          // Tikungan Tajam 2 (Banting Selatan/Kiri)
          {
            time: "07:42",
            latitude: -6.915,
            longitude: 106.71,
            speed: 45,
            rpm: 2500,
            temp: 90,
            instFuel: 11.0,
            iat: 33,
            maf: 18.0,
            stft: 0,
            timing: 18,
            throttle: 20,
            note: "Turunan Pendek",
          },
          // Tikungan Tajam 3 (Banting Utara/Kanan - Tanjakan Curam)
          {
            time: "07:50",
            latitude: -6.905,
            longitude: 106.69,
            speed: 30,
            rpm: 4000,
            temp: 95,
            instFuel: 6.5,
            iat: 36,
            maf: 30.5,
            stft: 5,
            timing: 30,
            throttle: 60,
            note: "Hairpin 2 - Tanjakan Curam",
          },
          // Tikungan Tajam 4 (Banting Selatan/Kiri)
          {
            time: "07:58",
            latitude: -6.925,
            longitude: 106.67,
            speed: 50,
            rpm: 2200,
            temp: 91,
            instFuel: 14.0,
            iat: 35,
            maf: 15.2,
            stft: -1,
            timing: 16,
            throttle: 18,
            note: "Jalan Agak Lurus",
          },
          // Tikungan Tajam 5 (Banting Utara/Kanan - Puncak Cikidang)
          {
            time: "08:05",
            latitude: -6.91,
            longitude: 106.65,
            speed: 25,
            rpm: 4500,
            temp: 97,
            instFuel: 5.0,
            iat: 38,
            maf: 35.0,
            stft: 6,
            timing: 35,
            throttle: 70,
            note: "Puncak Cikidang",
          },
          // ------------------------------------------

          // Turunan Panjang ke Pelabuhan Ratu (Engine Brake)
          {
            time: "08:15",
            latitude: -6.94,
            longitude: 106.62,
            speed: 70,
            rpm: 2800,
            temp: 88,
            instFuel: 25.0,
            iat: 32,
            maf: 10.0,
            stft: -3,
            timing: 10,
            throttle: 0,
            note: "Engine Brake Turunan",
          },
          // Finish: Pelabuhan Ratu
          {
            time: "08:25",
            latitude: -6.98,
            longitude: 106.55,
            speed: 40,
            rpm: 2000,
            temp: 85,
            instFuel: 15.0,
            iat: 31,
            maf: 12.0,
            stft: 0,
            timing: 14,
            throttle: 12,
            note: "Finish Pelabuhan Ratu",
          },
        ],
      },
    ];

    try {
      await AsyncStorage.setItem("@livina_trips", JSON.stringify(dummyTrips));
      showAlert("SUKSES", "Data Jalur Cikidang disuntikkan!", "success");
      syncTrips();
    } catch (error) {
      console.error(error);
    }
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
      <View style={styles.headerRow}>
        {/* Bungkus judul dan tombol dummy jadi satu baris */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.headerTitle}>
            TRIP <Text style={{ color: "#00cc00" }}>LOGS</Text>
          </Text>

          {/* TOMBOL DARURAT INJECT DUMMY */}
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

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={styles.syncBtn}
            onPress={syncTrips}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#00ffcc" />
            ) : (
              <Ionicons name="sync-circle-outline" size={24} color="#00ffcc" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>LIFETIME STATS</Text>
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
      </View>

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
        <ScrollView showsVerticalScrollIndicator={false}>
          {tripHistory.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              activeOpacity={0.7}
              onPress={() => setSelectedTrip(trip)}
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
                <Ionicons name="map-outline" size={24} color="#00ffcc" />
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
                    onPress={() => exportToCSV(selectedTrip)}
                    style={styles.closeBtn}
                  >
                    <Ionicons
                      name="download-outline"
                      size={24}
                      color="#00ffcc"
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

              {/* AREA MAPS INTERAKTIF */}
              <View style={styles.mapContainer}>
                <WebView
                  ref={webViewRef}
                  style={styles.map}
                  source={{ html: getMapHtml(selectedTrip) }}
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
                    minimumTrackTintColor="#00ffcc"
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
                  <Ionicons name="analytics" size={20} color="#00ffcc" />
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
                    <Text style={[styles.inspectorValue, { color: "#00ffcc" }]}>
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
                    {selectedTrip.details?.topSpeed || 0} km/h
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
