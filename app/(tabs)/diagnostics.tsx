import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DiagnosticsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <View style={styles.content}>
        {/* ICON ANIMASI ATAU STATIS */}
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={80} color="#333" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PRO</Text>
          </View>
        </View>

        <Text style={styles.title}>DIAGNOSTICS</Text>
        <Text style={styles.comingSoon}>COMING SOON</Text>

        <View style={styles.divider} />

        <Text style={styles.description}>
          Fitur pemindaian DTC (Diagnostic Trouble Codes) dan pembersihan memori
          ECU sedang dalam tahap pengembangan untuk versi ProDash selanjutnya.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#444" />
            <Text style={styles.featureText}>
              Deep ECU Scan (Nissan Protocol)
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#444" />
            <Text style={styles.featureText}>Clear Trouble Codes</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color="#444" />
            <Text style={styles.featureText}>Freeze Frame Data</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    padding: 25,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#151515",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  badge: {
    position: "absolute",
    top: 20,
    right: 10,
    backgroundColor: "#ff4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
  },
  comingSoon: {
    color: "#ff4444",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 2,
    marginTop: 5,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginVertical: 25,
  },
  description: {
    color: "#666",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  featureList: {
    width: "100%",
    paddingHorizontal: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  featureText: {
    color: "#444",
    fontSize: 13,
    fontWeight: "500",
  },
});
