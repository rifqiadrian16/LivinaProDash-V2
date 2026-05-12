import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

export default function SensorCard({ icon, label, value, color }: any) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}
