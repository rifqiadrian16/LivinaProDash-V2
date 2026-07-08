import { Ionicons } from "@expo/vector-icons";
import { useKeepAwake } from "expo-keep-awake";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import useDashboard from "../../hooks/useDashboard";

// IMPORT SUB-SCREENS
import ConnectingEcuScreen from "../../components/dashboard/ConnectingEcuScreen";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DataGrid from "../../components/dashboard/DataGrid";
import LandscapeGauges from "../../components/dashboard/LandScapeGauges";
import MainGauges from "../../components/dashboard/MainGauges";
import WaitingMacScreen from "../../components/dashboard/WaitingMacScreen";

// IMPORT MODALS
import { useAppTheme } from "../../components/AppThemeContext";
import ConfirmModal from "../../components/dashboard/Modal/ConfirmModal";
import HudModal from "../../components/dashboard/Modal/HudModal";
import OTAModal from "../../components/dashboard/Modal/OTAModal";
import SettingsModal from "../../components/dashboard/Modal/SettingsModal";
import TerminalModal from "../../components/dashboard/Modal/TerminalModal";
import TransmissionModal from "../../components/dashboard/Modal/TransmissionModal";
import SetupScreen from "../../components/dashboard/SetupScreen";
import SaveTripModal from "../../components/trip/SaveTripModal";
import { getDashboardStyles } from "../../styles/dashboard.styles";

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  const { state, actions } = useDashboard();

  useKeepAwake();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTabletLandscape = isLandscape && height >= 480;
  const bottomReserve = isLandscape ? 55 : 85;
  const insets = useSafeAreaInsets();

  const [isGaugeTestMode, setIsGaugeTestMode] = useState(false);
  const [testRpm, setTestRpm] = useState(0);
  const [testSpeed, setTestSpeed] = useState(0);
  const testDirRef = useRef(1); // 1 = naik, -1 = turun
  const testIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isGaugeTestMode) {
      // Variabel internal simulator
      let currentRpm = 800;
      let currentSpeed = 0;
      let targetRpm = 800;
      let phase = "IDLE"; // Fase: IDLE, ACCEL, SHIFT, COAST
      let phaseTicks = 0;

      testIntervalRef.current = setInterval(() => {
        phaseTicks++;

        // 1. STATE MACHINE (Simulasi Perilaku Menyetir)
        if (phase === "IDLE" && phaseTicks > 20) {
          phase = "ACCEL"; // Mulai ngegas
          phaseTicks = 0;
          targetRpm = 7500;
        } else if (
          phase === "ACCEL" &&
          currentRpm > 6000 &&
          currentSpeed < 80
        ) {
          phase = "SHIFT"; // Oper gigi (RPM drop seketika)
          phaseTicks = 0;
          targetRpm = 3500;
        } else if (phase === "SHIFT" && phaseTicks > 4) {
          phase = "ACCEL"; // Gas lagi setelah oper gigi
          phaseTicks = 0;
          targetRpm = 7500;
        } else if (phase === "ACCEL" && currentRpm > 7000 && phaseTicks > 20) {
          phase = "COAST"; // Lepas gas / Engine Brake
          phaseTicks = 0;
          targetRpm = 800;
        } else if (phase === "COAST" && phaseTicks > 40) {
          phase = "IDLE"; // Kembali idle setelah berhenti
          phaseTicks = 0;
          currentSpeed = 0;
        }

        // 2. PERGERAKAN NON-LINEAR (Mengejar target RPM)
        // Kalau pas oper gigi (SHIFT), turunnya cepat (0.6). Kalau ngegas biasa (0.15).
        const easing = phase === "SHIFT" ? 0.6 : 0.15;
        currentRpm += (targetRpm - currentRpm) * easing;

        // 3. TAMBAHKAN SENSOR NOISE / JITTER KHAS OBD2
        const jitterRpm = currentRpm + (Math.random() * 60 - 30); // Acak ±30 RPM

        // 4. SIMULASI SPEED (Terkait dengan fase gas)
        if (phase === "ACCEL") {
          currentSpeed += Math.random() * 2.5; // Speed naik acak
        } else if (phase === "COAST" || phase === "IDLE") {
          currentSpeed -= Math.random() * 1.5; // Speed turun pelan
        }
        if (currentSpeed < 0) currentSpeed = 0;
        if (currentSpeed > 220) currentSpeed = 220;

        // Noise kecil untuk Speed
        const jitterSpeed = currentSpeed + (Math.random() * 2 - 1);

        // Update State
        setTestRpm(Math.max(0, jitterRpm));
        setTestSpeed(Math.max(0, jitterSpeed));
      }, 85); // 85ms = Polling rate realistis adapter ELM327 Bluetooth
    } else {
      if (testIntervalRef.current) clearInterval(testIntervalRef.current);
      setTestRpm(0);
      setTestSpeed(0);
    }
    return () => {
      if (testIntervalRef.current) clearInterval(testIntervalRef.current);
    };
  }, [isGaugeTestMode]);

  // Nilai yang benar-benar dikirim ke gauge: pakai data simulasi kalau test
  // mode aktif, kalau tidak pakai data asli dari ECU seperti biasa.
  const gaugeRpm = isGaugeTestMode ? testRpm : state.data.r;
  const gaugeSpeed = isGaugeTestMode ? testSpeed : state.data.s;

  // 🛡️ GERBANG LOGIKA TAMPILAN DINAMIS
  const renderMainContent = () => {
    // KONDISI UTAMA: Tampilkan Dashboard Aktif
    if (state.isBypassed || state.obdStatus === "ready") {
      // ====================================================
      // LAYOUT LANDSCAPE (HEAD UNIT / HP DIPUTAR)
      // ⚠️ DIROMBAK TOTAL: pakai LandscapeGauges (2 gauge bundar
      // terpisah, RPM hijau + Speed biru dengan ring progress &
      // needle) — BUKAN MainGauges. MainGauges (portrait) tetap
      // tidak disentuh sama sekali.
      // ====================================================
      if (isLandscape) {
        const horizontalPadding = isTabletLandscape ? 35 : 8;
        return (
          // BUNGKUSAN UTAMA: Mengatur urutan dari Atas ke Bawah
          <View style={{ flex: 1, paddingTop: 8 }}>
            {/* 1. HEADER AREA (FULL WIDTH) */}
            <View style={{ paddingHorizontal: horizontalPadding }}>
              <DashboardHeader
                isConnected={state.isConnected}
                isNightTime={state.isNightTime}
                onEnterHud={actions.enterHudMode}
                onOpenSettings={() => actions.setShowSettings(true)}
                onDisconnect={actions.disconnectOBD}
                isObdStandby={state.isObdStandby}
                onOpenTerminal={() => actions.setShowTerminal(true)}
                isLocked={state.data.l === 1}
              />
            </View>

            {/* 2. KONTEN TENGAH (DIBAGI 50:50 KIRI & KANAN) */}
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                paddingHorizontal: horizontalPadding,
                // Beri jarak di bawah agar tidak tertutup Tab Bar melayang (Tab Bar = ~64px)
                paddingBottom: bottomReserve,
              }}
            >
              {/* KOLOM KIRI (50%): GAUGE AREA */}
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 0,
                }}
              >
                <LandscapeGauges
                  rpm={gaugeRpm}
                  speed={gaugeSpeed}
                  transmission={state.transmission || "matic"}
                />
              </View>

              {/* KOLOM KANAN (50%): DATA GRID */}
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    flexGrow: 1,
                    // 🔥 UBAH DISINI: Gunakan "space-evenly" di tablet agar mendistribusikan jarak vertikal secara merata
                    justifyContent: isTabletLandscape
                      ? "space-evenly"
                      : "center",
                    paddingBottom: 12,
                    marginTop: -10,
                  }}
                >
                  <DataGrid
                    data={state.data}
                    instFuel={state.instFuel}
                    avgFuel={state.avgFuel}
                    // 🔥 UBAH DISINI: Matikan compact jika di tablet agar ukuran kartu sensor lebih besar & proporsional
                    compact={!isTabletLandscape}
                  />
                </ScrollView>
              </View>
            </View>
          </View>
        );
      }

      // ====================================================
      // LAYOUT PORTRAIT (DEFAULT / HP TEGAK) — TETAP SEPERTI SEMULA
      // MainGauges (gauge gabungan RPM+Speed lama) TIDAK DIUBAH.
      // ====================================================
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <DashboardHeader
            isConnected={state.isConnected}
            isNightTime={state.isNightTime}
            onEnterHud={actions.enterHudMode}
            onOpenSettings={() => actions.setShowSettings(true)}
            onDisconnect={actions.disconnectOBD}
            isObdStandby={state.isObdStandby}
            onOpenTerminal={() => actions.setShowTerminal(true)}
            isLocked={state.data.l === 1}
          />
          <MainGauges
            rpm={gaugeRpm}
            speed={gaugeSpeed}
            transmission={state.transmission || "matic"}
          />
          <DataGrid
            data={state.data}
            instFuel={state.instFuel}
            avgFuel={state.avgFuel}
          />
        </ScrollView>
      );
    }

    // TAHAP 1: Belum Konek Bluetooth ke ESP32
    if (state.obdStatus === "disconnected") {
      return (
        <SetupScreen
          onConnect={actions.handleConnectToModule}
          isConnecting={state.isConnectingBLE}
          onSecretTap={actions.handleSetupSecretTap}
        />
      );
    }

    // TAHAP 1.5: Proses Jabat Tangan & Pengecekan Config Memori
    if (state.obdStatus === "checking") {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#111",
          }}
        >
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={{ color: "#fff", marginTop: 25, fontWeight: "bold" }}>
            Memeriksa Memori Modul...
          </Text>
        </View>
      );
    }

    // TAHAP 2: Pembeli Baru (Minta Konfigurasi OBD2)
    if (state.obdStatus === "waiting_mac") {
      return (
        <WaitingMacScreen
          onOpenSettings={() => actions.setShowSettings(true)}
        />
      );
    }

    // TAHAP 3: Menunggu Kunci Kontak Mobil Posisi ON
    if (state.obdStatus === "connecting_ecu") {
      return (
        <ConnectingEcuScreen
          onOpenSettings={() => actions.setShowSettings(true)}
          onDisconnect={() => actions.disconnectDevice()}
        />
      );
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          // Paksa padding kiri dan kanan sama besar mengikuti ukuran notch/kamera
          paddingLeft: Math.max(insets.left, insets.right),
          paddingRight: Math.max(insets.left, insets.right),
        },
      ]}
      edges={["top", "bottom"]} // Abaikan safe area kiri/kanan bawaan
    >
      {/* 🚀 Render Konten Dinamis */}
      {renderMainContent()}

      {/* FAB RECORDING (Merapat Kiri Otomatis Saat Nyumput) */}
      {(state.obdStatus === "ready" || state.isBypassed) && (
        <Animated.View
          {...state.panResponder.panHandlers}
          style={[
            styles.recordFabContainer,
            { transform: [{ translateX: state.fabX }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.recordFab,
              state.isRecording && styles.recordFabActive,
              !state.isFabOpen && { justifyContent: "center" },
            ]}
            onPress={() => {
              if (!state.isFabOpen) actions.toggleFab(true);
              else {
                actions.toggleRecording();
                if (state.isRecording)
                  setTimeout(() => actions.toggleFab(false), 500);
              }
            }}
          >
            <Ionicons
              name={state.isRecording ? "stop" : "videocam"}
              size={state.isFabOpen ? 28 : 13}
              color={
                state.isRecording ? "#fff" : state.isFabOpen ? "#000" : "#000"
              }
              style={!state.isFabOpen && { position: "absolute", left: 6 }}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {(state.obdStatus === "ready" || state.isBypassed) && (
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.secretZone]}
          onPress={actions.handleSecretOtaTrigger}
        />
      )}

      {/* {(state.obdStatus === "ready" || state.isBypassed) && (
        <TouchableOpacity
          onPress={() => setIsGaugeTestMode((prev) => !prev)}
          style={{
            position: "absolute",
            top: insets.top + 8,
            alignSelf: "center",
            backgroundColor: isGaugeTestMode ? "#ff4444" : "#222",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: isGaugeTestMode ? "#ff8888" : "#444",
            zIndex: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Ionicons
            name={isGaugeTestMode ? "stop-circle" : "play-circle"}
            size={16}
            color="#fff"
          />
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 11 }}>
            {isGaugeTestMode ? "STOP TEST REV" : "TEST REV"}
          </Text>
        </TouchableOpacity>
      )} */}

      {/* GLOBAL OVERLAY LAYER MODALS */}
      <TransmissionModal
        visible={
          state.showTransModal &&
          (state.obdStatus === "ready" || state.isBypassed)
        }
        onSelect={actions.saveTransmission}
      />

      <ConfirmModal
        visible={state.confirmAlert.visible}
        config={state.confirmAlert}
        onClose={() =>
          actions.setConfirmAlert({ ...state.confirmAlert, visible: false })
        }
      />

      <OTAModal
        visible={state.showOTAModal}
        onClose={() => actions.setShowOTAModal(false)}
        otaSsid={state.otaSsid}
        setOtaSsid={actions.setOtaSsid}
        otaPass={state.otaPass}
        setOtaPass={actions.setOtaPass}
        onEnterOta={actions.enterOTAMode}
      />
      <SettingsModal
        visible={state.showSettings}
        onClose={() => actions.setShowSettings(false)}
        obdType={state.obdType}
        setObdType={actions.setObdType}
        obdMac={state.obdMac}
        setObdMac={actions.setObdMac}
        obdPin={state.obdPin}
        setObdPin={actions.setObdPin}
        obdWifiSsid={state.obdWifiSsid}
        setObdWifiSsid={actions.setObdWifiSsid}
        obdIp={state.obdIp}
        setObdIp={actions.setObdIp}
        obdPort={state.obdPort}
        setObdPort={actions.setObdPort}
        autoLock={state.autoLock}
        setAutoLock={actions.setAutoLock}
        lockSpeed={state.lockSpeed}
        setLockSpeed={actions.setLockSpeed}
        onApply={actions.applyOBDConfig}
        onStartScan={actions.startScannerUI}
        sendMessage={actions.sendMessage}
        showScanner={state.showScanner}
        setShowScanner={actions.setShowScanner}
        isSearchingOBD={state.isSearchingOBD}
        scannedDevices={state.scannedDevices}
        onSelectDevice={actions.selectDevice}
        hudMirrorEnabled={state.hudMirrorEnabled}
        onToggleHudMirror={actions.toggleHudMirror}
      />
      <HudModal
        visible={state.isHudMode}
        onClose={actions.exitHudMode}
        onTap={actions.handleHudTap}
        tapCount={state.hudTapCount}
        data={state.data}
        transmission={state.transmission}
        instFuel={state.instFuel}
        avgFuel={state.avgFuel}
        mirrorEnabled={state.hudMirrorEnabled}
        onToggleMirror={actions.toggleHudMirror}
      />

      <SaveTripModal
        visible={state.showSaveTripModal}
        onSave={actions.confirmSaveTrip}
        onDiscard={actions.discardTrip}
      />

      <TerminalModal
        visible={state.showTerminal}
        onClose={actions.closeTerminal}
        logs={state.terminalLogs}
        onSend={actions.sendToTerminal}
        onSendRaw={actions.sendMessage}
      />
    </SafeAreaView>
  );
}
