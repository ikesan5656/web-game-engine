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
- コードスタイルは ESLint と Prettier で強制。リンターエラーが出たらその出力に従って修正すること
