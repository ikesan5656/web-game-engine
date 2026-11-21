---
paths:
  - "app/src/components/webGl/**"
  - "app/src/scenesGl/**"
  - "app/src/container/EditorCanvas.tsx"
---

# WebGL（R3F）部品の注意点

- `EditorCanvas` は `config/keyConfig.ts` のキーマップを使い、`<Canvas>` を drei の `<KeyboardControls>` で囲んでいる。`useKeyboardControls` を使う部品（`CameraControl` など）は、必ずその内側で描画すること
- `EditorCanvas` の `onPointerMissed` で選択を解除している。R3F はイベントハンドラを持つ物とその子孫だけを raycast の対象にするので、ハンドラを持たない物（床・モデル・ライトなど）をクリックしても何にも当たらなかった扱いになり、選択が外れる。クリックで選択する部品を作るときは、この挙動と競合しないようにする
- クリックでの選択は、選べるエンティティの根の `group` に `onClick` を付け、`e.stopPropagation()` で後ろの物体まで反応しないようにしてから、根の `Object3D` を選択として渡す（子のメッシュは渡さない）。どのエンティティを選べるかは、`SceneView` に渡す `isSelectable`（`scenesGl/SceneDev.tsx` で定義）で決め、選択時の処理は `onSelect` で受け取る
- `useFrame` の中で `setState` や Redux への dispatch をしない。毎フレーム変わる値は ref などを直接更新する
- シーンのオブジェクト配置はシーンデータで持つ（初期データはコアの `core/scene/devScene.ts`）。`scenesGl/` ではシーンデータの描画（`components/webGl/sceneView/` の `SceneView`）と、エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`）を組み合わせる。配置を `scenesGl/` に直接書かない
- `components/webGl/` の部品は特定のシーンに依存させない。シーンデータを描画する部品（`components/webGl/sceneView/`）も、特定のエンティティの ID を参照しない（選べるかどうかなどの判断は props で受け取る）
