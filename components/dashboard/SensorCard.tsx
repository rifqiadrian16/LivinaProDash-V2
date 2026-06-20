import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

// ✅ Tambahan prop `compact`: saat true, kartu melebar jadi ~48% (2 kolom)
// dipakai di layout landscape head unit dimana ruang horizontal terbatas
// (gauge mengambil setengah layar di sisi kiri).
const SensorCard = memo(
  ({ icon, label, value, color, compact = false }: any) => {
    return (
      <View
        style={[styles.card, compact && { width: "48%", marginBottom: 10 }]}
      >
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
    );
  },
);

// 2. Export komponen yang sudah dibungkus
export default SensorCard;
