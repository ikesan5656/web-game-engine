---
paths:
  - "app/src/components/webGl/**"
  - "app/src/scenesGl/**"
  - "app/src/container/EditorCanvas.tsx"
---

# WebGL（R3F）部品の注意点

- キー入力は、drei の `KeyboardControls` や `useKeyboardControls` を使わず、部品の中で `window` の `keydown`・`keyup` を扱う（`KeyboardControls` と `config/keyConfig.ts` は削除した）。入力欄では `utils/isTextEditingElement.ts` の `isTextEditingElement` で除外し、blur などで押下状態をリセットする（`visibilitychange`・`pointercancel`・Meta キーの `keyup` でもリセットする）。シーンビューで `pointerdown` すると、どのボタンでも入力欄のフォーカスを外す。キー入力を扱う部品を足すときも、この方式に合わせる。キーやカメラ操作の割り当てを足す・変えたときは、`docs/editor-controls.md` も更新する（`docs/architecture.md` のエディタカメラの操作一覧も合わせる）
- `EditorCanvas` の `onPointerMissed` で選択を解除している（`clearSelection()` を dispatch する）。R3F はイベントハンドラを持つ物とその子孫だけを raycast の対象にするので、ハンドラを持たない物（床・モデル・ライトなど）をクリックしても何にも当たらなかった扱いになり、選択が外れる。クリックで選択する部品を作るときは、この挙動と競合しないようにする
- カメラ操作（右ボタン・中ボタン・Alt+左ボタン）のときは、`CameraControl` が R3F のラッパー要素（`events.connected`）の capture フェーズで `pointerdown` を止める。`click`・`dblclick` は直前の `pointerdown` がカメラ操作だったときだけ止め、`contextmenu` は常に止める。ドラッグ中は `window` の capture で `pointermove`・`pointerup` も止める（ギズモのホバーと R3F に見せないため）。そのため R3F の `onClick`・`onPointerMissed` と `TransformControls` には届かず、カメラ操作で選択が変わったり解除されたりしない。カメラや入力の部品を足すときは、この仕組みを壊さないこと
- クリックでの選択は、選べるエンティティの根の `group` に `onClick` を付け、`e.stopPropagation()` で後ろの物体まで反応しないようにしてから、`onSelect(entity.id)` でエンティティの ID を渡す（`Object3D` は渡さない）。どのエンティティを選べるかは、`SceneView` に渡す `isSelectable`（`scenesGl/SceneDev.tsx` で定義）で決め、`onSelect` を受けた `SceneDev` が `selectEntity(id)` を dispatch する
- 選択は Redux（`selection` slice の `selectedEntityId`）に ID で持つ。`Object3D` が要るとき（`TransformControls` に渡すときなど）は、`useEntityObject(id)`（`components/webGl/sceneView/entityObjectRegistry.ts`）で描画層のレジストリから根の `Object3D` を引き、Redux に入れない。`EntityView` がマウント後（`useEffect`）に根の `group` を登録し、アンマウント時や ID が変わったときに外す。登録はコミットの後なので、最初の描画では `useEntityObject` が `undefined` を返すことがある。`SceneView`・`EntityView` と、`useEntityObject` を呼ぶ部品は、`EntityObjectRegistryProvider` の内側に置くこと（外で使うと例外を投げる。今は `EditorCanvas` の `<Canvas>` 内で `SceneDev` を包んでいる）
- `SceneView`・`EntityView` は `memo` で包んでいる。再描画を抑えるため、`SceneView` に渡す `onSelect` は `useCallback` で固定し、`isSelectable` はコンポーネントの外に定義する（描画のたびに新しい関数を渡すと `memo` が効かなくなる）。`SceneView` に渡す `entities` は `scene` slice の配列をそのまま渡し、`filter`・`map` などで作り直さない（選択の reducer も `scene` slice に触れない）。作り直すと `memo` が効かず、無駄な再描画が起きる。位置の正は `scene` slice のデータで、`transform` が変わったエンティティはデータの値で再適用される（Undo/Redo もこの経路で見た目に反映される）
- `TransformControls` で動かした結果は、ドラッグの確定時にだけ `redux/commands.ts` の thunk でデータに書き戻す。drei の `<TransformControls>` の `onMouseDown` で `beginTransformDrag(id)`、`onMouseUp` で `endTransformDrag(id, position)`（`Object3D` の位置を `[x, y, z]` の `Vec3` にして渡す。ドラッグを始めたエンティティと ID が違えばコマンドを積まない）を dispatch する。`dragging-changed` は使わない。ドラッグ中に `TransformControls` がアンマウントされる場合に備え、`useEffect` の cleanup でも `endTransformDrag` を dispatch する。シーンデータの編集は reducer を直接呼ばず、コマンド（`core/command/`）を `executeCommand` に渡して行う
- `useFrame` の中で `setState` や Redux への dispatch をしない。毎フレーム変わる値は ref などを直接更新する
- シーンのオブジェクト配置はシーンデータで持つ（初期データはコアの `core/scene/devScene.ts`）。`scenesGl/` ではシーンデータの描画（`components/webGl/sceneView/` の `SceneView`）と、エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`）を組み合わせる。配置を `scenesGl/` に直接書かない
- `components/webGl/` の部品は特定のシーンに依存させない。シーンデータを描画する部品（`components/webGl/sceneView/`）も、特定のエンティティの ID を参照しない（選べるかどうかなどの判断は props で受け取る）
