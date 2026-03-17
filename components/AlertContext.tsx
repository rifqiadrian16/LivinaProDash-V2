import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useContext, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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

  const showAlert = (title: string, message: string, type = "error") => {
    setAlertConfig({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
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
                  alertConfig.type === "success" ? "#00cc00" : "#ff4444",
              },
            ]}
          >
            <Ionicons
              name={
                alertConfig.type === "success" ? "checkmark-circle" : "warning"
              }
              size={56}
              color={alertConfig.type === "success" ? "#00cc00" : "#ff4444"}
            />
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            <TouchableOpacity
              style={[
                styles.alertBtn,
                {
                  backgroundColor:
                    alertConfig.type === "success" ? "#00cc00" : "#ff4444",
                },
              ]}
              onPress={hideAlert}
            >
              <Text style={styles.alertBtnText}>MENGERTI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

// Pindahkan Style Alert ke sini
const styles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: "80%",
    backgroundColor: "#1e1e1e",
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
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: "center",
  },
  alertMessage: {
    color: "#aaa",
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
    color: "#121212",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1.5,
  },
});
