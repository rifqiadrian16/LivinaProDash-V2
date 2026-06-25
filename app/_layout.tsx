// app/_layout.tsx
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";

export default function RootLayout() {
  // Immersive Mode diletakkan di Root agar berlaku global
  useEffect(() => {
    if (Platform.OS === "android") {
      const setImmersiveMode = async () => {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
          await NavigationBar.setBehaviorAsync("overlay-swipe");
        } catch (error) {
          console.log("Gagal mengatur immersive mode:", error);
        }
      };
      setImmersiveMode();
    }
  }, []);

  return (
    // Stack utama aplikasi Anda
    <Stack screenOptions={{ headerShown: false }}>
      {/* 1. Mendaftarkan folder (tabs) sebagai layar utama */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* 2. Anda bisa menambahkan halaman Stack lain di sini nantinya */}
      {/* Contoh: halaman yang tidak memiliki Tab Bar di bawahnya */}
      {/* <Stack.Screen name="settings" /> */}
      {/* <Stack.Screen name="login" /> */}
    </Stack>
  );
}
