import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { WebView } from "react-native-webview";
import { tripStyles as styles } from "../../styles/trip.styles";
import { getShareCardHtml } from "../../utils/tripTemplates";

interface ShareModalProps {
  visible: boolean;
  tripData: any;
  onClose: () => void;
  showAlert: (title: string, msg: string, type: string) => void;
}

export default function ShareModal({
  visible,
  tripData,
  onClose,
  showAlert,
}: ShareModalProps) {
  const [shareTheme, setShareTheme] = useState<"solid" | "transparent">(
    "solid",
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const shareCardRef = useRef<ViewShot>(null);

  // ===================================================================
  // 1. DETEKTOR LAYAR
  // ===================================================================
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // HANYA Tablet/Head Unit yang dihitung sebagai Landscape asli (Belah 2 Kolom)
  const isTabletLandscape = isLandscape && height >= 480;

  // HP Landscape (height < 480) otomatis akan digabung ke logika Portrait!
  const isPhoneLandscape = isLandscape && height < 480;

  // ===================================================================
  // 2. DIMENSI KARTU SELALU FULL PORTRAIT (270 x 460 px)
  // ===================================================================
  // Karena HP Landscape sekarang pakai tata letak Portrait (scroll),
  // kita tidak perlu mengerdilkan ukuran kartunya lagi!
  const cardWidth = 270;
  const cardHeight = 460;

  useEffect(() => {
    if (!visible) {
      setIsMapReady(false);
      setIsSaving(false);
    }
  }, [visible]);

  const downloadToDevice = async () => {
    if (!isMapReady) {
      showAlert("TUNGGU", "Peta masih dimuat, coba lagi sebentar.", "error");
      return;
    }

    try {
      setIsSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "IZIN DITOLAK",
          "Izinkan akses galeri untuk menyimpan gambar.",
          "error",
        );
        setIsSaving(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (shareCardRef.current?.capture) {
        const uri = await shareCardRef.current.capture();
        await MediaLibrary.saveToLibraryAsync(uri);
        showAlert(
          "TERSIMPAN!",
          "Gambar berhasil disimpan ke galeri.",
          "success",
        );
      }
    } catch (err) {
      showAlert("ERROR", "Gagal menyimpan gambar: " + String(err), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!tripData) return null;

  // ===================================================================
  // FUNGSI PEMBANTU: BAGIAN KONTROL TEMA
  // ===================================================================
  const renderThemeSelector = () => (
    <View style={{ width: "100%", marginBottom: 12 }}>
      <Text style={styles.shareModalTitle}>Pilih Tema Kartu</Text>

      <View style={styles.themeToggleContainer}>
        <TouchableOpacity
          style={[
            styles.themeBtn,
            shareTheme === "solid" && styles.themeBtnActive,
          ]}
          onPress={() => {
            setShareTheme("solid");
            setIsMapReady(false);
          }}
        >
          <Text
            style={[
              styles.themeBtnText,
              shareTheme === "solid" && { color: "#111" },
            ]}
          >
            Solid
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.themeBtn,
            shareTheme === "transparent" && styles.themeBtnActive,
          ]}
          onPress={() => {
            setShareTheme("transparent");
            setIsMapReady(false);
          }}
        >
          <Text
            style={[
              styles.themeBtnText,
              shareTheme === "transparent" && { color: "#111" },
            ]}
          >
            Glow (Transparent)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ===================================================================
  // FUNGSI PEMBANTU: BAGIAN TOMBOL AKSI (BATAL & SIMPAN)
  // ===================================================================
  const renderActionButtons = () => (
    <View
      style={[
        styles.shareActionRow,
        { width: "100%" },
        // Kalau di Tablet HU, tombol taruh di paling bawah kiri
        isTabletLandscape && { marginTop: "auto", paddingTop: 10 },
      ]}
    >
      <TouchableOpacity style={styles.shareCancelBtn} onPress={onClose}>
        <Text style={styles.shareCancelText}>Batal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.shareSubmitBtn,
          (!isMapReady || isSaving) && { opacity: 0.5 },
        ]}
        onPress={downloadToDevice}
        disabled={!isMapReady || isSaving}
      >
        {isSaving ? (
          <ActivityIndicator
            size="small"
            color="#111"
            style={{ marginRight: 6 }}
          />
        ) : (
          <Ionicons
            name="download-outline"
            size={20}
            color="#111"
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={styles.shareSubmitText}>
          {isSaving
            ? "Menyimpan..."
            : isMapReady
              ? "Simpan ke Galeri"
              : "Memuat Peta..."}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ===================================================================
  // FUNGSI PEMBANTU: PREVIEW KARTU (VIEWSHOT + WEBVIEW)
  // ===================================================================
  const renderCardPreview = () => (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 12,
        position: "relative",
      }}
    >
      {/* SPINNER OTOMATIS DI TENGAH */}
      {!isMapReady && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              backgroundColor: "rgba(0,0,0,0.3)",
              borderRadius: 16,
            },
          ]}
        >
          <ActivityIndicator size="large" color="#00ff88" />
          <Text
            style={{
              color: "#fff",
              fontSize: 10,
              fontWeight: "bold",
              marginTop: 8,
            }}
          >
            MEMUAT RUTE...
          </Text>
        </View>
      )}

      <ViewShot
        ref={shareCardRef}
        options={{ format: "png", quality: 1.0, result: "tmpfile" }}
        style={{
          width: cardWidth,
          height: cardHeight,
          overflow: "hidden",
          borderRadius: 16,
          backgroundColor: "#121212",
        }}
      >
        <WebView
          source={{ html: getShareCardHtml(tripData, shareTheme) }}
          style={{
            width: cardWidth,
            height: cardHeight,
            backgroundColor: "transparent",
          }}
          scrollEnabled={false}
          bounces={false}
          originWhitelist={["*"]}
          androidLayerType="software"
          onMessage={(e) => {
            if (e.nativeEvent.data === "MAP_READY") {
              setIsMapReady(true);
            }
          }}
        />
      </ViewShot>
    </View>
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.shareModalOverlay}>
        <View
          style={[
            styles.shareModalContainer,
            // STRUKTUR KEMASAN: Hanya Tablet HU yang pakai lebar horizontal[cite: 6]
            isTabletLandscape
              ? {
                  flexDirection: "row",
                  width: 600,
                  maxWidth: "95%",
                  paddingVertical: 20,
                  paddingHorizontal: 24,
                  gap: 20,
                  alignItems: "center",
                }
              : {
                  // HP Portrait & HP Landscape dipaksa masuk ke sini![cite: 6]
                  width: "88%",
                  maxWidth: 380,
                  maxHeight: isPhoneLandscape ? "90%" : undefined, // Agar tidak nabrak atas-bawah saat HP miring[cite: 6]
                },
          ]}
        >
          {isTabletLandscape ? (
            /* --- MODE 1: KHUSUS TABLET & HEAD UNIT (BELAH 2 KOLOM) --- */
            <>
              {/* KOLOM KIRI: KONTROL TEMA & TOMBOL AKSI */}
              <View
                style={{
                  flex: 1,
                  height: cardHeight,
                  justifyContent: "space-between",
                }}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  {renderThemeSelector()}
                </ScrollView>
                {renderActionButtons()}
              </View>

              {/* KOLOM KANAN: PREVIEW KARTU (FULL SIZE 270x460) */}
              <View style={{ justifyContent: "center", alignItems: "center" }}>
                {renderCardPreview()}
              </View>
            </>
          ) : (
            /* --- MODE 2: HP PORTRAIT & HP LANDSCAPE (ATAS KE BAWAH) --- */
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ width: "100%" }}
              contentContainerStyle={{
                alignItems: "center",
                paddingBottom: 10,
              }}
            >
              {renderThemeSelector()}
              {renderCardPreview()}
              {renderActionButtons()}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
