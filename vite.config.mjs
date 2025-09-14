import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vitePluginTailwind from "vite-plugin-tailwindcss";

export default defineConfig({
  plugins: [react(), vitePluginTailwind()],
  define: {
    global: "globalThis", // Fix Buffer issue
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
