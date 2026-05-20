// components/trip/ShareModal.tsx
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
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
  const shareCardRef = useRef<ViewShot>(null);

  const downloadToDevice = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showAlert(
          "IZIN DITOLAK",
          "Izinkan akses galeri untuk menyimpan gambar.",
          "error",
        );
        return;
      }

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
      showAlert("ERROR", "Gagal menyimpan gambar ke galeri.", "error");
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
              onPress={() => setShareTheme("solid")}
            >
              <Text
                style={[
                  styles.themeBtnText,
                  shareTheme === "solid" && { color: "#111" },
                ]}
              >
                Ridecheck (Solid)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                shareTheme === "transparent" && styles.themeBtnActive,
              ]}
              onPress={() => setShareTheme("transparent")}
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

          <ViewShot
            ref={shareCardRef}
            options={{ format: "png", quality: 1.0 }}
            style={styles.captureArea}
          >
            <WebView
              source={{ html: getShareCardHtml(tripData, shareTheme) }}
              style={styles.shareWebView}
              scrollEnabled={false}
              bounces={false}
              originWhitelist={["*"]}
            />
          </ViewShot>

          <View style={styles.shareActionRow}>
            <TouchableOpacity style={styles.shareCancelBtn} onPress={onClose}>
              <Text style={styles.shareCancelText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareSubmitBtn}
              onPress={downloadToDevice}
            >
              <Ionicons
                name="download-outline"
                size={20}
                color="#111"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.shareSubmitText}>Simpan ke Galeri</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
