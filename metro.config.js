const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Izinkan Metro membaca ekstensi file WebAssembly (.wasm)
config.resolver.assetExts.push("wasm");

// 2. Tambahkan Header Keamanan untuk mengaktifkan SharedArrayBuffer di Browser
config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Memberi tahu browser bahwa web ini aman untuk menjalankan SQLite
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
