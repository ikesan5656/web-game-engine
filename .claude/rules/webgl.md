---
paths:
  - "app/src/components/webGl/**"
  - "app/src/scenesGl/**"
  - "app/src/container/EditorCanvas.tsx"
---

# WebGL（R3F）部品の注意点

- `EditorCanvas` は `config/keyConfig.ts` のキーマップを使い、`<Canvas>` を drei の `<KeyboardControls>` で囲んでいる。`useKeyboardControls` を使う部品（`CameraControl` など）は、必ずその内側で描画すること
- `EditorCanvas` の `onPointerMissed` で選択を解除している。クリックで選択する部品を作るときは、この挙動と競合しないようにする
- `useFrame` の中で `setState` や Redux への dispatch をしない。毎フレーム変わる値は ref などを直接更新する
- シーンの構成やモデルの差し替えは `scenesGl/` で行い、`components/webGl/` の部品は特定のシーンに依存させない
