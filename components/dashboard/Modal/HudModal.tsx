import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../../../components/AppThemeContext";
import { getDashboardStyles } from "../../../styles/dashboard.styles";

// +++ PASTIKAN PATH IMPORT HOOK INI SESUAI DENGAN STRUKTUR FOLDER MAS +++
// Jika path-nya beda, sesuaikan titik-titiknya (../)
import { useGearRatio } from "../../../hooks/useGearRatio";

export default function HudModal({
  visible,
  onClose,
  onTap,
  tapCount,
  data,
  transmission,
  instFuel,
  avgFuel,
  mirrorEnabled = true,
  onToggleMirror,
}: any) {
  const { colors } = useAppTheme();
  const styles = getDashboardStyles(colors);
  // ================= PANGGIL JALUR NINJA DI SINI =================
  // Kita suapkan data RPM (data.r) dan Speed (data.s) dari sensor HUD
  const estimatedGear = useGearRatio(data.r, data.s, transmission);
  // ===============================================================

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onTap}
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* VISUAL FEEDBACK: Ketuk 1x untuk keluar */}
        {/* =====================================================
            OVERLAY KONTROL (HANYA MUNCUL JIKA LAYAR DIKETUK 1X)
            ===================================================== */}
        {tapCount === 1 && (
          <>
            {/* Teks Petunjuk Keluar (Tengah Atas) */}
            <View
              style={{
                position: "absolute",
                top: 50,
                alignSelf: "center",
                backgroundColor: "rgba(255,255,255,0.15)", // Sedikit lebih terang agar jelas
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
                zIndex: 100,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
                Ketuk lagi untuk keluar
              </Text>
            </View>

            {/* Tombol Mirror (Dipindah ke Pojok Kanan Atas) */}
            {onToggleMirror && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={(e) => {
                  // Cegah event tap ini ikut kehitung sebagai "ketuk keluar HUD"
                  e.stopPropagation();
                  onToggleMirror();
                }}
                style={{
                  position: "absolute",
                  top: 50, // Sejajar dengan teks keluar
                  right: 30, // Aman di pojok kanan atas
                  zIndex: 100,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.15)",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.3)",
                  gap: 6,
                }}
              >
                <Ionicons
                  name="repeat-outline"
                  size={16} // Ikon sedikit dibesarkan
                  color={mirrorEnabled ? "#00ffcc" : "#fff"}
                />
                <Text
                  style={{
                    color: mirrorEnabled ? "#00ffcc" : "#fff",
                    fontSize: 10,
                    fontWeight: "bold",
                    letterSpacing: 1,
                  }}
                >
                  {mirrorEnabled ? "MIRROR" : "NORMAL"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* =====================================================
        KONTAINER CERMIN (MIRRORING) & RESPONSIVE LAYOUT
        ===================================================== */}
        <View
          style={{
            transform: [{ scaleX: mirrorEnabled ? -1 : 1 }],
            width: "100%", // Diperluas ke 100% dari sebelumnya 92%
            flex: 1, // Mengisi seluruh ruang vertikal
            justifyContent: "space-between", // Tersebar rata atas, tengah, bawah
            paddingVertical: 20, // Bantalan atas-bawah
            paddingHorizontal: 30, // Bantalan kiri-kanan agar tidak nabrak pinggir layar
          }}
        >
          {/* -------------------------------------------------
          BAGIAN ATAS: RPM BAR TEGAS
          ------------------------------------------------- */}
          <View
            style={{
              width: "100%",
              marginBottom: 10, // Margin disesuaikan karena sudah pakai space-between
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "100%",
                height: 50,
                transform: [{ skewX: "-10deg" }],
              }}
            >
              {/* Background track */}
              <View
                style={{
                  position: "absolute",
                  width: "100%",
                  height: 8,
                  top: 30,
                  flexDirection: "row",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: "81.25%",
                    height: "100%",
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                />
                <View
                  style={{
                    width: "18.75%",
                    height: "100%",
                    backgroundColor: "rgba(255,50,50,0.15)",
                  }}
                />
              </View>

              {/* Fill bars */}
              <View
                style={{
                  position: "absolute",
                  top: 30,
                  left: 0,
                  height: 8,
                  flexDirection: "row",
                  width: "100%",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${(Math.min(data.r, 6500) / 8000) * 100}%`,
                    backgroundColor: "#ffffff",
                    borderTopLeftRadius: 1,
                    borderBottomLeftRadius: 1,
                    shadowColor: "#ffffff",
                    shadowOpacity: data.r > 0 ? 0.6 : 0,
                    shadowRadius: 8,
                    elevation: data.r > 0 ? 6 : 0,
                    opacity: data.r > 0 ? 1 : 0.15,
                  }}
                />

                {data.r > 6500 && (
                  <View
                    style={{
                      height: "100%",
                      width: `${(Math.min(data.r - 6500, 1500) / 8000) * 100}%`,
                      backgroundColor: "#ff3333",
                      borderTopRightRadius: 1,
                      borderBottomRightRadius: 1,
                      shadowColor: "#ff3333",
                      shadowOpacity: 0.8,
                      shadowRadius: 8,
                      elevation: 6,
                    }}
                  />
                )}
              </View>

              {/* Marker setiap 1000 RPM (Ditebalkan & dipanjangkan) */}
              {[...Array(9)].map((_, i) => (
                <View
                  key={`marker-${i}`}
                  style={{
                    position: "absolute",
                    left: `${(i / 8) * 100}%`,
                    top: 20, // Dinaikkan
                    width: 2, // Dipertebal
                    height: 20, // Diperpanjang
                    backgroundColor:
                      data.r >= i * 1000
                        ? i >= 7
                          ? "#ff4444"
                          : "#ffffff"
                        : "rgba(255,255,255,0.1)",
                    transform: [{ skewX: "10deg" }],
                  }}
                />
              ))}

              {/* Angka RPM */}
              {[...Array(9)].map((_, i) => (
                <Text
                  key={`num-${i}`}
                  style={{
                    position: "absolute",
                    left: `${(i / 8) * 100}%`,
                    top: 0, // Disesuaikan dengan tinggi marker baru
                    color:
                      data.r >= i * 1000
                        ? i >= 7
                          ? "#ff4444"
                          : "#ffffff"
                        : "rgba(255,255,255,0.2)",
                    fontSize: 14, // Sedikit dibesarkan
                    fontWeight: "900",
                    transform: [{ skewX: "10deg" }, { translateX: -5 }],
                    fontFamily: "monospace",
                  }}
                >
                  {i}
                </Text>
              ))}

              {/* Label ×1000 rpm */}
              <Text
                style={{
                  position: "absolute",
                  right: 0,
                  top: 45,
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 10,
                  fontWeight: "bold",
                  transform: [{ skewX: "10deg" }],
                  letterSpacing: 1,
                }}
              >
                ×1000 rpm
              </Text>

              {/* Redline zone pembatas */}
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 20,
                  width: "18.75%",
                  height: 24,
                  borderLeftWidth: 1,
                  borderLeftColor: "rgba(255,50,50,0.5)",
                }}
              />
            </View>
          </View>

          {/* -------------------------------------------------
          BAGIAN TENGAH: KECEPATAN BESAR
          ------------------------------------------------- */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center", // Rata tengah
              justifyContent: "space-between", // Tersebar ke ujung
              width: "100%",
              flex: 1, // Mengisi sisa ruang kosong di tengah
            }}
          >
            {/* KIRI: INDIKATOR GIGI */}
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 50,
                  fontWeight: "900",
                  letterSpacing: -2,
                  opacity: 0.9,
                }}
              >
                {estimatedGear}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 10,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginTop: -2,
                }}
              >
                GEAR
              </Text>
            </View>

            {/* TENGAH: SPEED */}
            <View
              style={{
                flex: 2.5,
                flexDirection: "row",
                alignItems: "baseline",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: data.s > 100 ? "#ff4444" : "#ffffff",
                  fontSize: 160, // Sedikit dibesarkan
                  fontWeight: "900",
                  letterSpacing: -8,
                  lineHeight: 160,
                  textShadowColor: "rgba(255,255,255,0.1)",
                  textShadowRadius: 12,
                }}
              >
                {data.s}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 24, // Sedikit dibesarkan
                  fontWeight: "bold",
                  marginLeft: 8,
                  letterSpacing: 1,
                }}
              >
                KM/H
              </Text>
            </View>

            {/* KANAN: KOSONG (Untuk penyeimbang Flexbox) */}
            <View style={{ flex: 1 }} />
          </View>

          {/* -------------------------------------------------
          BAGIAN BAWAH: INFO GRID
          ------------------------------------------------- */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between", // Tersebar jauh ke ujung kiri & kanan
              alignItems: "flex-end", // Rata bawah
              width: "100%",
            }}
          >
            {/* KIRI: FUEL */}
            <View style={{ flex: 1, alignItems: "flex-start" }}>
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.hudLabel}>INST</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={styles.hudValueBig}>{instFuel.toFixed(1)}</Text>
                  <Text style={styles.hudUnit}>KM/L</Text>
                </View>
              </View>
              <View>
                <Text style={styles.hudLabel}>AVG</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                  <Text style={styles.hudValueBig}>{avgFuel.toFixed(1)}</Text>
                  <Text style={styles.hudUnit}>KM/L</Text>
                </View>
              </View>
            </View>

            {/* TENGAH: TELEMETRI */}
            <View
              style={{ flex: 1.5, alignItems: "center", paddingBottom: 10 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-evenly",
                  width: "100%",
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.hudLabel}>VOLT</Text>
                  <Text
                    style={[
                      styles.hudValueSmall,
                      {
                        color:
                          data.v < 12.0 ? "#ff4444" : "rgba(255,255,255,0.85)",
                      },
                    ]}
                  >
                    {data.v.toFixed(1)}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.hudLabel}>TEMP</Text>
                  <Text
                    style={[
                      styles.hudValueSmall,
                      {
                        color:
                          data.t > 100 ? "#ff4444" : "rgba(255,255,255,0.85)",
                      },
                    ]}
                  >
                    {data.t}°
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.hudLabel}>THR</Text>
                  <Text
                    style={[
                      styles.hudValueSmall,
                      {
                        color:
                          data.th > 80 ? "#ff4444" : "rgba(255,255,255,0.85)",
                      },
                    ]}
                  >
                    {data.th}%
                  </Text>
                </View>
              </View>

              {/* SHIFT LIGHT (DIPINDAHKAN KE TENGAH BAWAH AGAR RAPI) */}
              {transmission === "manual" && (
                <View
                  style={{ marginTop: 25, alignItems: "center", width: "100%" }}
                >
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {[4500, 5000, 5500, 6000, 6500].map((threshold, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: 14, // Diperbesar
                          height: 14, // Diperbesar
                          borderRadius: 7,
                          backgroundColor:
                            data.r >= threshold
                              ? idx >= 3
                                ? "#ff3333"
                                : "rgba(255,255,255,0.6)"
                              : "rgba(255,255,255,0.08)",
                          shadowColor:
                            data.r >= threshold ? "#ff4444" : "transparent",
                          shadowOpacity: data.r >= threshold ? 0.8 : 0,
                          shadowRadius: data.r >= threshold ? 6 : 0,
                        }}
                      />
                    ))}
                  </View>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.2)",
                      fontSize: 8,
                      fontWeight: "bold",
                      letterSpacing: 2,
                      marginTop: 6,
                    }}
                  >
                    SHIFT
                  </Text>
                </View>
              )}
            </View>

            {/* KANAN: TRIM */}
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.hudLabel}>STFT</Text>
                <Text
                  style={[
                    styles.hudValueSmall,
                    {
                      color:
                        Math.abs(data.st) > 10
                          ? "#ff4444"
                          : "rgba(255,255,255,0.85)",
                    },
                  ]}
                >
                  {data.st > 0 ? "+" : ""}
                  {data.st.toFixed(1)}%
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  marginBottom: 8,
                }}
              >
                <Text style={styles.hudLabel}>LTFT</Text>
                <Text
                  style={[
                    styles.hudValueSmall,
                    {
                      color:
                        Math.abs(data.lt) > 10
                          ? "#ff4444"
                          : "rgba(255,255,255,0.85)",
                    },
                  ]}
                >
                  {data.lt > 0 ? "+" : ""}
                  {data.lt.toFixed(1)}%
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <Text style={styles.hudLabel}>IGN</Text>
                <Text style={styles.hudValueSmall}>{data.tm}°</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
