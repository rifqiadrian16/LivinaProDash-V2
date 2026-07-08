import React from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../components/AppThemeContext";
import { getDashboardStyles } from "../../../styles/dashboard.styles";

export default function OTAModal({
  visible,
  onClose,
  otaSsid,
  setOtaSsid,
  otaPass,
  setOtaPass,
  onEnterOta,
}: any) {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBg}>
        <View style={[styles.modalBox, { borderColor: "#00ff88" }]}>
          <Text style={styles.modalTitle}>Update Firmware (OTA)</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.configLabel}>SSID HOTSPOT</Text>
              <TextInput
                style={[styles.configInput, { marginTop: 5 }]}
                value={otaSsid}
                onChangeText={setOtaSsid}
                placeholder="Nama Hotspot"
                placeholderTextColor="#444"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.configLabel}>PASSWORD</Text>
              <TextInput
                style={[styles.configInput, { marginTop: 5 }]}
                value={otaPass}
                onChangeText={setOtaPass}
                placeholder="Password"
                placeholderTextColor="#444"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: "#00ff88", marginBottom: 15, marginTop: 20 },
            ]}
            onPress={onEnterOta}
          >
            <Text style={[styles.saveBtnText, { width: "100%" }]}>
              MASUK MODE OTA (UPDATE)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: "#333" }]}
            onPress={() => onClose(false)}
          >
            <Text style={{ color: "#fff", width: "100%" }}>TUTUP</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
