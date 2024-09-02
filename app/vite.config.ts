import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
//import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  server: {
    port: 3000,
  },
  esbuild: {
    jsxFactory: "jsx",
  },
  assetsInclude: ["**/*.pmx", "**/*.pmd", "**/*.vmd"], // アセットとして扱うファイル拡張子を指定
});
