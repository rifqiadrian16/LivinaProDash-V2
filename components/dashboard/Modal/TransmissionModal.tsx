import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../components/AppThemeContext";
import { getDashboardStyles } from "../../../styles/dashboard.styles";

export default function TransmissionModal({ visible, onSelect }: any) {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBg}>
        <View style={[styles.modalBox, { alignItems: "center" }]}>
          <Ionicons
            name="car-sport"
            size={50}
            color="#00ff88"
            style={{ marginBottom: 15 }}
          />
          <Text
            style={[
              styles.modalTitle,
              { textAlign: "center", marginBottom: 10 },
            ]}
          >
            Jenis Transmisi
          </Text>
          <Text
            style={{
              color: "#888",
              textAlign: "center",
              marginBottom: 20,
              fontSize: 12,
            }}
          >
            Pilih jenis transmisi mobil Anda untuk menyesuaikan algoritma
            Shift-Light pada HUD.
          </Text>
          <View style={{ flexDirection: "row", gap: 15, width: "100%" }}>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1, backgroundColor: "#222" }]}
              onPress={() => onSelect("manual")}
            >
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>
                MANUAL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1, backgroundColor: "#00ff88" }]}
              onPress={() => onSelect("matic")}
            >
              <Text style={[styles.saveBtnText, { color: "#000" }]}>MATIC</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
