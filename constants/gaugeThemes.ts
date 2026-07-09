import { Platform } from "react-native";

export type GaugeLayout = "arc" | "ring" | "bar" | "digital";

export interface GaugeTheme {
  id: string;
  name: string;
  layout: GaugeLayout;
  rpmColor: string;
  rpmNeedle: string;
  speedColor: string;
  speedNeedle: string;
  // 👇 TAMBAHAN: Properti opsional khusus untuk Light Mode
  rpmColorLight?: string;
  rpmNeedleLight?: string;
  speedColorLight?: string;
  speedNeedleLight?: string;
  fontFamily?: string;
  glow: boolean;
  grid: boolean;
}

// ✅ Redline (zona merah bahaya) SENGAJA tidak ikut berubah tema apapun —
// itu warna keselamatan universal, biar tetap gampang dikenali di semua tema.
export const GAUGE_THEMES: GaugeTheme[] = [
  {
    id: "classic",
    name: "Classic Arc",
    layout: "arc",
    rpmColor: "#ffffff",
    rpmNeedle: "#ffffff",
    speedColor: "#3498db",
    speedNeedle: "#3498db",
    // ✅ Light Mode: Putih jadi Abu-abu gelap, Biru muda jadi Biru Tua
    rpmColorLight: "#111111",
    rpmNeedleLight: "#333333",
    speedColorLight: "#005C97",
    speedNeedleLight: "#005C97",
    glow: false,
    grid: false,
  },
  {
    id: "ring",
    name: "Full Ring",
    layout: "ring",
    rpmColor: "#ffffff",
    rpmNeedle: "#ffc400",
    speedColor: "#3498db",
    speedNeedle: "#3498db",
    // ✅ Light Mode: Putih jadi Abu-abu gelap, Neon jadi Hijau & Kuning Pekat
    rpmColorLight: "#111111",
    rpmNeedleLight: "#d4a000",
    speedColorLight: "#005C97",
    speedNeedleLight: "#005C97",
    glow: true,
    grid: false,
  },
  {
    id: "minimal",
    name: "Minimal Bar",
    layout: "bar",
    rpmColor: "#FFFFFF",
    rpmNeedle: "#ffffff",
    speedColor: "#3498db",
    speedNeedle: "#3498db",
    // ✅ Light Mode: Warna pekat agar bar terlihat tegas di background terang
    rpmColorLight: "#111111",
    rpmNeedleLight: "#333333",
    speedColorLight: "#005C97",
    speedNeedleLight: "#005C97",
    glow: false,
    grid: false,
  },
  {
    id: "digital",
    name: "Digital LCD",
    layout: "digital",
    rpmColor: "#3498db",
    rpmNeedle: "#3498db",
    speedColor: "#3498db",
    speedNeedle: "#3498db",
    // ✅ Light Mode: Hijau botol gelap agar mirip LCD kalkulator lawas di siang hari
    rpmColorLight: "#005C97",
    rpmNeedleLight: "#005C97",
    speedColorLight: "#005C97",
    speedNeedleLight: "#005C97",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    glow: true,
    grid: true,
  },
];
