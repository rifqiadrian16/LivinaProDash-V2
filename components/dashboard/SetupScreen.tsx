import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../../styles/dashboard.styles";

export default function SetupScreen({
  onConnect,
  isConnecting,
  onSecretTap,
}: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.setupContainer}>
        <View style={styles.headerCentered}>
          <TouchableOpacity activeOpacity={1} onPress={onSecretTap}>
            <Ionicons name="car-sport" size={80} color="#00ff88" />
          </TouchableOpacity>
          <Text style={styles.setupTitle}>LIVINA PRODASH</Text>
          <Text style={styles.setupSubtitle}>
            Sistem Telemetri & Diagnostik
          </Text>
        </View>

        <View
          style={{ marginTop: 50, alignItems: "center", paddingHorizontal: 20 }}
        >
          <Text
            style={{
              color: "#888",
              textAlign: "center",
              marginBottom: 20,
              lineHeight: 22,
            }}
          >
            1. Nyalakan mesin atau kontak mobil ke posisi ON.{"\n"}
            2. Pastikan Modul Livina ProDash sudah menyala.
          </Text>

          <TouchableOpacity
            style={styles.connectBtn}
            onPress={onConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.connectBtnText}>HUBUNGKAN KE MODUL</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
