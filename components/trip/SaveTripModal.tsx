// components/trip/SaveTripModal.tsx
import { AppColors } from "@/constants/appThemes";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import { useAppTheme } from "../AppThemeContext";

interface SaveTripModalProps {
  visible: boolean;
  onSave: (tripName: string, fuelPrice: number) => void;
  onDiscard: () => void;
}

export default function SaveTripModal({
  visible,
  onSave,
  onDiscard,
}: SaveTripModalProps) {
  const { colors } = useAppTheme();
  const styles = getSaveTripModalStyles(colors);
  const [tripName, setTripName] = useState("");
  const [fuelPrice, setFuelPrice] = useState("10000");

  const inputRef = useRef<TextInput>(null);
  const cardOffset = useRef(new Animated.Value(0)).current;

  // ===================================================================
  // DETEKTOR LAYAR (pola sama seperti ShareModal/SettingsModal)
  // ===================================================================
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTabletLandscape = isLandscape && height >= 480;
  const isPhoneLandscape = isLandscape && height < 480;

  // Ref supaya listener keyboard (subscribe sekali di mount) selalu baca
  // ukuran layar TERBARU, bukan nilai lama saat komponen pertama render.
  const windowHeightRef = useRef(height);
  windowHeightRef.current = height;
  const isPhoneLandscapeRef = useRef(isPhoneLandscape);
  isPhoneLandscapeRef.current = isPhoneLandscape;

  useEffect(() => {
    if (visible) {
      setTripName("");
      setFuelPrice("10000");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      // ✅ FIX: dulu hardcode "- 350" yang cuma pas di HP Portrait. Di HP
      // Landscape (tinggi layar ~360-420px), itu bikin card kegeser
      // kelewat jauh ke atas / kepotong. Sekarang dihitung proporsional
      // dari sisa ruang layar setelah dikurangi keyboard.
      const availableSpace = windowHeightRef.current - e.endCoordinates.height;
      const estimatedCardHeight = isPhoneLandscapeRef.current ? 300 : 420;
      const overflow = estimatedCardHeight - availableSpace;
      const shift = overflow > 0 ? overflow + 20 : 0;

      Animated.timing(cardOffset, {
        toValue: -shift,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(cardOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration : 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const handleSave = () => {
    Keyboard.dismiss();
    const finalPrice = parseInt(fuelPrice) || 10000;
    onSave(tripName.trim(), finalPrice);
  };

  const handleDiscard = () => {
    Keyboard.dismiss();
    onDiscard();
  };

  // ✅ Card dibatasi lebar maksimum di Tablet/HU supaya nggak melar penuh
  // layar horizontal, dan dibatasi tinggi + dibungkus ScrollView khusus
  // di HP Landscape supaya nggak overflow/kepotong navigasi sistem.
  const cardMaxWidth = isTabletLandscape ? 420 : isLandscape ? 380 : undefined;
  const cardMaxHeight = isPhoneLandscape ? height * 0.92 : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDiscard}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.container,
              cardMaxWidth ? { maxWidth: cardMaxWidth } : null,
              cardMaxHeight ? { maxHeight: cardMaxHeight } : null,
              {
                transform: [{ translateY: cardOffset }],
                padding: isPhoneLandscape ? 17 : 25,
              },
            ]}
          >
            <ScrollView
              style={{ width: "100%" }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: "center" }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconWrap,
                  isPhoneLandscape && {
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    marginBottom: 8,
                  },
                ]}
              >
                <Ionicons
                  name="flag"
                  size={isPhoneLandscape ? 22 : 28}
                  color={colors.accent}
                />
              </View>

              <Text
                style={[styles.title, isPhoneLandscape && { fontSize: 14 }]}
              >
                TRIP SELESAI
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  isPhoneLandscape && { marginBottom: 10 },
                ]}
              >
                Isi Nama Rute & BBM
              </Text>

              {/* Input Nama Rute */}
              <Text style={styles.labelInput}>Nama Perjalanan</Text>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  isPhoneLandscape && { paddingVertical: 9 },
                ]}
                placeholder="cth: Pulang Kerja"
                placeholderTextColor={colors.textFaint}
                value={tripName}
                onChangeText={setTripName}
                maxLength={50}
                returnKeyType="next"
              />
              <Text style={styles.hint}>Kosongkan untuk nama otomatis</Text>

              {/* Input Harga Bensin */}
              <Text style={styles.labelInput}>Harga Bensin (Rp / Liter)</Text>
              <TextInput
                style={[
                  styles.input,
                  isPhoneLandscape && { paddingVertical: 9 },
                  {
                    marginBottom: isPhoneLandscape ? 14 : 24,
                    color: colors.accent,
                    fontWeight: "bold",
                  },
                ]}
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor={colors.textFaint}
                value={fuelPrice}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, "");
                  setFuelPrice(numericValue);
                }}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {/* Tombol */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[
                    styles.discardBtn,
                    isPhoneLandscape && { paddingVertical: 10 },
                  ]}
                  onPress={handleDiscard}
                >
                  <Text style={styles.discardText}>Buang</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    isPhoneLandscape && { paddingVertical: 10 },
                  ]}
                  onPress={handleSave}
                >
                  <Ionicons
                    name="save-outline"
                    size={16}
                    color={colors.label}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.saveText}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const getSaveTripModalStyles = (c: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    container: {
      width: "100%",
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${c.accent}1A`, // aksen dengan alpha ~10%
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: c.text,
      letterSpacing: 2,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 12,
      color: c.textMuted,
      marginBottom: 20,
      textAlign: "center",
    },
    labelInput: {
      fontSize: 12,
      color: c.textMuted,
      alignSelf: "flex-start",
      marginBottom: 6,
      fontWeight: "600",
    },
    input: {
      width: "100%",
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: c.text,
      marginBottom: 4,
    },
    hint: {
      fontSize: 10,
      color: c.textFaint,
      alignSelf: "flex-start",
      marginBottom: 16,
    },
    btnRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    discardBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#ff4444",
      alignItems: "center",
    },
    discardText: {
      color: "#ff4444",
      fontWeight: "700",
      fontSize: 13,
    },
    saveBtn: {
      flex: 2,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: c.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    saveText: {
      color: c.label,
      fontWeight: "800",
      fontSize: 13,
    },
  });
