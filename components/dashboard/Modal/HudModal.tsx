import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../../../styles/dashboard.styles";

export default function HudModal({
  visible,
  onClose,
  onTap,
  tapCount,
  data,
  transmission,
  instFuel,
  avgFuel,
}: any) {
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
        {tapCount === 1 && (
          <View
            style={{
              position: "absolute",
              top: 50,
              alignSelf: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
              zIndex: 100,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>
              Ketuk lagi untuk keluar
            </Text>
          </View>
        )}

        {/* =====================================================
        KONTAINER CERMIN (MIRRORING)
        ===================================================== */}
        <View style={{ transform: [{ scaleX: -1 }], width: "92%" }}>
          {/* -------------------------------------------------
          BAGIAN ATAS: RPM BAR TEGAS (MONOKROM + REDLINE)
          ------------------------------------------------- */}
          <View
            style={{ width: "100%", marginBottom: 30, alignItems: "center" }}
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
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: 1,
                  top: 30,
                }}
              />

              {/* Fill bar — SEMUA PUTIH, kecuali redline MERAH */}
              <View
                style={{
                  position: "absolute",
                  width: `${Math.min((data.r / 8000) * 100, 100)}%`,
                  height: 8,
                  top: 30,
                  borderRadius: 1,
                  overflow: "hidden",
                  shadowColor: "#ffffff",
                  shadowOpacity: data.r > 0 ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: data.r > 0 ? 6 : 0,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: data.r > 6500 ? "#ff3333" : "#ffffff",
                    opacity: data.r > 0 ? 1 : 0.15,
                  }}
                />
              </View>

              {/* Marker setiap 1000 RPM — SEMUA PUTIH PUDAR */}
              {[...Array(9)].map((_, i) => (
                <View
                  key={`marker-${i}`}
                  style={{
                    position: "absolute",
                    left: `${(i / 8) * 100}%`,
                    top: 24,
                    width: 1.5,
                    height: 16,
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

              {/* Angka RPM 0-8 — SEMUA PUTIH PUDAR, aktif PUTIH TERANG */}
              {[...Array(9)].map((_, i) => (
                <Text
                  key={`num-${i}`}
                  style={{
                    position: "absolute",
                    left: `${(i / 8) * 100}%`,
                    top: 0,
                    color:
                      data.r >= i * 1000
                        ? i >= 7
                          ? "#ff4444"
                          : "#ffffff"
                        : "rgba(255,255,255,0.2)",
                    fontSize: 13,
                    fontWeight: "900",
                    transform: [{ skewX: "10deg" }, { translateX: -5 }],
                    fontFamily: "monospace",
                  }}
                >
                  {i}
                </Text>
              ))}

              {/* Label ×1000 rpm — PUTIH PUDAR */}
              <Text
                style={{
                  position: "absolute",
                  right: 0,
                  top: 15,
                  color: "rgba(255,255,255,0.25)",
                  fontSize: 9,
                  fontWeight: "bold",
                  transform: [{ skewX: "10deg" }],
                  letterSpacing: 1,
                }}
              >
                ×1000 rpm
              </Text>

              {/* Redline zone — GARIS MERAH TIPIS SAJA */}
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 24,
                  width: "12.5%",
                  height: 20,
                  borderLeftWidth: 1,
                  borderLeftColor: "rgba(255,50,50,0.3)",
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
              alignItems: "flex-end",
              justifyContent: "center",
              marginBottom: 25,
              width: "100%",
            }}
          >
            {/* KIRI: TRANSMISI */}
            <View
              style={{ flex: 1, alignItems: "flex-start", paddingBottom: 12 }}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 50,
                  fontWeight: "900",
                  letterSpacing: -2,
                  opacity: 0.9,
                }}
              >
                {transmission === "manual" ? "M" : "D"}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 9,
                  fontWeight: "bold",
                  letterSpacing: 2,
                  marginTop: -2,
                }}
              >
                {transmission === "manual" ? "MANUAL" : "AUTO"}
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
                  fontSize: 150,
                  fontWeight: "900",
                  letterSpacing: -8,
                  lineHeight: 150,
                  textShadowColor: "rgba(255,255,255,0.1)",
                  textShadowRadius: 12,
                }}
              >
                {data.s}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginLeft: 8,
                  letterSpacing: 1,
                }}
              >
                KM/H
              </Text>
            </View>

            {/* KANAN: KOSONG */}
            <View style={{ flex: 1 }} />
          </View>

          {/* -------------------------------------------------
          BAGIAN BAWAH: INFO GRID (SEMUA PUTIH, WARNING MERAH)
          ------------------------------------------------- */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
              paddingHorizontal: 5,
            }}
          >
            {/* KIRI: FUEL */}
            <View style={{ alignItems: "flex-start" }}>
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
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{ flexDirection: "row", gap: 24 }}>
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
            </View>

            {/* KANAN: TRIM */}
            <View style={{ alignItems: "flex-end" }}>
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

          {/* -------------------------------------------------
          SHIFT LIGHT (MANUAL ONLY) — PUTIH PUDAR → MERAH
          ------------------------------------------------- */}
          {transmission === "manual" && (
            <View
              style={{ marginTop: 20, alignItems: "center", width: "100%" }}
            >
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[4500, 5000, 5500, 6000, 6500].map((threshold, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
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
      </TouchableOpacity>
    </Modal>
  );
}
