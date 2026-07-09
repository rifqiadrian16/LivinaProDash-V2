import { StyleSheet } from "react-native";
import { AppColors } from "../constants/appThemes";

export const getDashboardStyles = (c: AppColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1, padding: 20 },

    // LAYAR AWAL
    setupContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 60,
      justifyContent: "center",
    },
    headerCentered: { alignItems: "center", marginBottom: 20 },
    setupTitle: {
      color: c.text,
      fontSize: 28,
      fontWeight: "900",
      marginTop: 15,
      letterSpacing: 1,
    },
    setupSubtitle: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: "center",
      marginTop: 8,
      width: "100%",
    },
    connectBtn: {
      backgroundColor: c.accent,
      paddingVertical: 18,
      width: "100%",
      borderRadius: 12,
      alignItems: "center",
    },
    connectBtnText: {
      color: c.bg,
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 1,
    },

    // HEADER
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    brandText: {
      color: c.brand,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 2,
    },
    headerRight: { flexDirection: "row", alignItems: "center" },
    iconBtn: {
      padding: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    statusTag: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusText: { fontSize: 10, fontWeight: "bold", marginLeft: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },

    // MODAL
    modalBg: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalBox: {
      backgroundColor: c.card,
      width: "85%",
      padding: 25,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalTitle: { color: c.text, fontSize: 20, fontWeight: "bold" },

    tabSelector: {
      flexDirection: "row",
      backgroundColor: c.bg,
      borderRadius: 10,
    },

    tabBtn: { flex: 1, padding: 12, alignItems: "center", borderRadius: 8 },
    tabActive: { backgroundColor: c.accent },
    tabText: { color: c.textMuted, fontWeight: "bold" },

    doorLockLabel: {
      color: c.textMuted,
      fontWeight: "bold",
    },

    configLabel: {
      color: c.textMuted,
      fontSize: 10,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    configInput: {
      backgroundColor: c.inputBg,
      color: c.accent,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 14,
      fontWeight: "bold",
      letterSpacing: 1,
    },
    scanBtnMini: {
      backgroundColor: c.accent,
      paddingHorizontal: 20,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
    },

    saveBtn: {
      backgroundColor: c.accent,
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      marginTop: 10,
    },
    saveBtnText: { color: c.label, fontWeight: "bold", letterSpacing: 1 },

    // MODAL RADAR
    scannedItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.inputBg,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    scannedItemName: { color: c.text, fontSize: 16, fontWeight: "bold" },
    scannedItemMac: { color: c.textMuted, fontSize: 12, marginTop: 2 },

    // GAUGE
    gaugeContainerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 35,
      gap: 10,
    },
    gaugeWrapper: { flex: 1, alignItems: "center" },
    mainRing: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 3,
      borderColor: c.border,
      backgroundColor: c.card,
      justifyContent: "center",
      alignItems: "center",
      elevation: 15,
      shadowColor: c.accent,
      shadowRadius: 20,
      shadowOpacity: 0.15,
    },
    gaugeValueText: { color: c.text, fontSize: 38, fontWeight: "900" },
    gaugeUnitText: {
      color: c.textFaint,
      fontSize: 12,
      fontWeight: "bold",
      marginTop: -2,
      letterSpacing: 1,
    },
    rpmTrackSmall: {
      width: "70%",
      height: 3,
      backgroundColor: c.border,
      borderRadius: 2,
      marginTop: 10,
      overflow: "hidden",
    },
    rpmFillSmall: { height: "100%", backgroundColor: c.accent },
    helperText: {
      color: c.textFaint,
      fontSize: 10,
      fontWeight: "bold",
      marginTop: 10,
      letterSpacing: 2,
    },

    // GRID SENSOR
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 5,
    },
    card: {
      width: "31%",
      backgroundColor: c.card,
      padding: 15,
      borderRadius: 15,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.cardBorder,
    },
    cardValue: {
      color: c.text,
      fontSize: 16,
      fontWeight: "bold",
      marginTop: 8,
    },
    cardLabel: {
      color: c.textFaint,
      fontSize: 8,
      fontWeight: "bold",
      marginTop: 2,
      letterSpacing: 1,
    },

    trimContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 15,
      gap: 10,
    },
    trimBox: {
      flex: 1,
      backgroundColor: c.card,
      padding: 15,
      borderRadius: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    trimLabel: { color: c.textFaint, fontSize: 10, fontWeight: "bold" },
    trimValue: { color: c.accent, fontSize: 14, fontWeight: "bold" },

    fuelRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
      marginTop: 10,
      backgroundColor: c.card,
      padding: 15,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.cardBorder,
      marginBottom: 15,
    },
    fuelItem: { alignItems: "center" },
    fuelLabel: {
      color: c.textFaint,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1,
    },
    fuelValue: {
      color: c.text,
      fontSize: 20,
      fontWeight: "bold",
      marginTop: 5,
    },
    unitSmall: { fontSize: 10, color: c.textMuted },

    // FAB RECORDING — merah bahaya, sengaja TIDAK ikut tema (universal warning color)
    recordFabShadowWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "transparent",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
    recordFabActive: {
      backgroundColor: c.card,
      borderWidth: 2,
      borderColor: "#FF1744",
    },
    recordingDot: {
      position: "absolute",
      top: 15,
      right: 15,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#fff",
    },
    recordFabContainer: {
      position: "absolute",
      bottom: 90,
      right: 8,
      zIndex: 999,
    },
    recordFab: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    secretZone: {
      position: "absolute",
      bottom: 70,
      width: "80%",
      left: 0,
      right: 0,
      height: 60,
      backgroundColor: "transparent",
    },

    // HUD — SENGAJA TETAP GELAP PERMANEN (dipakai pantulan kaca depan malam
    // hari, kalau ikut Light Mode malah menyilaukan/tidak kebaca di kaca).
    // Jangan diparameterisasi ke c.*, biarkan hardcode putih transparan.
    hudLabel: {
      color: "rgba(255,255,255,0.3)",
      fontSize: 8,
      fontWeight: "bold",
      letterSpacing: 2,
      marginBottom: 2,
      marginRight: 5,
    },
    hudValueBig: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 26,
      fontWeight: "900",
    },
    hudValueSmall: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 16,
      fontWeight: "900",
    },
    hudUnit: {
      color: "rgba(255,255,255,0.35)",
      fontSize: 9,
      fontWeight: "bold",
      marginLeft: 4,
      letterSpacing: 1,
    },
  });
