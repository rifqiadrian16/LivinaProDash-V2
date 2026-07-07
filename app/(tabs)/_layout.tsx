// app/(tabs)/_layout.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
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
import { BLEProvider } from "../../components/BLEContext";
import { FuelProvider } from "../../components/FuelContext";
import { GaugeThemeProvider } from "../../components/GaugeThemeContext";
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
    // Meminta JS untuk menjalankan animasi tepat DI DEPAN frame berikutnya
    // agar tidak macet terbentur beban render halaman baru
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTabletLandscape = isLandscape && height >= 480;

  const getDynamicTabBarStyle = () => {
    if (isTabletLandscape) {
      return {
        height: 65,
        bottom: 12,
        left: 50,
        right: 50,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
      };
    }

    if (isLandscape) {
      return {
        height: 52,
        bottom: 8,
        left: 16,
        right: 16,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 4,
      };
    }

    return {
      height: 70,
      bottom: Platform.OS === "ios" ? 24 : 16,
      left: 20,
      right: 20,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 5 : 5,
    };
  };

  const getDynamicIndicatorStyle = () => {
    if (isTabletLandscape) {
      return {
        bottom: -10,
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

  useEffect(() => {
    initDB();
  }, []);

  // <-- Logika Immersive Mode sudah dihapus dari sini (dipindah ke Root)

  return (
    <AlertProvider>
      <BLEProvider>
        <FuelProvider>
          <GaugeThemeProvider>
            <Tabs
              screenOptions={{
                tabBarActiveTintColor: "#00FF88",
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
          </GaugeThemeProvider>
        </FuelProvider>
      </BLEProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  blurContainerWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    backgroundColor: "#222",
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
    // borderWidth: 1,
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
    bottom: -20,
    width: 12,
    height: 3,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
});
