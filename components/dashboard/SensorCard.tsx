import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

const SensorCard = memo(
  ({ icon, label, value, color, compact = false }: any) => {
    // ==========================================
    // 1. LAYOUT LANDSCAPE (KARTU HORIZONTAL)
    // ==========================================
    if (compact) {
      return (
        <View
          style={[
            styles.card,
            {
              width: "49%",
              marginBottom: 12,
              paddingVertical: 18,
              paddingHorizontal: 17,
              minHeight: 0,
              flexDirection: "row", // Menyamping
              alignItems: "center", // Vertikal di tengah
              // Kita hapus justifyContent di sini karena akan diatur oleh anak-anaknya
            },
          ]}
        >
          {/* KOLOM 1 (KIRI): IKON */}
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Ionicons name={icon} size={26} color={color} />
          </View>

          {/* KOLOM 2 (TENGAH): ANGKA (VALUE) */}
          <View style={{ flex: 1.5, alignItems: "center" }}>
            <Text
              style={[styles.cardValue, { fontSize: 18, marginVertical: 0 }]}
            >
              {value}
            </Text>
          </View>

          {/* KOLOM 3 (KANAN): NAMA SENSOR (LABEL) */}
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text
              style={[
                styles.cardLabel,
                { fontSize: 11, marginTop: 0, textAlign: "right" },
              ]}
            >
              {label}
            </Text>
          </View>
        </View>
      );
    }

    // ==========================================
    // 2. LAYOUT PORTRAIT (KARTU VERTIKAL BAWAAN)
    // ==========================================
    return (
      <View style={styles.card}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
    );
  },
);

export default SensorCard;
