import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  // コア層（src/core/）は core/... 以外を import できない（docs/architecture.md の依存の向き）
  {
    files: ["src/core/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!core/)",
              caseSensitive: true,
              message:
                "コア層（src/core/）では core/... 以外を import できません。three・react・redux などの外部パッケージやコアの外のモジュールに依存させず、コア内の import も core/... の形で書いてください。",
            },
            {
              regex: "(^|/)\\.\\.(/|$)",
              message:
                "コア層では `..` を含むパスで import できません。core/... の形で書いてください。",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ImportExpression",
          message: "コア層では動的 import を使わないでください。",
        },
        {
          selector: "TSImportType",
          message: 'コア層では import("...") 型を使わないでください。',
        },
        {
          selector: "JSXElement, JSXFragment",
          message: "コア層では JSX を使わないでください（.ts だけにする）。",
        },
      ],
    },
  },
  // Prettier と競合する書式系ルールを無効化する（必ず最後に置く）
  eslintConfigPrettier
);
