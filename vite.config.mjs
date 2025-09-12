import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@solana/wallet-adapter-react": path.resolve(
        __dirname,
        "node_modules/@solana/wallet-adapter-react"
      ),
    },
  },
});
