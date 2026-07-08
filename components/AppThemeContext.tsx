import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { AppColors, DARK_COLORS, LIGHT_COLORS } from "../constants/appThemes";

const STORAGE_KEY = "@prodash_display_mode";

const AppThemeContext = createContext<any>(null);

export const useAppTheme = () => {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme harus dipanggil di dalam <AppThemeProvider>");
  }
  return ctx;
};

export const AppThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isDark, setIsDark] = useState(true); // default tetap Dark seperti sekarang

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) setIsDark(saved === "dark");
      } catch (e) {
        console.log("[AppTheme] Gagal load mode tampilan", e);
      }
    })();
  }, []);

  const toggleMode = async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch (e) {
      console.log("[AppTheme] Gagal simpan mode tampilan", e);
    }
  };

  const colors: AppColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <AppThemeContext.Provider value={{ isDark, toggleMode, colors }}>
      {children}
    </AppThemeContext.Provider>
  );
};
