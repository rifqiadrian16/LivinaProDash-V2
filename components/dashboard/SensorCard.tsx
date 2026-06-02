import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

// 1. Bungkus dengan memo()
const SensorCard = memo(({ icon, label, value, color }: any) => {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
});

// 2. Export komponen yang sudah dibungkus
export default SensorCard;
