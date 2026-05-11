import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertProvider } from "../../components/AlertContext";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <AlertProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#ff4444",
          tabBarInactiveTintColor: "#666",
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#121212",
            borderTopColor: "#333",
            borderTopWidth: 2,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 5,
            height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => (
              <Ionicons size={28} name="speedometer-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="diagnostics"
          options={{
            title: "Diagnostics",
            tabBarIcon: ({ color }) => (
              <Ionicons size={28} name="build-outline" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="trip"
          options={{
            title: "Trip & Fuel",
            tabBarIcon: ({ color }) => (
              <Ionicons size={28} name="map-outline" color={color} />
            ),
          }}
        />
      </Tabs>
    </AlertProvider>
  );
}
