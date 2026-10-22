import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        silenceDeprecations: ["import", "global-builtin"],
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Bind all interfaces so a phone on the same LAN can open the QR passport
    // page (e.g. http://192.168.0.192:5174/qr/...). Without this Vite listens on
    // 127.0.0.1 only and phone scans can never reach it.
    host: true,
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.COAL_API ?? "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
