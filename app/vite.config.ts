import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
//import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig.json の paths（src/ 起点の import）を解決する
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  assetsInclude: ["**/*.pmx", "**/*.pmd", "**/*.vmd"], // アセットとして扱うファイル拡張子を指定
});
