import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../components/AppThemeContext";
import { getDashboardStyles } from "../../../styles/dashboard.styles";
export default function ConfirmModal({ visible, config, onClose }: any) {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.modalBg, { backgroundColor: "rgba(0,0,0,0.9)" }]}>
        <View
          style={[
            styles.modalBox,
            {
              borderColor: config.isDanger ? "#ff4444" : "#00ff88",
              alignItems: "center",
              paddingVertical: 30,
              width: "80%",
            },
          ]}
        >
          <Ionicons
            name={config.isDanger ? "warning" : "cloud-upload"}
            size={60}
            color={config.isDanger ? "#ff4444" : "#00ff88"}
            style={{ marginBottom: 15 }}
          />
          <Text
            style={[
              styles.modalTitle,
              { textAlign: "center", marginBottom: 10, fontSize: 18 },
            ]}
          >
            {config.title}
          </Text>
          <Text
            style={{
              color: "#888",
              textAlign: "center",
              marginBottom: 25,
              lineHeight: 22,
              fontSize: 14,
            }}
          >
            {config.message}
          </Text>
          <View style={{ flexDirection: "row", gap: 15, width: "100%" }}>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1, backgroundColor: "#222" }]}
              onPress={onClose}
            >
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>
                {config.cancelText}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  flex: 1,
                  backgroundColor: config.isDanger ? "#ff4444" : "#00ff88",
                },
              ]}
              onPress={config.onConfirm}
            >
              <Text style={[styles.saveBtnText, { color: "#fff" }]}>
                {config.confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
