import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface ConnectingEcuScreenProps {
  onOpenSettings: () => void;
  onDisconnect: () => void;
}

export default function ConnectingEcuScreen({
  onOpenSettings,
  onDisconnect,
}: ConnectingEcuScreenProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 25,
        backgroundColor: "#111",
      }}
    >
      <ActivityIndicator size="large" color="#00ff88" />
      <Text
        style={{
          color: "#fff",
          fontSize: 18,
          fontWeight: "bold",
          marginTop: 25,
          textAlign: "center",
        }}
      >
        Menghubungkan ke ECU Mobil...
      </Text>
      <Text
        style={{
          color: "#777",
          textAlign: "center",
          marginTop: 12,
          lineHeight: 24,
          paddingHorizontal: 20,
        }}
      >
        Koneksi ke modul aman. Sekarang ESP32 sedang mencoba membangun jembatan
        data ke mesin mobil.{"\n"}
        {"\n"}
        <Text style={{ color: "#00ff88", fontWeight: "bold" }}>
          ⚠️ Pastikan Kunci Kontak Mobil Posisi ON!
        </Text>
      </Text>

      {/* PINTU DARURAT ANTI-LOCK */}
      <View style={{ flexDirection: "row", gap: 15, marginTop: 40 }}>
        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: "#333",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#555",
          }}
          onPress={onOpenSettings}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>
            ⚙️ Pengaturan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: "#c0392b",
            borderRadius: 8,
          }}
          onPress={onDisconnect}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Batal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
