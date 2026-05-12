import { Buffer } from "buffer";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import {
  BleError,
  Characteristic,
  Device,
  Subscription,
} from "react-native-ble-plx";

let BleManagerModule: any = null;
if (Platform.OS !== "web") {
  BleManagerModule = require("react-native-ble-plx").BleManager;
}

export default function useBLE(
  onDataReceived?: (data: any) => void,
  onRawTextReceived?: (text: string) => void,
) {
  const bleManager = useMemo(() => {
    if (BleManagerModule) return new BleManagerModule();
    return null;
  }, []);

  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // ✅ REF untuk callback agar tidak stale
  const onDataRef = useRef(onDataReceived);
  const onRawRef = useRef(onRawTextReceived);

  // ✅ REF untuk subscription BLE
  const monitorSubscription = useRef<Subscription | null>(null);
  const disconnectSubscription = useRef<Subscription | null>(null);

  // ✅ REF guard agar connectToDevice tidak dipanggil 2x
  const isConnectingRef = useRef(false);

  useEffect(() => {
    onDataRef.current = onDataReceived;
  }, [onDataReceived]);

  useEffect(() => {
    onRawRef.current = onRawTextReceived;
  }, [onRawTextReceived]);

  // Fungsi helper: bersihkan semua subscription aktif
  const cleanupSubscriptions = () => {
    if (monitorSubscription.current) {
      monitorSubscription.current.remove();
      monitorSubscription.current = null;
      console.log("[BLE] Monitor subscription dibersihkan.");
    }
    if (disconnectSubscription.current) {
      disconnectSubscription.current.remove();
      disconnectSubscription.current = null;
      console.log("[BLE] Disconnect subscription dibersihkan.");
    }
  };

  // ============================================================
  // FUNGSI UTAMA: Konek ke ESP32
  // ============================================================
  const connectToDevice = async (device: Device) => {
    console.log("[BLE] ========================================");
    console.log("[BLE] connectToDevice DIPANGGIL!");
    console.log("[BLE] Device name:", device.name);
    console.log("[BLE] Device ID:", device.id);
    console.log("[BLE] isConnectingRef:", isConnectingRef.current);

    if (isConnectingRef.current) {
      console.log("[BLE] GUARD AKTIF — sudah konek, abort");
      return;
    }

    if (!bleManager) {
      console.log("[BLE] bleManager NULL — abort");
      return;
    }

    isConnectingRef.current = true;
    console.log("[BLE] Guard di-set TRUE");

    try {
      console.log("[BLE] Step 1: cleanupSubscriptions()");
      cleanupSubscriptions();

      console.log("[BLE] Step 2: connectToDevice() — TUNGGU...");
      const connected = await bleManager.connectToDevice(device.id);
      console.log("[BLE] Step 2: BERHASIL connectToDevice!");

      console.log("[BLE] Meminta pelebaran MTU ke 256...");
      try {
        await bleManager.requestMTUForDevice(device.id, 256);
        console.log("[BLE] MTU Sukses! Karakter aman tidak akan terpotong.");
      } catch (e) {
        console.log("[BLE] Gagal memperlebar MTU:", e);
      }

      // Kasih jeda napas 500ms biar sistem Android (GATT) tidak error/sesak napas
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log(
        "[BLE] Step 3: discoverAllServicesAndCharacteristics() — TUNGGU...",
      );
      await connected.discoverAllServicesAndCharacteristics();
      console.log("[BLE] Step 3: BERHASIL discover!");

      console.log("[BLE] Step 4: setConnectedDevice + setIsConnected(true)");
      setConnectedDevice(connected);
      setIsConnected(true);
      console.log("[BLE] Step 4: STATE SUDAH UPDATE!");

      console.log("[BLE] Step 5: onDeviceDisconnected listener...");
      disconnectSubscription.current = bleManager.onDeviceDisconnected(
        device.id,
        (error: BleError | null) => {
          console.log("[BLE] onDeviceDisconnected TRIGGERED:", error?.message);
          cleanupSubscriptions();
          setIsConnected(false);
          setConnectedDevice(null);
          isConnectingRef.current = false;
        },
      );

      console.log("[BLE] Step 6: monitorCharacteristicForService — TUNGGU...");
      monitorSubscription.current = connected.monitorCharacteristicForService(
        // 👈 UBAH DI SINI
        "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
        "beb5483e-36e1-4688-b7f5-ea07361b26a8",
        (error: BleError | null, characteristic: Characteristic | null) => {
          if (error) {
            console.log("[BLE] monitorCharacteristic ERROR:", error.message);
            return;
          }
          if (characteristic?.value) {
            const rawData = Buffer.from(
              characteristic.value,
              "base64",
            ).toString("utf-8");
            console.log(
              "[BLE] Data diterima:",
              rawData.substring(0, 50) + "...",
            );

            if (rawData.startsWith("{")) {
              try {
                const json = JSON.parse(rawData);
                if (onDataRef.current) onDataRef.current(json);
              } catch (e) {
                console.log("[BLE] JSON parse error:", e);
              }
            } else {
              if (onRawRef.current) onRawRef.current(rawData);
            }
          }
        },
      );
      console.log("[BLE] Step 6: monitorCharacteristic BERHASIL!");
    } catch (error) {
      console.log("[BLE] ========================================");
      console.log("[BLE] CATCH ERROR:", error);
      console.log("[BLE] ========================================");
      cleanupSubscriptions();
      setIsConnected(false);
      setConnectedDevice(null);
    } finally {
      console.log("[BLE] FINALLY — isConnectingRef = false");
      isConnectingRef.current = false;
    }
  };

  // Fungsi disconnect manual
  const disconnectDevice = async () => {
    cleanupSubscriptions();
    if (connectedDevice) {
      await connectedDevice.cancelConnection();
    }
    setIsConnected(false);
    setConnectedDevice(null);
    isConnectingRef.current = false;
    console.log("[BLE] Disconnect manual berhasil.");
  };

  // Request permission Bluetooth & Location
  const requestPermissions = async () => {
    if (Platform.OS === "web") {
      alert("Fitur Bluetooth tidak tersedia di Web Browser.");
      return false;
    }

    let permissionsGranted = true;

    // 1. CEK IZIN APLIKASI (Android 12+)
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      permissionsGranted =
        granted["android.permission.BLUETOOTH_CONNECT"] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.BLUETOOTH_SCAN"] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted["android.permission.ACCESS_FINE_LOCATION"] ===
          PermissionsAndroid.RESULTS.GRANTED;
    }

    if (!permissionsGranted) {
      console.log("[BLE] Izin aplikasi DITOLAK user.");
      return false; // Berhenti kalau izin belum dikasih
    }

    // 2. CEK STATUS HARDWARE BLUETOOTH (NYALA / MATI)
    if (bleManager) {
      const btState = await bleManager.state();
      console.log("[BLE] Status Hardware Bluetooth:", btState);

      if (btState === "PoweredOff") {
        // Tampilkan Alert Paksa untuk Android & iOS
        Alert.alert(
          "Bluetooth Mati ⚠️",
          "Livina ProDash membutuhkan koneksi Bluetooth untuk membaca data mesin.\n\nSilakan nyalakan Bluetooth Anda terlebih dahulu.",
          [
            {
              text: "Tutup",
              style: "cancel",
            },
            {
              text: "Coba Nyalakan (Android)",
              onPress: async () => {
                if (Platform.OS === "android") {
                  try {
                    console.log("[BLE] Meminta sistem menyalakan Bluetooth...");
                    await bleManager.enable();
                  } catch (error) {
                    console.log(
                      "[BLE] Sistem menolak menyalakan otomatis:",
                      error,
                    );
                    Alert.alert(
                      "Gagal",
                      "Silakan usap layar ke bawah dan nyalakan Bluetooth secara manual melalui Control Center.",
                    );
                  }
                }
              },
            },
          ],
        );

        // Kembalikan false agar loading di layar awal langsung berhenti
        return false;
      }
    }

    return true; // Izin oke, Hardware nyala!
  };

  // Scan device BLE (cari "LivinaProDash")
  const scanForDevices = () => {
    if (!bleManager) {
      console.log("[SCAN] bleManager null, abort");
      return;
    }
    console.log("[SCAN] ========================================");
    console.log("[SCAN] Mulai scan 15 detik...");

    bleManager.startDeviceScan(
      null,
      null,
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.log("[SCAN] ERROR:", error);
          return;
        }
        console.log(
          "[SCAN] Device ditemukan:",
          device?.name,
          "| localName:",
          device?.localName,
        );

        if (
          device?.name === "LivinaProDash" ||
          device?.localName === "LivinaProDash"
        ) {
          console.log("[SCAN] LIVINA DITEMUKAN! Stop scan...");
          bleManager.stopDeviceScan();
          console.log("[SCAN] Panggil connectToDevice()...");
          connectToDevice(device);
          console.log(
            "[SCAN] connectToDevice() sudah dipanggil (async, lanjut...)",
          );
        }
      },
    );

    setTimeout(() => {
      console.log("[SCAN] Timeout 15 detik — stop scan");
      bleManager.stopDeviceScan();
    }, 15000);
  };

  // Kirim pesan ke ESP32
  const sendMessage = async (message: string) => {
    if (connectedDevice) {
      try {
        const base64Msg = Buffer.from(message).toString("base64");
        await connectedDevice.writeCharacteristicWithResponseForService(
          "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
          "8c38148b-3db4-46c6-bb50-51b68181fb6b",
          base64Msg,
        );
        console.log("Terkirim ke ESP32:", message);
      } catch (err) {
        console.log("[BLE] Gagal kirim:", err);
      }
    }
  };

  return {
    requestPermissions,
    scanForDevices,
    connectedDevice,
    isConnected,
    sendMessage,
    disconnectDevice,
  };
}
