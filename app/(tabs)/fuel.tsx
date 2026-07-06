import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAlert } from "../../components/AlertContext";
import { useFuelContext } from "../../components/FuelContext";
import { fuelStyles as styles } from "../../styles/fuel.styles";
import { getDB } from "../../utils/database";

export default function FuelScreen() {
  const { showAlert, showConfirm } = useAlert();
  const {
    instFuel,
    avgFuel,
    globalAvgFuel,
    globalTotalFuel,
    fuelPrice,
    setFuelPrice,
    resetGlobalFuel,
    calibration, // TAMBAHAN
    setCalibrationManual, // TAMBAHAN
    isTracking, // TAMBAHAN
    trackerFuel, // TAMBAHAN
    trackerDistance, // TAMBAHAN
    startCalibrationTracking, // TAMBAHAN
    cancelCalibrationTracking, // TAMBAHAN
    finishCalibrationTracking, // TAMBAHAN
  } = useFuelContext();

  const insets = useSafeAreaInsets();
  const [priceInput, setPriceInput] = useState(fuelPrice.toString());
  const [actualLitersInput, setActualLitersInput] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const lifetimeCost = Math.round(parseFloat(globalTotalFuel) * fuelPrice);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isPhoneLandscape = isLandscape && height < 480;

  const loadHistory = () => {
    if (Platform.OS === "web") {
      setHistory([]);
      return;
    }
    try {
      const db = getDB();
      const trips = db.getAllSync(
        "SELECT * FROM trips ORDER BY id DESC LIMIT 30",
      );
      setHistory(trips as any[]);
    } catch (e) {
      console.log("[FUEL] Gagal load riwayat", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  const handleSavePrice = () => {
    const parsed = parseInt(priceInput.replace(/[^0-9]/g, "")) || 10000;
    setFuelPrice(parsed);
    setPriceInput(parsed.toString());
    showAlert("Tersimpan", "Harga BBM per liter diperbarui.", "success");
  };

  const handleReset = () => {
    showConfirm(
      "Reset Statistik Lifetime",
      "AVG, Total BBM, dan Estimasi Biaya akan dikosongkan. Riwayat per-trip di bawah TIDAK ikut terhapus. Lanjutkan?",
      async () => {
        await resetGlobalFuel();
        showAlert(
          "Berhasil",
          "Statistik lifetime BBM telah direset.",
          "success",
        );
      },
    );
  };

  const handleCalibrationStep = (delta: number) => {
    const next = Math.max(0.1, Math.round((calibration + delta) * 100) / 100);
    setCalibrationManual(next);
  };

  const handleFinishWizard = async () => {
    const liters = parseFloat(actualLitersInput.replace(",", "."));
    if (!liters || liters <= 0) {
      showAlert(
        "Input Salah",
        "Masukkan jumlah liter yang valid dari struk pom bensin.",
        "error",
      );
      return;
    }
    try {
      const newCal = await finishCalibrationTracking(liters);
      setActualLitersInput("");
      showAlert(
        "Kalibrasi Diperbarui",
        `Faktor kalibrasi baru: ${newCal.toFixed(2)}. Semua perhitungan BBM sekarang pakai angka ini.`,
        "success",
      );
    } catch (e: any) {
      showAlert("Gagal", e.message || "Terjadi kesalahan.", "error");
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingHorizontal: isPhoneLandscape ? 35 : 15 },
      ]}
      edges={["top"]}
    >
      <ScrollView
        style={{
          flex: 1,
          marginBottom: isPhoneLandscape
            ? insets.bottom + 40
            : insets.bottom + 80,
        }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>
          FUEL <Text style={{ color: "#00ff88" }}>CONSUMPTION</Text>
        </Text>

        {/* INSTANT FUEL - HERO */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>INSTANT FUEL (LIVE)</Text>
          <Text style={styles.heroValue}>
            {instFuel.toFixed(1)} <Text style={styles.heroUnit}>km/L</Text>
          </Text>
        </View>

        {/* GRID STATS */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SESSION AVG</Text>
            <Text style={styles.statValue}>
              {avgFuel.toFixed(1)} <Text style={styles.statUnit}>km/L</Text>
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LIFETIME AVG</Text>
            <Text style={styles.statValue}>
              {globalAvgFuel} <Text style={styles.statUnit}>km/L</Text>
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL FUEL USED</Text>
            <Text style={styles.statValue}>
              {globalTotalFuel} <Text style={styles.statUnit}>L</Text>
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>EST. LIFETIME COST</Text>
            <Text style={[styles.statValue, { fontSize: 18 }]}>
              Rp {lifetimeCost.toLocaleString("id-ID")}
            </Text>
          </View>
        </View>

        {/* HARGA BBM DEFAULT */}
        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>Harga BBM Default (Rp / Liter)</Text>
          <Text style={{ color: "#555", fontSize: 10, marginTop: 4 }}>
            Dipakai untuk estimasi biaya lifetime di atas. Harga per-trip tetap
            bisa diisi manual saat trip disimpan.
          </Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrap}>
              <Text style={styles.priceCurrency}>Rp</Text>
              <TextInput
                style={styles.priceInput}
                value={priceInput}
                onChangeText={(t) => setPriceInput(t.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor="#444"
              />
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "#00ff88",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
              }}
              onPress={handleSavePrice}
            >
              <Text style={{ color: "#000", fontWeight: "900", fontSize: 12 }}>
                SIMPAN
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KALIBRASI */}
        <View style={styles.calibrationCard}>
          <Text style={styles.priceLabel}>Faktor Kalibrasi</Text>
          <Text style={styles.calibrationHint}>
            Semua perhitungan konsumsi BBM (instant, session, lifetime)
            dikalikan angka ini. Naikkan kalau app selalu menghitung LEBIH IRIT
            dari kenyataan, turunkan kalau lebih BOROS dari kenyataan.
          </Text>

          <View style={styles.calibrationValueRow}>
            <TouchableOpacity
              style={styles.calibrationStepBtn}
              onPress={() => handleCalibrationStep(-0.05)}
            >
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.calibrationValue}>
              {calibration.toFixed(2)}
            </Text>
            <TouchableOpacity
              style={styles.calibrationStepBtn}
              onPress={() => handleCalibrationStep(0.05)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* WIZARD KALIBRASI OTOMATIS */}
          {!isTracking ? (
            <TouchableOpacity
              style={[styles.wizardBtnPrimary, { marginTop: 4 }]}
              onPress={() => {
                showConfirm(
                  "Mulai Kalibrasi",
                  "Pastikan tangki BENAR-BENAR baru diisi penuh sebelum menekan ini. App akan mulai menghitung konsumsi dari titik ini sampai isi tangki berikutnya.",
                  startCalibrationTracking,
                );
              }}
            >
              <Text style={styles.wizardBtnPrimaryText}>
                MULAI KALIBRASI (BARU ISI PENUH)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.wizardBox}>
              <Text style={styles.wizardTitle}>🔄 SEDANG MELACAK...</Text>
              <View style={styles.wizardStatRow}>
                <View>
                  <Text style={styles.wizardStatValue}>
                    {trackerDistance.toFixed(1)} km
                  </Text>
                  <Text style={styles.wizardStatLabel}>JARAK TEREKAM</Text>
                </View>
                <View>
                  <Text style={styles.wizardStatValue}>
                    {trackerFuel.toFixed(2)} L
                  </Text>
                  <Text style={styles.wizardStatLabel}>BBM TERHITUNG APP</Text>
                </View>
              </View>
              <Text style={[styles.calibrationHint, { marginBottom: 4 }]}>
                Nanti pas isi tangki penuh lagi, masukkan literan ASLI dari
                struk pom di bawah ini:
              </Text>
              <View style={styles.wizardInputRow}>
                <View style={[styles.priceInputWrap, { flex: 1 }]}>
                  <TextInput
                    style={[styles.priceInput, { flex: 1, textAlign: "left" }]}
                    value={actualLitersInput}
                    onChangeText={setActualLitersInput}
                    placeholder="Liter asli dari pom"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.priceCurrency}>L</Text>
                </View>
              </View>
              <View style={[styles.wizardBtnRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={styles.wizardBtnCancel}
                  onPress={() =>
                    showConfirm(
                      "Batal Kalibrasi",
                      "Data pelacakan akan dibuang, kalibrasi tidak berubah.",
                      cancelCalibrationTracking,
                    )
                  }
                >
                  <Text style={styles.wizardBtnCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wizardBtnPrimary}
                  onPress={handleFinishWizard}
                >
                  <Text style={styles.wizardBtnPrimaryText}>
                    SELESAI & HITUNG
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* RESET */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh-circle" size={18} color="#FF453A" />
          <Text style={styles.resetBtnText}>RESET STATISTIK LIFETIME</Text>
        </TouchableOpacity>

        {/* RIWAYAT PER TRIP */}
        <Text style={styles.sectionTitle}>RIWAYAT KONSUMSI PER TRIP</Text>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={48} color="#333" />
            <Text style={styles.emptyStateText}>
              Belum ada riwayat trip tersimpan.
            </Text>
          </View>
        ) : (
          history.map((trip: any) => {
            const dist = parseFloat(trip.distance) || 0;
            const fuelUsed = parseFloat(trip.fuel) || 0;
            const kml = fuelUsed > 0 ? (dist / fuelUsed).toFixed(1) : "0.0";
            return (
              <View key={trip.id} style={styles.historyCard}>
                <View style={styles.historyTopRow}>
                  <Text style={styles.historyRoute} numberOfLines={1}>
                    {trip.route}
                  </Text>
                  <Text style={styles.historyDate}>{trip.date}</Text>
                </View>
                <View style={styles.historyStatsRow}>
                  <View style={styles.historyStatItem}>
                    <Text style={styles.historyStatValue}>{kml}</Text>
                    <Text style={styles.historyStatLabel}>KM/L</Text>
                  </View>
                  <View style={styles.historyStatItem}>
                    <Text style={styles.historyStatValue}>
                      {fuelUsed.toFixed(1)} L
                    </Text>
                    <Text style={styles.historyStatLabel}>FUEL USED</Text>
                  </View>
                  <View style={styles.historyStatItem}>
                    <Text style={styles.historyStatValue}>{trip.distance}</Text>
                    <Text style={styles.historyStatLabel}>DISTANCE</Text>
                  </View>
                  <View style={styles.historyStatItem}>
                    <Text style={styles.historyStatValue}>{trip.cost}</Text>
                    <Text style={styles.historyStatLabel}>COST</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
