import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TerminalModalProps {
  visible: boolean;
  onClose: () => void;
  logs: string[];
  onSend: (cmd: string) => void;
}

export default function TerminalModal({
  visible,
  onClose,
  logs,
  onSend,
}: TerminalModalProps) {
  const [inputText, setInputText] = useState("");
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>root@livina-ecu:~#</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#ff4444" />
          </TouchableOpacity>
        </View>

        {/* LOG AREA */}
        <ScrollView
          style={styles.logArea}
          ref={(scrollView) => scrollView?.scrollToEnd({ animated: true })}
        >
          {logs.map((log, index) => (
            <Text
              key={index}
              style={[
                styles.logText,
                { color: log.startsWith("$") ? "#fff" : "#00ff88" },
              ]}
            >
              {log}
            </Text>
          ))}
        </ScrollView>

        {/* INPUT AREA */}
        <View style={styles.inputArea}>
          <Text style={styles.prompt}>$</Text>
          <TextInput
            style={styles.input}
            placeholder="Ketik PID (Contoh: 2211150401)"
            placeholderTextColor="#005522"
            autoCapitalize="characters"
            autoCorrect={false}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => {
              if (!inputText.trim()) return; // Jangan kirim kalau kosong
              onSend(inputText); // Kirim isinya
              setInputText(""); // Bersihkan input setelah enter!
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 15, paddingTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  headerTitle: {
    color: "#00ff88",
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "monospace",
  },
  logArea: { flex: 1, marginBottom: 10 },
  logText: { fontFamily: "monospace", fontSize: 14, marginBottom: 4 },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#333",
    paddingTop: 10,
    paddingBottom: 10,
  },
  prompt: {
    color: "#fff",
    fontFamily: "monospace",
    marginRight: 8,
    fontSize: 16,
  },
  input: { flex: 1, color: "#00ff88", fontFamily: "monospace", fontSize: 16 },
});
