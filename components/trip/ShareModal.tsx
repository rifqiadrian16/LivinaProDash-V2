// components/trip/ShareModal.tsx
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
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

      // Delay ekstra agar WebView benar-benar selesai paint setelah signal
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

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.shareModalOverlay}>
        <View style={styles.shareModalContainer}>
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

          {/* Indikator loading peta */}
          {!isMapReady && (
            <View
              style={{
                position: "absolute",
                top: 160,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <ActivityIndicator size="small" color="#FC4C02" />
            </View>
          )}

          <ViewShot
            ref={shareCardRef}
            options={{ format: "png", quality: 1.0, result: "tmpfile" }}
            style={{ width: 270, height: 460, overflow: "hidden" }}
          >
            <WebView
              source={{ html: getShareCardHtml(tripData, shareTheme) }}
              style={{
                width: 270,
                height: 460,
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

          <View style={styles.shareActionRow}>
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
        </View>
      </View>
    </Modal>
  );
}
