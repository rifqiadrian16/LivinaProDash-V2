// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router"; // <-- Hapus Stack dari sini
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertProvider } from "../../components/AlertContext";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { initDB } from "../../utils/database";

const BACKGROUND_LOCATION_TASK = "LIVINA_BACKGROUND_TRACKING";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background Task Error:", error);
    return;
  }
  if (data) {
  }
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  useEffect(() => {
    initDB();
  }, []);

  // <-- Logika Immersive Mode sudah dihapus dari sini (dipindah ke Root)

  return (
    <AlertProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#00FF88",
          tabBarInactiveTintColor: isDark ? "#666666" : "#999999",
          headerShown: false,

          /* --- PENGATURAN TAB BAR UTAMA --- */
          tabBarStyle: {
            position: "absolute",
            bottom: Platform.OS === "ios" ? 24 : 16,
            left: 20,
            right: 20,
            borderTopWidth: 0,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 5 : 15,
            height: insets.bottom > 0 ? 50 + insets.bottom : 70,
            backgroundColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
          },

          /* --- PENGATURAN BACKGROUND & SHADOW --- */
          tabBarBackground: () => (
            <View style={styles.blurContainerWrapper}>
              <View style={[styles.blurContainer, styles.bgDark]}>
                <BlurView
                  tint={"dark"}
                  intensity={80}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>
          ),

          tabBarItemStyle: { paddingVertical: 8 },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.5,
            marginBottom: 4,
          },
        }}
      >
        {/* Screen Tabs Anda Tetap Sama */}
        <Tabs.Screen
          name="index"
          options={{
            title: "DASH",
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "speedometer" : "speedometer-outline"}
                  size={24}
                  color={color}
                />
                {focused && (
                  <View
                    style={[styles.activeIndicator, { backgroundColor: color }]}
                  />
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="trip"
          options={{
            title: "TRIPS",
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "map" : "map-outline"}
                  size={24}
                  color={color}
                />
                {focused && (
                  <View
                    style={[styles.activeIndicator, { backgroundColor: color }]}
                  />
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="diagnostics"
          options={{
            title: "DIAGNOSTICS",
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "construct" : "construct-outline"}
                  size={24}
                  color={color}
                />
                {focused && (
                  <View
                    style={[styles.activeIndicator, { backgroundColor: color }]}
                  />
                )}
              </View>
            ),
          }}
        />
      </Tabs>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  blurContainerWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
  },
  bgDark: {
    backgroundColor: "rgba(10, 10, 10, 0.65)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -15,
    width: 12,
    height: 3,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
