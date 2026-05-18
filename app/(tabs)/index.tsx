import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import useDashboard from "../../hooks/useDashboard";

// IMPORT COMPONENTS
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DataGrid from "../../components/dashboard/DataGrid";
import MainGauges from "../../components/dashboard/MainGauges";
import ConfirmModal from "../../components/dashboard/Modal/ConfirmModal";
import HudModal from "../../components/dashboard/Modal/HudModal";
import OTAModal from "../../components/dashboard/Modal/OTAModal";
import SettingsModal from "../../components/dashboard/Modal/SettingsModal";
import TransmissionModal from "../../components/dashboard/Modal/TransmissionModal";
import SetupScreen from "../../components/dashboard/SetupScreen";
import { styles } from "../../styles/dashboard.styles";

export default function DashboardScreen() {
  const { state, actions } = useDashboard();

  // 🛡️ FUNGSI FILTER KONTEN UTAMA (SETUP WIZARD MANAGEMENT)
  const renderMainContent = () => {
    // KONDISI DEMO / BYPASS / DATA READY: Tampilkan Dashboard Utama Mas!
    if (state.isBypassed || state.obdStatus === "ready") {
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
          />
          <MainGauges rpm={state.data.r} speed={state.data.s} />
          <DataGrid
            data={state.data}
            instFuel={state.instFuel}
            avgFuel={state.avgFuel}
          />
        </ScrollView>
      );
    }

    // TAHAP 1: Belum Konek BLE ke ESP32
    if (state.obdStatus === "disconnected") {
      return (
        <SetupScreen
          onConnect={actions.handleConnectToModule}
          isConnecting={state.isConnectingBLE}
          onSecretTap={actions.handleSetupSecretTap}
        />
      );
    }

    // TAHAP 2: Pembeli Baru (ESP32 teriak minta MAC OBD)
    if (state.obdStatus === "waiting_mac") {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 25,
            backgroundColor: "#111",
          }}
        >
          <Ionicons name="bluetooth-outline" size={90} color="#e67e22" />
          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontWeight: "bold",
              marginTop: 25,
              textAlign: "center",
            }}
          >
            Konfigurasi OBD2 Pertama Kali
          </Text>
          <Text
            style={{
              color: "#aaa",
              textAlign: "center",
              marginTop: 12,
              marginBottom: 35,
              lineHeight: 24,
              paddingHorizontal: 15,
            }}
          >
            Modul LivinaProDash berhasil tersambung ke HP Mas! Namun, modul
            belum dipasangkan dengan adaptor OBD2 di mobil.
          </Text>
          <TouchableOpacity
            style={[
              styles.connectBtn,
              { backgroundColor: "#e67e22", width: "85%" },
            ]}
            onPress={() => actions.setShowSettings(true)}
          >
            <Text style={styles.connectBtnText}>PASANGKAN OBD2 SEKARANG</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // TAHAP 3: Menunggu Kontak ON (ESP32 sedang menembak ELM327 ke ECU)
    if (state.obdStatus === "connecting_ecu") {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 25,
            backgroundColor: "#111",
          }}
        >
          <ActivityIndicator size="large" color="#00ff88" />
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 25,
              textAlign: "center",
            }}
          >
            Menghubungkan ke ECU Mobil...
          </Text>
          <Text
            style={{
              color: "#777",
              textAlign: "center",
              marginTop: 12,
              lineHeight: 24,
              paddingHorizontal: 20,
            }}
          >
            Koneksi ke modul aman. Sekarang ESP32 sedang mencoba membangun
            jembatan data ke mesin mobil.{"\n"}
            {"\n"}
            <Text style={{ color: "#00ff88", fontWeight: "bold" }}>
              ⚠️ Pastikan Kunci Kontak Mobil Posisi ON!
            </Text>
          </Text>
        </View>
      );
    }
  };

  // FRAME CORE APLIKASI
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 🚀 Render Konten Dinamis Di Sini */}
      {renderMainContent()}

      {/* FAB RECORDING (Hanya muncul saat siap/dashboard aktif) */}
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
              name={
                state.isRecording
                  ? "stop"
                  : state.isFabOpen
                    ? "videocam"
                    : "chevron-back"
              }
              size={28}
              color={state.isRecording ? "#fff" : "#000"}
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* AREA SENTUH RAHASIA OTA */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.secretZone}
        onPress={actions.handleSecretOtaTrigger}
      />

      {/* SEMUA MODAL TETAP MENYALA DI SINI AGAR BISA DIPANGGIL KAPAN SAJA */}
      <TransmissionModal
        visible={state.showTransModal}
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
      />
    </SafeAreaView>
  );
}
