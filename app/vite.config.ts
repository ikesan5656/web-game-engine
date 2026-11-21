import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/web-game-engine/",
  plugins: [react()],
  resolve: {
    // tsconfig.json の paths（src/ 起点の import）を解決する
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
});
