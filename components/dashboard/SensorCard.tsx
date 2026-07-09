import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../../components/AppThemeContext";
import { getDashboardStyles } from "../../styles/dashboard.styles";

const SensorCard = memo(
  ({ icon, label, value, color, compact = false }: any) => {
    const { colors } = useAppTheme();
    const styles = getDashboardStyles(colors);
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
              marginBottom: 6,
              paddingVertical: 9,
              paddingHorizontal: 14,
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
            },
          ]}
        >
          {/* KOLOM 1 (KIRI): IKON */}
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Ionicons name={icon} size={18} color={color} />
          </View>

          {/* KOLOM 2 (TENGAH): ANGKA (VALUE) */}
          <View style={{ flex: 1.5, alignItems: "center" }}>
            <Text style={[styles.cardValue, { fontSize: 14, marginTop: 0 }]}>
              {value}
            </Text>
          </View>

          {/* KOLOM 3 (KANAN): NAMA SENSOR (LABEL) */}
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text
              style={[
                styles.cardLabel,
                { fontSize: 7, marginTop: 0, textAlign: "right" },
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
