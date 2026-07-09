export interface AppColors {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  border: string;
  inputBg: string;
  overlay: string;
  label: string;
  brand: string;
  o2: string;
}

export const DARK_COLORS: AppColors = {
  bg: "#050505",
  card: "#0e0e0e",
  cardBorder: "#151515",
  text: "#ffffff",
  textMuted: "#888888",
  textFaint: "#444444",
  accent: "#00ff88",
  border: "#222222",
  inputBg: "#000000",
  overlay: "rgba(0,0,0,0.85)",
  label: "#000",
  brand: "#FFF",
  o2: "#FFF",
};

export const LIGHT_COLORS: AppColors = {
  bg: "#f1f1f2",
  card: "#ffffff",
  cardBorder: "#e3e3e8",
  text: "#111111",
  textMuted: "#666666",
  textFaint: "#999999",
  accent: "#009e63", // hijau digelapkan sedikit biar kebaca di background putih
  border: "#dcdce0",
  inputBg: "#f7f7f9",
  overlay: "rgba(0,0,0,0.4)",
  label: "#FFF",
  brand: "#009e63",
  o2: "#222",
};
