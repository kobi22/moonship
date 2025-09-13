// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ✅ Export Vite config
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Polyfills for Node globals that Solana/web3 needs
      buffer: "buffer/",
      stream: "stream-browserify",
    },
  },
  define: {
    global: "globalThis", // Fixes Buffer/global issues
    "process.env": {},    // Prevents undefined process.env
  },
  optimizeDeps: {
    include: [
      "buffer",
      "process",
      "@solana/web3.js",
      "@solana/wallet-adapter-base",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit for wallet libs
    rollupOptions: {
      output: {
        manualChunks: {
          // ✅ Split Solana + Wallet Adapters into their own chunk
          solana: [
            "@solana/web3.js",
            "@solana/wallet-adapter-base",
            "@solana/wallet-adapter-react",
            "@solana/wallet-adapter-react-ui",
            "@solana/wallet-adapter-wallets",
          ],
        },
      },
    },
  },
});
