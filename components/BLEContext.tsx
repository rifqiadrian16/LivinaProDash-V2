import React, { createContext, useContext, useRef } from "react";
import useBLE from "../hooks/useBLE";

type DataListener = (data: any) => void;
type RawListener = (text: string) => void;

const BLEContext = createContext<any>(null);

export const useBLEContext = () => {
  const ctx = useContext(BLEContext);
  if (!ctx) {
    throw new Error("useBLEContext harus dipanggil di dalam <BLEProvider>");
  }
  return ctx;
};

export const BLEProvider = ({ children }: { children: React.ReactNode }) => {
  // Semua tab (Dashboard, Diagnostics, dst) daftar di sini,
  // bukan masing-masing manggil useBLE() sendiri-sendiri.
  const dataListeners = useRef<Set<DataListener>>(new Set());
  const rawListeners = useRef<Set<RawListener>>(new Set());

  const handleData = (data: any) => {
    dataListeners.current.forEach((cb) => cb(data));
  };
  const handleRaw = (text: string) => {
    rawListeners.current.forEach((cb) => cb(text));
  };

  // ✅ SATU-SATUNYA instance useBLE di seluruh app.
  const ble = useBLE(handleData, handleRaw);

  const subscribeData = (cb: DataListener) => {
    dataListeners.current.add(cb);
    return () => dataListeners.current.delete(cb);
  };
  const subscribeRaw = (cb: RawListener) => {
    rawListeners.current.add(cb);
    return () => rawListeners.current.delete(cb);
  };

  return (
    <BLEContext.Provider value={{ ...ble, subscribeData, subscribeRaw }}>
      {children}
    </BLEContext.Provider>
  );
};
