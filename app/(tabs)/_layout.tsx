import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import * as TaskManager from "expo-task-manager";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
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

  useEffect(() => {
    initDB();
  }, []);

  return (
    <AlertProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#00FF88", // Warna Cyan Premium
          tabBarInactiveTintColor: isDark ? "#666666" : "#999999",
          headerShown: false,

          /* --- PENGATURAN TAB BAR UTAMA --- */
          tabBarStyle: {
            position: "absolute",
            bottom: Platform.OS === "ios" ? 24 : 16,
            left: 20,
            right: 20,
            height: 64,
            borderTopWidth: 0,
            // 1. KITA BUANG WARNA DAN SHADOW DARI SINI
            backgroundColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
          },

          /* --- PENGATURAN BACKGROUND & SHADOW (SOLUSI KOTAK HANTU) --- */
          tabBarBackground: () => (
            <View style={styles.blurContainerWrapper}>
              <View
                style={[
                  styles.blurContainer,
                  // isDark ? styles.bgDark : styles.bgLight,
                  styles.bgDark,
                ]}
              >
                <BlurView
                  // tint={isDark ? "dark" : "light"}
                  tint={"dark"}
                  intensity={80}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>
          ),

          tabBarItemStyle: {
            paddingVertical: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.5,
            marginBottom: 4,
          },
        }}
      >
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
  /* --- WADAH LUAR: KHUSUS UNTUK SHADOW --- */
  blurContainerWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "transparent",
    // Taruh shadow di sini agar mengikuti bentuk borderRadius
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },

  /* --- WADAH DALAM: KHUSUS UNTUK WARNA & BLUR --- */
  blurContainer: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden", // Ini yang memotong "kotak hantu"
    borderWidth: 1,
  },
  bgDark: {
    backgroundColor: "rgba(10, 10, 10, 0.65)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  bgLight: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: "rgba(0, 0, 0, 0.05)",
  },

  /* --- ICON STYLES --- */
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
