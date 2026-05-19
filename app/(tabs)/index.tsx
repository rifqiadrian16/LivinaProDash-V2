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

// IMPORT SUB-SCREENS
import ConnectingEcuScreen from "../../components/dashboard/ConnectingEcuScreen";
import DashboardHeader from "../../components/dashboard/DashboardHeader";
import DataGrid from "../../components/dashboard/DataGrid";
import MainGauges from "../../components/dashboard/MainGauges";
import WaitingMacScreen from "../../components/dashboard/WaitingMacScreen";

// IMPORT MODALS
import ConfirmModal from "../../components/dashboard/Modal/ConfirmModal";
import HudModal from "../../components/dashboard/Modal/HudModal";
import OTAModal from "../../components/dashboard/Modal/OTAModal";
import SettingsModal from "../../components/dashboard/Modal/SettingsModal";
import TransmissionModal from "../../components/dashboard/Modal/TransmissionModal";
import SetupScreen from "../../components/dashboard/SetupScreen";
import { styles } from "../../styles/dashboard.styles";

export default function DashboardScreen() {
  const { state, actions } = useDashboard();

  // 🛡️ GERBANG LOGIKA TAMPILAN DINAMIS
  const renderMainContent = () => {
    // KONDISI UTAMA: Tampilkan Dashboard Aktif
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
            isObdStandby={state.isObdStandby}
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
    <SafeAreaView style={styles.safeArea}>
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
              size={state.isFabOpen ? 28 : 20}
              color={
                state.isRecording ? "#fff" : state.isFabOpen ? "#000" : "#fff"
              }
              style={!state.isFabOpen && { position: "absolute", left: 6 }}
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

      {/* GLOBAL OVERLAY LAYER MODALS */}
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
