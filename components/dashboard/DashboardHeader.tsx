import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAppTheme } from "../../components/AppThemeContext";
import { getDashboardStyles } from "../../styles/dashboard.styles";

export default function DashboardHeader({
  isConnected,
  isNightTime,
  onEnterHud,
  onOpenSettings,
  onDisconnect,
  isObdStandby,
  onOpenTerminal,
  isLocked,
}: any) {
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isDark, toggleMode } = useAppTheme();
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);

  const handleBrandTap = () => {
    tapCount.current += 1;

    // Reset timer setiap kali diketuk
    if (tapTimer.current) clearTimeout(tapTimer.current);

    // Jika tidak diketuk lagi dalam 1 detik, reset ke 0
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 1000);

    // Jika berhasil mencapai 5x tap
    if (tapCount.current >= 5) {
      tapCount.current = 0; // Reset
      if (onOpenTerminal) onOpenTerminal(); // Buka Terminal!
    }
  };

  return (
    <View style={styles.header}>
      <View>
        <TouchableWithoutFeedback onPress={handleBrandTap}>
          <View>
            <Text style={styles.brandText}>PRODASH</Text>
          </View>
        </TouchableWithoutFeedback>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}
        >
          <Ionicons
            name={isLocked ? "lock-closed" : "lock-open"}
            size={10}
            color={isLocked ? "#00ff88" : "#888"}
          />
          <Text
            style={{
              fontSize: 9,
              fontWeight: "bold",
              letterSpacing: 0.5,
              marginLeft: 4,
              color: isLocked ? "#00ff88" : "#888",
            }}
          >
            {isLocked ? "TERKUNCI" : "TERBUKA"}
          </Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={toggleMode}
          style={{
            backgroundColor: isDark ? "#333" : "#00ff88",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
          }}
        >
          <Text
            style={{
              color: isDark ? "#fff" : "#000",
              fontSize: 10,
              fontWeight: "bold",
            }}
          >
            {isDark ? "DARK" : "LIGHT"}
          </Text>
        </TouchableOpacity>
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
            name={isObdStandby ? "power-outline" : "power-outline"}
            size={18}
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
