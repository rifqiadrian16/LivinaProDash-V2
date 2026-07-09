import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useContext, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppColors } from "../constants/appThemes";
import { useAppTheme } from "./AppThemeContext";

// 1. Buat Context
const AlertContext = createContext<any>(null);

// 2. Buat Custom Hook agar mudah dipanggil di halaman lain
export const useAlert = () => {
  return useContext(AlertContext);
};

// 3. Buat Provider (Bungkus Utama)
export const AlertProvider = ({ children }: { children: React.ReactNode }) => {
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    type: "error", // 'error' | 'success'
  });

  const { colors } = useAppTheme();
  const styles = getAlertStyles(colors);

  const [confirmConfig, setConfirmConfig] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type = "error") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirmAction: () => void,
  ) => {
    setConfirmConfig({
      visible: true,
      title,
      message,
      onConfirm: onConfirmAction,
    });
  };

  const hideConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, showConfirm }}>
      {children}

      {/* MODAL GLOBAL YANG HANYA DITULIS 1 KALI */}
      <Modal
        transparent={true}
        visible={alertConfig.visible}
        animationType="fade"
        onRequestClose={hideAlert}
      >
        <View style={styles.alertOverlay}>
          <View
            style={[
              styles.alertBox,
              {
                borderTopColor:
                  alertConfig.type === "success" ? colors.accent : "#ff4444",
              },
            ]}
          >
            <Ionicons
              name={
                alertConfig.type === "success" ? "checkmark-circle" : "warning"
              }
              size={56}
              color={alertConfig.type === "success" ? colors.accent : "#ff4444"}
            />
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            <TouchableOpacity
              style={[
                styles.alertBtn,
                {
                  backgroundColor:
                    alertConfig.type === "success" ? colors.accent : "#ff4444",
                },
              ]}
              onPress={hideAlert}
            >
              <Text style={styles.alertBtnText}>MENGERTI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={confirmConfig.visible}
        animationType="fade"
        onRequestClose={hideConfirm}
      >
        <View style={styles.alertOverlay}>
          <View style={[styles.alertBox, { borderTopColor: "#ff4444" }]}>
            <Ionicons name="help-circle" size={56} color={"#ff4444"} />
            <Text style={styles.alertTitle}>{confirmConfig.title}</Text>
            <Text style={styles.alertMessage}>{confirmConfig.message}</Text>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.alertBtn, styles.cancelBtn]}
                onPress={hideConfirm}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.alertBtn, styles.confirmBtn]}
                onPress={() => {
                  confirmConfig.onConfirm();
                  hideConfirm();
                }}
              >
                <Text style={styles.confirmBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

// Pindahkan Style Alert ke sini
const getAlertStyles = (c: AppColors) =>
  StyleSheet.create({
    alertOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
    },
    alertBox: {
      width: "80%",
      backgroundColor: c.bg,
      borderRadius: 15,
      padding: 25,
      alignItems: "center",
      borderTopWidth: 5,
      borderWidth: 1,
      borderColor: "#333",
      elevation: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
    },
    alertTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 15,
      marginBottom: 8,
      letterSpacing: 1,
      textAlign: "center",
    },
    alertMessage: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 20,
    },
    alertBtn: {
      width: "100%",
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    alertBtnText: {
      color: c.label,
      fontWeight: "900",
      fontSize: 14,
      letterSpacing: 1.5,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      gap: 10, // Memberi jarak antar tombol
    },
    cancelBtn: {
      flex: 1,
      backgroundColor: "#333",
    },
    cancelBtnText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 14,
    },
    confirmBtn: {
      flex: 1,
      backgroundColor: "#ff4444",
    },
    confirmBtnText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 14,
    },
  });
