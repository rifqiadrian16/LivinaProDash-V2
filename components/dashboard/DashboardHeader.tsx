import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/dashboard.styles";

export default function DashboardHeader({
  isConnected,
  isNightTime,
  onEnterHud,
  onOpenSettings,
  onDisconnect,
  isObdStandby,
}: any) {
  return (
    <View style={styles.header}>
      <Text style={styles.brandText}>PRODASH</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onEnterHud} style={styles.iconBtn}>
          <Ionicons
            name="eye-outline"
            size={18}
            color={isNightTime ? "#f1c40f" : "#00ffcc"}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenSettings} style={styles.iconBtn}>
          <Ionicons name="settings" size={18} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDisconnect} style={styles.iconBtn}>
          <Ionicons
            name={isObdStandby ? "play-circle-outline" : "stop-circle-outline"}
            size={24}
            color={isObdStandby ? "#00ff88" : "#ff4444"}
          />
        </TouchableOpacity>
        <View
          style={[
            styles.statusTag,
            { backgroundColor: isConnected ? "#00ff8822" : "#ff444422" },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: isConnected ? "#00ff88" : "#ff4444" },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isConnected ? "#00ff88" : "#ff4444" },
            ]}
          >
            {isConnected ? "STABLE" : "OFFLINE"}
          </Text>
        </View>
      </View>
    </View>
  );
}
