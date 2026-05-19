import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

interface WaitingMacScreenProps {
  onOpenSettings: () => void;
}

export default function WaitingMacScreen({
  onOpenSettings,
}: WaitingMacScreenProps) {
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
        Modul LivinaProDash berhasil tersambung ke HP! Namun, modul belum
        dipasangkan dengan adaptor OBD2 di mobil.
      </Text>
      <TouchableOpacity
        style={[
          styles.connectBtn,
          { backgroundColor: "#e67e22", width: "85%" },
        ]}
        onPress={onOpenSettings}
      >
        <Text style={styles.connectBtnText}>PASANGKAN OBD2 SEKARANG</Text>
      </TouchableOpacity>
    </View>
  );
}
