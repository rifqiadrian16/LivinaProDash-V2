// components/trip/SaveTripModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface SaveTripModalProps {
  visible: boolean;
  // UPDATE: onSave sekarang wajib menerima 2 parameter (nama & harga bensin)
  onSave: (tripName: string, fuelPrice: number) => void;
  onDiscard: () => void;
}

export default function SaveTripModal({
  visible,
  onSave,
  onDiscard,
}: SaveTripModalProps) {
  const [tripName, setTripName] = useState("");
  const [fuelPrice, setFuelPrice] = useState("10000");

  const inputRef = useRef<TextInput>(null);
  const cardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTripName("");
      setFuelPrice("10000"); // Reset ke default setiap kali modal dibuka
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(cardOffset, {
        // Naik sejauh tinggi keyboard + extra padding 24px
        toValue: e.endCoordinates.height - 350,
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
    // Konversi harga bensin dari string ke angka murni (kalau kosong, otomatis 10000)
    const finalPrice = parseInt(fuelPrice) || 10000;
    // Kirim 2 data ini ke useDashboard
    onSave(tripName.trim(), finalPrice);
  };

  const handleDiscard = () => {
    Keyboard.dismiss();
    onDiscard();
  };

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
              { transform: [{ translateY: cardOffset }] },
            ]}
          >
            {/* Icon */}
            <View style={styles.iconWrap}>
              <Ionicons name="flag" size={28} color="#00ffcc" />
            </View>

            <Text style={styles.title}>TRIP SELESAI</Text>
            <Text style={styles.subtitle}>Isi Nama Rute & BBM</Text>

            {/* Input Nama Rute */}
            <Text style={styles.labelInput}>Nama Perjalanan</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="cth: Pulang Kerja, Cikidang..."
              placeholderTextColor="#555"
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
                { marginBottom: 24, color: "#00ffcc", fontWeight: "bold" },
              ]}
              keyboardType="numeric"
              placeholder="10000"
              placeholderTextColor="#555"
              value={fuelPrice}
              onChangeText={(text) => {
                // Filter hanya angka yang boleh diketik
                const numericValue = text.replace(/[^0-9]/g, "");
                setFuelPrice(numericValue);
              }}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            {/* Tombol */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={handleDiscard}
              >
                <Text style={styles.discardText}>Buang</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Ionicons
                  name="save-outline"
                  size={16}
                  color="#111"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.saveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  container: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 255, 204, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  labelInput: {
    fontSize: 12,
    color: "#aaa",
    alignSelf: "flex-start",
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#ffffff",
    marginBottom: 4,
  },
  hint: {
    fontSize: 10,
    color: "#444",
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
    backgroundColor: "#00ffcc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 13,
  },
});
