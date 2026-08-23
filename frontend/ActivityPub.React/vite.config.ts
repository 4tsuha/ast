import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:5000",
      "/streaming": { target: "ws://localhost:5000", ws: true },
      "/.well-known": "http://localhost:5000",
      "/health": "http://localhost:5000",
    },
  },
  build: {
    outDir: "../../src/ActivityPub.Api/wwwroot",
    emptyOutDir: true,
  },
})
