import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAlert } from "../../components/AlertContext";

// Template HTML Peta Dark Mode Gratis (Leaflet + CartoDB)
const getMapHtml = (tripData: any) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      body { padding: 0; margin: 0; background: #121212; }
      #map { width: 100vw; height: 100vh; }
      .car-marker { 
        background-color: rgba(0, 255, 204, 0.3); 
        border: 2px solid #00ffcc; 
        border-radius: 50%; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
      }
      .car-marker-inner { width: 10px; height: 10px; background-color: #fff; border-radius: 50%; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const routeData = ${JSON.stringify(tripData.routeData.map((d: any) => [d.latitude, d.longitude]))};
      
      const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(routeData[0], 13);
      
      // Peta Dark Mode Gratis
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

      // Garis dasar & Garis progress
      L.polyline(routeData, { color: '#333', weight: 4 }).addTo(map);
      const progressLine = L.polyline([routeData[0]], { color: '#00ffcc', weight: 5 }).addTo(map);

      // Icon Mobil
      const icon = L.divIcon({ className: 'car-marker', html: '<div class="car-marker-inner"></div>', iconSize: [24, 24], iconAnchor: [12, 12] });
      const marker = L.marker(routeData[0], { icon: icon }).addTo(map);

      // Update dari React Native
      function updatePlayback(index) {
        const currentCoords = routeData.slice(0, index + 1);
        progressLine.setLatLngs(currentCoords);
        marker.setLatLng(routeData[index]);
        map.panTo(routeData[index], { animate: true, duration: 0.5 });
      }
    </script>
  </body>
  </html>
`;

export default function TripScreen() {
  const { showAlert } = useAlert();
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lifetimeDistance, setLifetimeDistance] = useState("0");
  const [lifetimeAvgFuel, setLifetimeAvgFuel] = useState("0.0");
  const insets = useSafeAreaInsets();

  const deleteTrip = (tripId: string) => {
    Alert.alert(
      "Hapus Perjalanan",
      "Yakin untuk menghapus pejalanan ini secara permanen?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedTrips = tripHistory.filter((t) => t.id !== tripId);

              await AsyncStorage.setItem(
                "@livina_trips",
                JSON.stringify(updatedTrips),
              );
              setTripHistory(updatedTrips);
              setSelectedTrip(null); // Tutup modal playback

              showAlert(
                "TERHAPUS",
                "Data perjalanan berhasil dihapus.",
                "success",
              );
            } catch (error) {
              showAlert(
                "GAGAL",
                "Terjadi kesalahan saat menghapus data.",
                "error",
              );
            }
          },
        },
      ],
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
      // @ts-ignore
      const fileUri =
        FileSystem.documentDirectory + `Telemetry_Log_${safeDateName}.csv`;

      // @ts-ignore
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
        setTripHistory([]); // Jika belum ada perjalanan sama sekali
      }
    } catch (error) {
      showAlert(
        "GAGAL SINKRONISASI",
        "Tidak dapat memuat data perjalanan dari memori HP.",
        "error",
      );
    } finally {
      // Jeda 1 detik agar animasi muter-muternya terlihat keren
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  useEffect(() => {
    if (tripHistory && tripHistory.length > 0) {
      let totalDist = 0;
      let totalFuelLiters = 0;

      tripHistory.forEach((trip) => {
        // Karena datanya nanti berformat string "62.5 km", kita ambil angkanya saja (parseFloat)
        const dist = parseFloat(trip.distance) || 0;
        const fuel = parseFloat(trip.details?.fuelUsed) || 0;

        totalDist += dist;
        totalFuelLiters += fuel;
      });

      // Format angka agar rapi (misal: 1450.5)
      setLifetimeDistance(
        totalDist > 1000
          ? totalDist.toLocaleString("id-ID", { maximumFractionDigits: 0 })
          : totalDist.toFixed(1),
      );

      // Hitung rata-rata: Total Jarak / Total Bensin
      const avg = totalFuelLiters > 0 ? totalDist / totalFuelLiters : 0;
      setLifetimeAvgFuel(avg.toFixed(1));
    } else {
      setLifetimeDistance("0");
      setLifetimeAvgFuel("0.0");
    }
  }, [tripHistory]);

  // Otomatis sync saat layar Trip dibuka
  useEffect(() => {
    syncTrips();
  }, []);

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
        <Text style={styles.headerTitle}>
          TRIP <Text style={{ color: "#00cc00" }}>LOGS</Text>
        </Text>

        {/* Kontainer untuk menjejerkan 2 tombol */}
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
                  <Text style={styles.tripStatText}>{trip.fuel}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
                <View>
                  <Text style={styles.modalTitle}>{selectedTrip.route}</Text>
                  <Text style={styles.modalSubtitle}>Telemetry Playback</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {/* TOMBOL DELETE BARU */}
                  <TouchableOpacity
                    onPress={() => deleteTrip(selectedTrip.id)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ff4444" />
                  </TouchableOpacity>

                  {/* TOMBOL DOWNLOAD */}
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

                  {/* TOMBOL CLOSE */}
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
                {selectedTrip && (
                  <WebView
                    ref={webViewRef}
                    style={styles.map}
                    source={{ html: getMapHtml(selectedTrip) }}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                  />
                )}
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
                      {selectedTrip.routeData[playbackIndex].time}
                    </Text>
                    <Text style={styles.timeText}>{selectedTrip.time}</Text>
                  </View>
                </View>
              </View>

              {/* PANEL TELEMETRI REAL-TIME (DIPERLUAS UNTUK 8 SENSOR) */}
              <View style={styles.inspectorCard}>
                <View style={styles.inspectorHeader}>
                  <Ionicons name="analytics" size={20} color="#00ffcc" />
                  <Text style={styles.inspectorTitle}>LIVE TELEMETRY</Text>
                  <Text style={styles.inspectorNote}>
                    {selectedTrip.routeData[playbackIndex].note}
                  </Text>
                </View>

                {/* Grid 2 Baris untuk menampung semua sensor */}
                <View style={styles.inspectorGrid}>
                  {/* BARIS 1: Sensor Dasar */}
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>SPEED</Text>
                    <Text style={[styles.inspectorValue, { color: "#00ffcc" }]}>
                      {selectedTrip.routeData[playbackIndex].speed}{" "}
                      <Text style={styles.inspectorUnit}>km/h</Text>
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>RPM</Text>
                    <Text style={[styles.inspectorValue, { color: "#ff4444" }]}>
                      {selectedTrip.routeData[playbackIndex].rpm}
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>TEMP</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex].temp}°C
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>INST FUEL</Text>
                    <Text style={[styles.inspectorValue, { color: "#ffcc00" }]}>
                      {selectedTrip.routeData[playbackIndex].instFuel}
                    </Text>
                  </View>

                  {/* Garis Pemisah Tipis */}
                  <View style={styles.gridDivider} />

                  {/* BARIS 2: Sensor Lanjutan (Advanced) */}
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>IAT</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex].iat}°C
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>MAF</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex].maf}{" "}
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
                            selectedTrip.routeData[playbackIndex].stft > 0
                              ? "#ff4444"
                              : "#00cc00",
                        },
                      ]}
                    >
                      {selectedTrip.routeData[playbackIndex].stft}%
                    </Text>
                  </View>
                  <View style={styles.inspectorBox}>
                    <Text style={styles.inspectorLabel}>TIMING</Text>
                    <Text style={styles.inspectorValue}>
                      {selectedTrip.routeData[playbackIndex].timing}°
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>TRIP SUMMARY</Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>TOP SPEED</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.details.topSpeed}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>MAX RPM</Text>
                  <Text style={[styles.detailValue, { color: "#ff4444" }]}>
                    {selectedTrip.details.maxRpm}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>FUEL USED</Text>
                  <Text style={[styles.detailValue, { color: "#00cc00" }]}>
                    {selectedTrip.details.fuelUsed}
                  </Text>
                </View>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>EST COST</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip.details.cost}
                  </Text>
                </View>
              </View>

              <View style={{ height: 50 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Style layar utama tetap sama)
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 3,
  },
  syncBtn: {
    backgroundColor: "#1e1e1e",
    padding: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#333",
  },
  summaryCard: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 15,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#333",
  },
  summaryTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 15,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryDivider: { width: 1, height: 40, backgroundColor: "#333" },
  summaryValue: { fontSize: 24, fontWeight: "900", color: "#fff" },
  summaryUnit: { fontSize: 14, color: "#aaa", fontWeight: "normal" },
  summaryLabel: {
    fontSize: 10,
    color: "#888",
    marginTop: 5,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    letterSpacing: 1,
    marginTop: 10,
  },
  tripCard: {
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tripDate: { color: "#888", fontSize: 12, fontWeight: "bold" },
  ecoBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  ecoText: { fontSize: 10, fontWeight: "bold" },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#252525",
    padding: 10,
    borderRadius: 8,
  },
  routeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  tripStatsGrid: { flexDirection: "row", justifyContent: "space-between" },
  tripStatBox: { flexDirection: "row", alignItems: "center" },
  tripStatText: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 6,
  },

  // MODAL & MAPS
  modalContainer: { flex: 1, backgroundColor: "#121212" },
  modalContent: { padding: 20, flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#fff" },
  modalSubtitle: {
    fontSize: 14,
    color: "#00ffcc",
    marginTop: 4,
    fontWeight: "bold",
  },
  closeBtn: { backgroundColor: "#1e1e1e", padding: 8, borderRadius: 50 },

  mapContainer: {
    height: 250,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#333",
  },
  map: { width: "100%", height: "100%" },
  carMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 255, 204, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#00ffcc",
  },
  carMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },

  // PLAYBACK CONTROLS
  playbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00ffcc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  sliderWrapper: { flex: 1 },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    marginTop: -5,
  },
  timeText: { color: "#666", fontSize: 10, fontWeight: "bold" },
  timeTextCurrent: { color: "#00ffcc", fontSize: 12, fontWeight: "bold" },

  // PANEL TELEMETRI (UPDATED)
  inspectorCard: {
    backgroundColor: "#1a1a1a",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#555",
  },
  inspectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 10,
  },
  inspectorTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
    flex: 1,
    letterSpacing: 1,
  },
  inspectorNote: {
    color: "#ffcc00",
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "bold",
  },

  inspectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  inspectorBox: { width: "23%", alignItems: "center", marginBottom: 15 }, // margin bawah agar baris 1 & 2 berjarak
  gridDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#333",
    marginBottom: 15,
    marginTop: -5,
  }, // Pemisah antar baris
  inspectorLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "bold",
    marginBottom: 4,
  },
  inspectorValue: { fontSize: 16, fontWeight: "900", color: "#fff" }, // Ukuran font disesuaikan agar 4 kolom muat
  inspectorUnit: { fontSize: 10, fontWeight: "normal" },

  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailBox: {
    width: "48%",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#555",
  },
  detailLabel: {
    fontSize: 10,
    color: "#888",
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 5,
  },
  detailValue: { fontSize: 18, fontWeight: "900", color: "#fff" },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  emptyStateTitle: {
    color: "#888",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
    letterSpacing: 1,
  },
  emptyStateDesc: {
    color: "#555",
    fontSize: 12,
    marginTop: 5,
  },
});
