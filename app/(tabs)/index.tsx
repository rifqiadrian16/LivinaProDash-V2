import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  ScrollView,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// IMPORT CUSTOM HOOKS
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

  // LAYAR SETUP AWAL
  if (!state.isConnected && !state.isBypassed) {
    return (
      <SetupScreen
        onConnect={actions.handleConnectToModule}
        isConnecting={state.isConnectingBLE}
        onSecretTap={actions.handleSetupSecretTap}
      />
    );
  }

  // DASHBOARD UTAMA
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={{
          position: "absolute",
          top: 100,
          left: 20,
          zIndex: 999,
          gap: 10,
        }}
      ></View>
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

      {/* FAB RECORDING */}
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
          {!state.isFabOpen && !state.isRecording && (
            <Ionicons
              name="videocam"
              size={14}
              color="#000"
              style={{ position: "absolute", left: 6 }}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* AREA SENTUH RAHASIA OTA */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.secretZone}
        onPress={actions.handleSecretOtaTrigger}
      />

      {/* MODALS */}
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

      {/* OTA Modal: Sekarang tombol Start OTA-nya berfungsi */}
      <OTAModal
        visible={state.showOTAModal}
        onClose={() => actions.setShowOTAModal(false)}
        otaSsid={state.otaSsid}
        setOtaSsid={actions.setOtaSsid}
        otaPass={state.otaPass}
        setOtaPass={actions.setOtaPass}
        onEnterOta={actions.enterOTAMode}
      />

      {/* Settings Modal: Sekarang Radar Scanner-nya jalan lagi */}
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
