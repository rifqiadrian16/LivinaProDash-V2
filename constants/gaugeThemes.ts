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
    glow: false,
    grid: false,
  },
  {
    id: "ring",
    name: "Full Ring",
    layout: "ring",
    rpmColor: "#ff00e6",
    rpmNeedle: "#ff00e6",
    speedColor: "#00fff2",
    speedNeedle: "#00fff2",
    glow: true,
    grid: false,
  },
  {
    id: "minimal",
    name: "Minimal Bar",
    layout: "bar",
    rpmColor: "#ff9f1c",
    rpmNeedle: "#ff9f1c",
    speedColor: "#00d4aa",
    speedNeedle: "#00d4aa",
    glow: false,
    grid: false,
  },
  {
    id: "digital",
    name: "Digital LCD",
    layout: "digital",
    rpmColor: "#00ff88",
    rpmNeedle: "#00ff88",
    speedColor: "#00ff88",
    speedNeedle: "#00ff88",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    glow: true,
    grid: true,
  },
];
