import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), vitePluginTailwind()],
  define: {
    global: "globalThis", // Fix Buffer issue
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
