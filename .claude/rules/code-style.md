---
paths:
  - "app/src/**/*.ts"
  - "app/src/**/*.tsx"
  - "app/src/**/*.css"
---

# コードスタイル

- TypeScript strict モード。`any` 型は禁止
- default export ではなく named export を使用
- CSSは基本使わずに、muiを使用
  - MUI の `styled`／Emotion を使う。共通の styled コンポーネントは `app/src/styles/components/` にある
- コードスタイルは ESLint と Prettier で強制。リンターエラーが出たらその出力に従って修正すること
- import は `src/` 起点のパスで書く（例: `import { store } from "redux/store"`）。`tsconfig.json` の `paths`（`"*": ["./src/*"]`）と Vite の `resolve.tsconfigPaths` で解決している。古いファイルに残っている相対パスの import は真似しない
- `useSelector`・`useDispatch` は `react-redux` から直接ではなく、`redux/store` から export している型付きのものを使う
