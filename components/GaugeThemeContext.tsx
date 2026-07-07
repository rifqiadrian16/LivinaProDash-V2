import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { GAUGE_THEMES, GaugeTheme } from "../constants/gaugeThemes";

const STORAGE_KEY = "@prodash_gauge_theme_index";

const GaugeThemeContext = createContext<any>(null);

export const useGaugeTheme = () => {
  const ctx = useContext(GaugeThemeContext);
  if (!ctx) {
    throw new Error(
      "useGaugeTheme harus dipanggil di dalam <GaugeThemeProvider>",
    );
  }
  return ctx;
};

export const GaugeThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [themeIndex, setThemeIndex] = useState(0);

  // ✅ Muat tema tersimpan saat app dibuka
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const idx = parseInt(saved, 10);
          if (!isNaN(idx) && idx >= 0 && idx < GAUGE_THEMES.length) {
            setThemeIndex(idx);
          }
        }
      } catch (e) {
        console.log("[GaugeTheme] Gagal load tema tersimpan", e);
      }
    })();
  }, []);

  const persist = async (idx: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, idx.toString());
    } catch (e) {
      console.log("[GaugeTheme] Gagal simpan tema", e);
    }
  };

  // Dipakai buat tap-to-cycle di gauge
  const cycleTheme = () => {
    setThemeIndex((prev) => {
      const next = (prev + 1) % GAUGE_THEMES.length;
      persist(next);
      return next;
    });
  };

  // Dipakai buat pilihan spesifik di Settings Modal
  const setTheme = (idx: number) => {
    if (idx < 0 || idx >= GAUGE_THEMES.length) return;
    setThemeIndex(idx);
    persist(idx);
  };

  const theme: GaugeTheme = GAUGE_THEMES[themeIndex];

  return (
    <GaugeThemeContext.Provider
      value={{ theme, themeIndex, themes: GAUGE_THEMES, cycleTheme, setTheme }}
    >
      {children}
    </GaugeThemeContext.Provider>
  );
};
