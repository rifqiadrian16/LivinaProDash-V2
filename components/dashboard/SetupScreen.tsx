import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAppTheme } from "../../components/AppThemeContext";
import { getDashboardStyles } from "../../styles/dashboard.styles";

// [DIKEMBALIKAN] Prop onSecretTap wajib ada untuk bypass ke Dashboard!
export default function SetupScreen({
  onConnect,
  isConnecting,
  onSecretTap,
}: any) {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTabletLandscape = isLandscape && height >= 480;
  // HP landscape (bukan tablet/HU) -> paling rawan ketutup secretZone & tab bar
  const isPhoneLandscape = isLandscape && height < 480;

  // ✅ Sisakan ruang ekstra di bawah supaya tombol aman dari navigasi
  // sistem HP maupun tab bar melayang di bawah.
  const bottomClearance = isPhoneLandscape ? 90 : isLandscape ? 110 : 40;

  // Ikon dan Judul diperbesar agar tidak kekecilan di HP Landscape
  const iconSize = isPhoneLandscape ? 64 : isTabletLandscape ? 90 : 80;
  const titleFontSize = isPhoneLandscape ? 24 : isTabletLandscape ? 32 : 28;

  const instructionText = (
    <Text
      style={{
        color: "#888",
        textAlign: isPhoneLandscape ? "left" : "center",
        lineHeight: 22,
        fontSize: 14,
      }}
    >
      1. Nyalakan mesin atau kontak mobil ke posisi ON.{"\n"}
      2. Pastikan Modul Livina ProDash sudah menyala.
    </Text>
  );

  const connectButton = (
    <TouchableOpacity
      style={[
        styles.connectBtn,
        isPhoneLandscape && { paddingVertical: 16, width: "100%" },
      ]}
      onPress={onConnect}
      disabled={isConnecting}
    >
      {isConnecting ? (
        <ActivityIndicator color="#000" />
      ) : (
        <Text
          style={[styles.connectBtnText, isPhoneLandscape && { fontSize: 15 }]}
        >
          HUBUNGKAN KE MODUL
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          paddingLeft: Math.max(insets.left, insets.right),
          paddingRight: Math.max(insets.left, insets.right),
        },
      ]}
      edges={["top", "bottom"]}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: isTabletLandscape ? 60 : 20,
          paddingTop: isPhoneLandscape ? 10 : 60,
          paddingBottom: bottomClearance,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isPhoneLandscape ? (
          // =========================================================
          // LAYOUT HP LANDSCAPE: 2 kolom sejajar
          // =========================================================
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              {/* [DIKEMBALIKAN] TouchableOpacity dengan onSecretTap aktif kembali! */}
              <TouchableOpacity activeOpacity={1} onPress={onSecretTap}>
                <Ionicons
                  name="car-sport"
                  size={iconSize}
                  color={colors.accent}
                />
              </TouchableOpacity>

              <Text
                style={[
                  styles.setupTitle,
                  { fontSize: titleFontSize, marginTop: 8 },
                ]}
              >
                LIVINA PRODASH
              </Text>
              <Text style={[styles.setupSubtitle, { fontSize: 13 }]}>
                Sistem Telemetri
              </Text>
            </View>

            <View style={{ flex: 1.2 }}>
              {instructionText}
              <View style={{ marginTop: 14 }}>{connectButton}</View>
            </View>
          </View>
        ) : (
          // =========================================================
          // LAYOUT PORTRAIT & TABLET/HU LANDSCAPE
          // =========================================================
          <>
            <View style={styles.headerCentered}>
              {/* [DIKEMBALIKAN] TouchableOpacity dengan onSecretTap aktif kembali! */}
              <TouchableOpacity activeOpacity={1} onPress={onSecretTap}>
                <Ionicons
                  name="car-sport"
                  size={iconSize}
                  color={colors.accent}
                />
              </TouchableOpacity>

              <Text style={[styles.setupTitle, { fontSize: titleFontSize }]}>
                LIVINA PRODASH
              </Text>
              <Text style={styles.setupSubtitle}>Sistem Telemetri</Text>
            </View>

            <View
              style={{
                marginTop: isTabletLandscape ? 30 : 50,
                alignItems: "center",
                paddingHorizontal: 20,
                width: isTabletLandscape ? "60%" : "100%",
                alignSelf: "center",
              }}
            >
              <View style={{ marginBottom: 20, width: "100%" }}>
                {instructionText}
              </View>
              {connectButton}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
