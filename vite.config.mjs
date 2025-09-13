import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    global: "globalThis", // polyfill for buffer/global usage
  },
  optimizeDeps: {
    include: [
      "buffer",
      "@solana/web3.js",
      "@solana/wallet-adapter-base",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "@solana/wallet-adapter-wallets",
    ],
  },
  build: {
    chunkSizeWarningLimit: 1000, // raise warning limit
    rollupOptions: {
      output: {
        manualChunks: {
          // group Solana wallet libs into their own chunks
          "solana-wallets": [
            "@solana/web3.js",
            "@solana/wallet-adapter-base",
            "@solana/wallet-adapter-react",
            "@solana/wallet-adapter-react-ui",
            "@solana/wallet-adapter-wallets",
          ],
          "vendor-react": ["react", "react-dom"],
        },
      },
    },
  },
});
