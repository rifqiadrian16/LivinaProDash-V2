// app/(tabs)/_layout.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertProvider } from "../../components/AlertContext";
import {
  AppThemeProvider,
  useAppTheme,
} from "../../components/AppThemeContext";
import { BLEProvider } from "../../components/BLEContext";
import { FuelProvider } from "../../components/FuelContext";
import { GaugeThemeProvider } from "../../components/GaugeThemeContext";
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

const AnimatedTabItem = ({
  focused,
  color,
  iconName,
  iconSet = "ionicons", // BARU
  iconSize,
  label,
  labelStyle,
  indicatorStyle,
}: any) => {
  const IconComponent = iconSet === "mci" ? MaterialCommunityIcons : Ionicons;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateTab = useCallback(() => {
    requestAnimationFrame(() => {
      if (focused) {
        // Naik ke -4px dengan pegas (bouncy)
        Animated.spring(translateY, {
          toValue: -4,
          useNativeDriver: true,
          friction: 4, // <-- Semakin kecil angka ini (misal 3 atau 4), semakin mentul-mentul!
          tension: 60, // <-- Tarikan pegas
        }).start();
      } else {
        // Kembali turun ke 0 saat tab ditinggalkan
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 6,
          tension: 50,
        }).start();
      }
    });
  }, [focused, translateY]);

  useEffect(() => {
    animateTab();
  }, [animateTab]);

  return (
    <Animated.View
      style={[styles.iconContainer, { transform: [{ translateY }] }]}
    >
      {/* IKON */}
      <IconComponent name={iconName} size={iconSize} color={color} />

      {/* LABEL TEKS */}
      <Text
        style={[
          labelStyle,
          {
            color,
            marginTop: 2,
            textAlign: "center",
            width: "100%",
            minWidth: 100,
            overflow: "visible", //
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* INDIKATOR GARIS */}
      {focused && (
        <View
          style={[
            styles.activeIndicator,
            {
              backgroundColor: color,
              ...indicatorStyle,
            },
          ]}
        />
      )}
    </Animated.View>
  );
};

export default function TabLayout() {
  useEffect(() => {
    initDB();
  }, []);

  return (
    <AppThemeProvider>
      <AlertProvider>
        <BLEProvider>
          <FuelProvider>
            <GaugeThemeProvider>
              <TabLayoutContent />
            </GaugeThemeProvider>
          </FuelProvider>
        </BLEProvider>
      </AlertProvider>
    </AppThemeProvider>
  );
}

function TabLayoutContent() {
  const { colors, isDark, accent } = useAppTheme();
  const activeAccentColor =
    colors?.accent || colors?.primary || accent || "#00FF88";

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTabletLandscape = isLandscape && height >= 480;

  const getDynamicTabBarStyle = () => {
    // ✅ Insets disamakan (simetris) — device dengan notch/cutout di satu sisi
    // (terutama landscape) punya insets.left ≠ insets.right, yang bikin box
    // kelihatan geser walau posisinya matematis "benar" terhadap raw width.
    const safeHorizontalInset = Math.max(insets.left, insets.right);

    // ⚠️ PENTING: JANGAN pakai `left` + `width` di sini. React Navigation
    // secara internal kadang meng-override `left` balik ke 0 pada style
    // absolute (dipakai untuk hitung ukuran tab bar), sementara `width`
    // custom kita tetap kepakai — hasilnya box jadi nempel ke kiri padahal
    // lebarnya sudah benar (persis yang kejadian di screenshot Mas).
    // `marginHorizontal` itu jalur box-model terpisah dari positioning,
    // jadi tidak ikut ke-override dan selalu simetris kiri-kanan.
    if (isTabletLandscape) {
      const horizontalMargin = 50 + safeHorizontalInset;
      return {
        height: 65,
        bottom: 12,
        left: 0,
        right: 0,
        marginHorizontal: horizontalMargin,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
      };
    }

    if (isLandscape) {
      const horizontalMargin = 10 + safeHorizontalInset;
      return {
        height: 52,
        bottom: 8,
        left: 0,
        right: 0,
        marginHorizontal: horizontalMargin,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 4,
      };
    }

    const horizontalMargin = 10 + safeHorizontalInset;
    return {
      height: 65,
      bottom: Platform.OS === "ios" ? 24 : 13,
      left: 0,
      right: 0,
      marginHorizontal: horizontalMargin,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 5 : 5,
    };
  };

  const getDynamicIndicatorStyle = () => {
    if (isTabletLandscape) {
      return {
        bottom: -5,
        width: 16,
        height: 3.5,
      };
    }

    if (isLandscape) {
      return {
        bottom: -8,
        width: 10,
        height: 2.5,
      };
    }

    return {
      bottom: -5, // Posisi default lama kamu
      width: 12,
      height: 3,
    };
  };

  const getDynamicLabelStyle = () => {
    // 1. Mode Tablet / Head Unit Android (Tab height: 62px)
    if (isTabletLandscape) {
      return {
        fontSize: 10,
        marginBottom: 0, // <-- Hilangkan margin bawah biar teks turun 4px
        marginTop: 2, // <-- Beri jarak atas biar sedikit menjauh dari ikon
      };
    }

    // 2. Mode HP Landscape (Tab height: 52px - Sangat pendek)
    if (isLandscape) {
      return {
        fontSize: 9,
        marginBottom: -2, // <-- Margin minus untuk menarik teks lebih turun ke bawah
        marginTop: 2,
      };
    }

    // 3. Mode Portrait (Default HP - Tab height: 70px)
    return {
      fontSize: 10,
      marginBottom: 4, // <-- Posisi default lama kamu
    };
  };

  const dynamicLabelStyle = getDynamicLabelStyle();
  const dynamicTabStyle = getDynamicTabBarStyle();
  const dynamicItemPadding = isLandscape && !isTabletLandscape ? 4 : 8;
  const dynamicIndicatorStyle = getDynamicIndicatorStyle();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeAccentColor,
          tabBarInactiveTintColor: isDark ? "#666666" : "#999999",
          headerShown: false,

          tabBarLabelPosition: "below-icon",

          tabBarIconStyle: {
            flex: 1,
            width: "100%",
            height: "100%",
            maxHeight: undefined, // <-- Wajib undefined agar tidak dikunci 24px
            maxWidth: undefined, // <-- Wajib undefined agar tidak dikunci 24px
          },

          /* --- PENGATURAN TAB BAR UTAMA --- */
          tabBarStyle: {
            position: "absolute",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            borderRadius: 32,
            ...dynamicTabStyle,
          },

          /* --- PENGATURAN BACKGROUND & SHADOW --- */
          tabBarBackground: () => (
            <View
              style={[
                styles.solidContainer,
                {
                  backgroundColor:
                    colors.card ||
                    colors.background ||
                    (isDark ? "#121212" : "#FFFFFF"),

                  // ✅ Garis tepi halus agar tab bar melayang terlihat tegas & rapi
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.08)",
                  borderWidth: 1,
                },
              ]}
            />
          ),

          tabBarItemStyle: {
            paddingVertical: isTabletLandscape ? 4 : dynamicItemPadding,
            flexDirection: "column", // <-- Wajib agar ikon selalu di atas teks
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarLabelStyle: {
            fontWeight: "700",
            letterSpacing: 0.5,
            ...dynamicLabelStyle,
          },
        }}
      >
        {/* Screen Tabs Anda Tetap Sama */}
        <Tabs.Screen
          name="index"
          options={{
            title: "DASH",
            tabBarLabel: () => null, // <-- 1. MATIKAN LABEL DEFAULT
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabItem
                focused={focused}
                color={color}
                iconName={focused ? "speedometer" : "speedometer-outline"}
                iconSize={isLandscape && !isTabletLandscape ? 20 : 24}
                label="DASH" // <-- 2. TAMBAHKAN LABEL INI
                labelStyle={dynamicLabelStyle} // <-- 3. TAMBAHKAN STYLE INI
                indicatorStyle={dynamicIndicatorStyle}
                isLandscape={isLandscape}
                isTabletLandscape={isTabletLandscape}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="trip"
          options={{
            title: "TRIPS",
            tabBarLabel: () => null, // <-- 1. MATIKAN LABEL DEFAULT
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabItem
                focused={focused}
                color={color}
                iconName={focused ? "map" : "map-outline"}
                iconSize={isLandscape && !isTabletLandscape ? 20 : 24}
                label="TRIPS" // <-- 2. TAMBAHKAN LABEL INI
                labelStyle={dynamicLabelStyle} // <-- 3. TAMBAHKAN STYLE INI
                indicatorStyle={dynamicIndicatorStyle}
                isLandscape={isLandscape}
                isTabletLandscape={isTabletLandscape}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="diagnostics"
          options={{
            title: "DIAGNOSTICS",
            tabBarLabel: () => null, // <-- 1. MATIKAN LABEL DEFAULT
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabItem
                focused={focused}
                color={color}
                iconName={focused ? "construct" : "construct-outline"}
                iconSize={isLandscape && !isTabletLandscape ? 20 : 24}
                label="DIAGNOSTICS" // <-- 2. TAMBAHKAN LABEL INI
                labelStyle={dynamicLabelStyle} // <-- 3. TAMBAHKAN STYLE INI
                indicatorStyle={dynamicIndicatorStyle}
                isLandscape={isLandscape}
                isTabletLandscape={isTabletLandscape}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="fuel"
          options={{
            title: "FUEL",
            tabBarLabel: () => null,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabItem
                focused={focused}
                color={color}
                iconSet="mci"
                iconName={focused ? "gas-station" : "gas-station-outline"}
                iconSize={isLandscape && !isTabletLandscape ? 20 : 24}
                label="FUEL"
                labelStyle={dynamicLabelStyle}
                indicatorStyle={dynamicIndicatorStyle}
                isLandscape={isLandscape}
                isTabletLandscape={isTabletLandscape}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  // 👇 TAMBAHKAN STYLE BARU INI (Pengganti semua style blur lama)
  solidContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    // Shadow untuk iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    // Elevation untuk Android / Head Unit
    elevation: 8,
  },

  // 👇 STYLE LAINNYA TETAP BIARKAN SAJA:
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -20,
    width: 12,
    height: 3,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 1,
    elevation: 2,
  },
});
