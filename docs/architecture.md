# アーキテクチャ設計

WebGameEngine の設計方針、その理由、現状からの移行計画をまとめる。守るべきルールの要点は `.claude/CLAUDE.md` の「設計方針」にあり、このドキュメントはその背景を説明する。

## 基本の考え方

**シーンをデータで持ち、three.js はそのデータを表示する層として扱う。**

正となるデータ（どのエンティティがどこにあり、どのアセットを使うか）は three.js の外に、シリアライズできる形で置く。`Object3D` はそのデータを描画した結果にすぎない。

こうすることで、次のことができるようになる。

- シーンの保存と読み込み（JSON にできる）
- Undo/Redo（状態のスナップショットや差分を取れる）
- React の状態と three.js の状態がずれない
- 描画と切り離したロジックのテスト

## 層の構成

```
┌ UI 層（MUI）            … ヒエラルキー、インスペクタ、ツールバー
├ エディタ状態（Redux）   … 選択中の ID、ツールのモード、表示設定（グリッドなど）、Undo の履歴
├ シーンデータ（コア）    … エンティティ一覧、Transform、アセットの参照（シリアライズ可能。参照は当面 URL、のちにアセット ID）
├ ランタイム（useFrame）  … 毎フレームの更新（移動、アニメーション、物理）
└ 描画層（R3F）           … シーンデータを Object3D に変換して表示
```

シーンデータの型と初期データはコアに置き、実行中の値は Redux の `scene` slice が持つ（「状態管理の使い分け」を参照）。

依存の向き:

```
UI（MUI） ─┐
描画（R3F）─┼─→ エディタ（コマンド・状態） ─→ コア（シーンデータ・型・ロジック）
保存/読込 ─┘
```

| 層         | 例                                               | 方針                                                      |
| ---------- | ------------------------------------------------ | --------------------------------------------------------- |
| コア       | シーンデータの型、エンティティ操作、シリアライズ | 外部ライブラリ（`three`・`react`・`redux`）に依存させない |
| エディタ   | コマンド、Undo の履歴、選択状態、表示設定        | コアだけに依存する。ユースケースに当たる層                |
| アダプタ   | R3F の描画、ローダー、ファイルの保存と読み込み   | 薄く作る。保存先は Interface にしておくと差し替えやすい   |
| ランタイム | `useFrame` 内の更新処理                          | 性能を優先し、層を挟まずに直接書く                        |

コアの方針は ESLint で強制している（`app/eslint.config.js`）。`app/src/core/` のファイル（`.ts` だけでなく `.tsx`・`.js`・`.jsx`・`.mjs`・`.cjs` も対象）は `no-restricted-imports` により `core/...` 以外を import できず、`three`・`react`・`redux` などの外部パッケージも、コアの外のモジュール（`components/...` や `../` による相対 import）も使えない。`core/../redux/store` のように `..` を含むパスも、`core/` で始まっていても禁止している。動的 `import()`・`import("...")` 型・JSX も `no-restricted-syntax` で禁止している。

## コア層のデータ型

シーンデータの型は `app/src/core/` に置く。コア内の import も `core/...` の形で書き、ファイルは `.ts` だけにする。

- `math/vec3.ts`: `Vec3`（`[x, y, z]` のタプル）
- `scene/entityId.ts`: `EntityId`、`toEntityId`、`createEntityId`
- `scene/transform.ts`: `Transform`（位置・回転・スケール）、`createDefaultTransform`、`transformEquals(a, b)`（2 つの Transform を要素ごとに `===` で比べる）
- `scene/components.ts`: `Component`（`mesh`・`model`・`directionalLight` の判別共用体）と、各コンポーネント・形状・マテリアルの型。`ModelComponent` は `format` で判別する共用体で、glTF の `GltfModelComponent`（`{ type: "model"; format: "gltf"; url }`）と MMD の `MmdModelComponent`（`{ type: "model"; format: "mmd"; url; motionUrl: string | null }`）がある。MMD のモーション（VMD）がないときは `motionUrl` を `null` にする
- `scene/entity.ts`: `Entity`（`{ id, name, transform, components }`）、`findComponent`
- `scene/sceneData.ts`: `SceneData`（`{ entities: Entity[] }`）
- `scene/devScene.ts`: 開発用シーンの初期データ。初期データのエンティティの固定 ID をまとめた `devSceneIds` と、`createDevScene(): SceneData`（呼ぶたびに新しいオブジェクトを返す）
- `command/`: 編集操作のコマンド。`MoveEntityCommand`（`{ type: "moveEntity"; entityId; before: Transform; after: Transform }`）の型と、コマンドをシーンに適用する `applyCommand(scene, command): SceneData`、取り消す `revertCommand(scene, command): SceneData`。どちらも純粋関数で、対象のエンティティだけを差し替えた新しい `SceneData` を返し、ほかのエンティティは参照を保つ（対象の ID がなければ `scene` をそのまま返す）

データには次の約束がある。型では強制していないものも含む。

- **保存するデータの型では、省略可能なプロパティ（`?:`）を使わない**: 値がないときは `null` を入れる。`undefined` は JSON にすると消え、保存と読み込みで形が変わるため。`findComponent` などの関数が見つからないときに `undefined` を返すのは対象外。
- **数値は有限の値だけにする**: `NaN`・`Infinity` は JSON にすると `null` になるため。
- **回転はオイラー角（ラジアン）で、順序は `XYZ` に固定する**: three の `Euler` の既定と同じなので R3F の `rotation` にそのまま渡せ、インスペクタでも編集しやすいため。
- **`entities` の配列の順序をヒエラルキーの表示順とする**: 表示順を別のデータで持たずに済み、JSON にしても順序が保たれるため（ID をキーにしたオブジェクトでは、`"1"` のような整数に見えるキーの順序が入れ替わる）。親子関係を追加した後は、同じ親を持つエンティティ同士の順序になる。
- **同じ種類のコンポーネントは 1 つのエンティティに 1 つまで**: 描画層や `findComponent` が種類ごとに 1 つだけあるものとして扱え、インスペクタでも種類ごとに 1 つの欄を出せるようにするため。
- **モデルの URL は `public/` からの相対パスにする（先頭に `/` を付けない）**: デプロイ先（GitHub Pages のサブパス）や開発サーバーに依存させないため。glTF のモデルも、MMD のモデル（`url`）とモーション（`motionUrl`）も同じ約束に従う。`import.meta.env.BASE_URL` を前に付けるのは描画層（`components/webGl/sceneView/resolvePublicUrl.ts`）で行う。親 Issue #7 のフェーズ 4 でアセット ID に置き換える。
- **エンティティ ID はブランド型の文字列にする**: 名前や URL などのほかの文字列と取り違えないため。新しい ID は `createEntityId`（`crypto.randomUUID`）で作り、初期データでは `toEntityId("floor")` のような固定の ID を使う。`crypto.randomUUID` はセキュアコンテキスト（`localhost` や https）でしか使えない。
- **ディレクショナルライトは Transform の回転とスケールを使わない**: three の `DirectionalLight` は位置から target（既定では原点）に向けて照らすので、向きは位置で決まるため。

親子関係はまだ持たない。親 Issue #7 のフェーズ 3 で `Entity` に `parentId: EntityId | null` を足す。エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`、ライトのヘルパー）はシーンデータに含めない。

## 状態管理の使い分け

- **シーンデータ**: Redux の `scene` slice（`app/src/redux/slices/sceneSlice.ts`）に置く。型と初期データ（`createDevScene()`）はコアに置き、エディタ層の slice からコアへ一方向に import する。state の配列やオブジェクトは immer に凍結されるので、reducer の外で書き換えない。シーンの編集はコマンド（後述）を通して行い、`scene` slice は `extraReducers` でコマンドの実行・取り消し・やり直しの action を受けて `applyCommand`・`revertCommand` の結果に置き換える。
- **エディタの操作（選択、追加、削除、プロパティの編集）**: Redux で管理する。ドラッグ中のように頻繁に起きる更新は、確定時（ドラッグ終了時など）にだけ dispatch する。選択は `selection` slice（`app/src/redux/slices/selectionSlice.ts`）にエンティティ ID で持つ。
- **コマンドと Undo/Redo の履歴**: コマンドは、型と適用・取り消しの純粋関数をコアの `core/command/` に置く。コマンドは関数を持たないプレーンなオブジェクト（判別共用体）にし、履歴をシリアライズできるようにする。`app/src/redux/commandActions.ts` の `commandExecuted`・`commandUndone`・`commandRedone` を `scene` slice と `history` slice が受ける。`history` slice（`app/src/redux/slices/historySlice.ts`）は `{ past, future }` を持ち、上限は `HISTORY_LIMIT`（100。超えたら古いものから捨てる）。新しいコマンドを積むと `future` は空になる。`redux/commands.ts` の `undo`・`redo` は履歴を見て（ドラッグ中は何もしない）`commandUndone`・`commandRedone` を dispatch する。`executeCommand` はコマンドを実行する唯一の入口で、`commandExecuted` はここからだけ dispatch する。`commandUndone`・`commandRedone` も `undo`・`redo` からだけ dispatch する（`history` slice は payload を見ないため、直接 dispatch すると履歴とシーンが食い違う）。ドラッグの開始・確定の thunk（`beginTransformDrag`・`endTransformDrag`）も同じファイルにあり、確定は `executeCommand` を通す。
- **ドラッグ中の一時状態**: `transformEdit` slice（`app/src/redux/slices/transformEditSlice.ts`）に、ドラッグ開始時のエンティティ ID と Transform（`dragStart`）だけを持つ。ドラッグ中の位置は `Object3D` にだけ反映し、確定時に 1 つの移動コマンドにする。ドラッグ中は Undo/Redo を受け付けない。
- **`Object3D` への参照**: state には持たず、描画層のレジストリ（`components/webGl/sceneView/entityObjectRegistry.ts`）で ID から引く。
- **エディタの表示設定（グリッドの表示・非表示など）**: エディタ状態として Redux（`editorView` slice、`app/src/redux/slices/editorViewSlice.ts`）で管理する。シーンのデータではなく、シーンの保存や Undo の対象にもしないので、コア（`app/src/core/`）には置かない。
- **毎フレーム変わる値（ゲーム実行中の位置や速度など）**: React の state を通さず、`useFrame` の中で ref や ECS のデータを直接書き換える。毎フレーム再レンダリングが走ると、すぐに重くなる。

R3F 周辺では、React の外から `getState()` で読み書きできてゲームループと相性がよい zustand もよく使われる。必要になったら検討する。

## クリーンアーキテクチャをそのまま採用しない理由

依存の向きを内側に揃えるという中心の考え方は取り入れるが、教科書どおりの層構成（UseCase → Repository → Presenter）は採用しない。

- **毎フレームの処理と相性が悪い**: 1 秒に 60 回、層を通るとオーバーヘッドもコード量も増える。
- **three.js を完全に隠すのは割に合わない**: `Vector3` や `Quaternion` までラップすると、手間の方が大きい。コアでは単純な型を使い、描画層で変換する程度にとどめる。
- **プロトタイプの段階では重い**: 仕様が固まっていないうちは、Interface や DI のための層が変更の足かせになる。

## 参考にしている設計パターン

この構成全体を指す決まった名前はない。人に説明するときは「ヘキサゴナルアーキテクチャ ＋ ECS」と言うのが伝わりやすい。

| 構成要素                                                     | 近い名称                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| コアを外部ライブラリから切り離し、R3F や保存処理を外側に置く | ヘキサゴナルアーキテクチャ（Ports and Adapters）            |
| コアは純粋なデータとロジック、副作用（three.js）は外側       | Functional Core, Imperative Shell                           |
| 実行時のエンティティとシステム                               | ECS（Entity Component System）、データ指向設計              |
| 編集操作と Undo/Redo                                         | コマンドパターン                                            |
| データが正で、描画はその結果                                 | 単一の情報源（Single Source of Truth）、宣言的 UI           |
| エディタと実行時を分ける                                     | エディタとランタイムの分離（Unity や Godot などと同じ構成） |

使い分けのまとめ:

- **ヘキサゴナルアーキテクチャ**: エディタ側（データ、編集、保存）の設計指針
- **ECS**: ゲーム実行時の設計指針
- **R3F**: 両方を表示する層

## 現状

- シーンの配置はデータで持っている。初期データはコアの `core/scene/devScene.ts`（`createDevScene()`）にあり、Redux の `scene` slice がそれを `initialState` として持つ。`scenesGl/SceneDev.tsx` が `scene` slice のエンティティを `components/webGl/sceneView/` の `SceneView` に渡して描画する。エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`）は `SceneDev` に置き、ライトのヘルパーと太陽のテクスチャはライトの描画部品が持つ。
- 選択はエンティティ ID で持っている。Redux の `selection` slice（`app/src/redux/slices/selectionSlice.ts`）が、選択中のエンティティを `selectedEntityId`（`EntityId | null`、未選択は `null`）として持つ。`SceneDev` が選べるエンティティ（暫定で、`mesh` を持ち床でないもの）を決め、クリックされたエンティティの ID を `selectEntity(id)` で dispatch する。何もない所のクリックでは、`EditorCanvas` の `onPointerMissed` が `clearSelection()` を dispatch する。
  - ID から根の `Object3D` を引く仕組みは、Redux の外の描画層に置いている（`components/webGl/sceneView/entityObjectRegistry.ts` のレジストリと、`EntityObjectRegistryProvider`）。`EntityObjectRegistryProvider` は `EditorCanvas` の `<Canvas>` 内で `SceneDev` を包む固定の位置に置いている。`EntityView` がマウント後（`useEffect`）に根の `group` を自分の ID で登録し、アンマウント時や ID が変わったときに登録を外す。登録はコミットの後なので、最初の描画では `useEntityObject` が `undefined` を返すことがある。`SceneDev` は選択中の ID から `useEntityObject(id)` で根の `Object3D` を引き、drei の `<TransformControls>` に渡す。引けないとき（未選択、まだ描画されていないなど）は `TransformControls` を出さない。`useEntityObject` は `useSyncExternalStore` でレジストリの変更を購読するので、登録や解除に表示が追従する。選択を解除しても登録は残るので、選び直すと登録済みの同じ `group` に `TransformControls` が付く。
  - `SceneView`・`EntityView` は `memo` で包んでいる。選択の変更やグリッドの切り替えで `SceneDev` が再描画されても、props が変わらなければ `SceneView` 以下は再描画されない。そのため `SceneDev` は `onSelect` を `useCallback` で固定し、`isSelectable` をコンポーネントの外に置いている。
  - `TransformControls` で動かした位置は、ドラッグの確定時にシーンデータへ書き戻す。データが正で、ドラッグ中だけ `Object3D` が先に動く。`SceneDev` が drei の `<TransformControls>` の `onMouseDown` で `beginTransformDrag(id)`、`onMouseUp` で `endTransformDrag(id, position)` を dispatch し（`dragging-changed` は使わない）、ドラッグを始めたエンティティと ID が違う場合と位置が変わっていない場合は積まない（積まない場合もドラッグ状態は解除する。`dragEnded` で `dragStart` を `null` に戻す）。位置が変わっていれば `executeCommand` 経由で `MoveEntityCommand`（`before` は開始時の Transform、`after` は `before` の位置だけを `Object3D` の位置に替えたもの。今は移動だけで、回転とスケールは `Object3D` から読まない）を履歴に積む。ドラッグ中に `TransformControls` がアンマウントされた場合に備え、`useEffect` の cleanup でも `endTransformDrag` を dispatch する。
  - Undo/Redo は、キーボードのショートカットとヘッダのボタンから使う。ショートカットは `hooks/useUndoRedoShortcuts.ts`（`pages/Home.tsx` で呼ぶ）が `window` の `keydown` で拾い、OS は判定せず、Ctrl または Cmd（Meta）を押しながら Z で Undo、Shift + Z または Y で Redo にする。Alt を押しているときと IME の変換中、入力欄（`utils/isTextEditingElement.ts` で判定）への入力中は無視する。ヘッダには MUI アイコンのボタンを置き、有効・無効は `selectCanUndo`・`selectCanRedo` で決める。ボタンの配置は暫定で、正式な UI は親 Issue #7 のフェーズ 2 で作る。Undo/Redo で `transform` が変わったエンティティの `EntityView` だけが再描画され、R3F が前回の props との差分を適用する（`Object3D` の現在値とは比べない）ので、結果が見た目に反映される。
  - 選べるエンティティの条件は、選択と移動を確かめるための暫定。どのエンティティをクリックで選べるようにするかは、親 Issue #7 のフェーズ 2（シーンビューのクリックでの選択）で決める。R3F はイベントハンドラを持つ物とその子孫だけを raycast の対象にするので、今はハンドラを持たない手前のモデルが奥の立方体へのクリックを遮らない。モデルを選べるようにすると手前のモデルが先にヒットするようになるため、この点もフェーズ 2 の選択の設計で扱う。
  - 以前は選択中の `Object3D` を Redux（`editObj.target`）に持ち、`app/src/redux/store.ts` の middleware でそのパスを immutableCheck と serializableCheck の対象から外していた。選択を ID ベースにしたときに、この除外は取り除いた（middleware は既定のまま）。
  - 選択中のエンティティが削除されたときに選択を解除する処理はまだない（今は削除の操作がない）。削除コマンドを実装するときに扱う。

## 移行計画

プロトタイプなので段階的に進める。1〜3 は親 Issue #7 のフェーズ 1 に当たる。

1. **シーンをデータで持つ**（済み）: コアにシーンデータの型を定義し、`SceneDev` の配置をそのデータに移して、データから描画する。シーンデータは `{ id, name, transform, components }` のエンティティの配列（`SceneData.entities`）で、モデルは当面 URL で参照する。
2. **選択を ID ベースにする**（済み）: 選択を `Object3D` から `EntityId` に変える（`editObj.target` を `selection` slice の `selectedEntityId` に置き換える）。`TransformControls` に渡す `Object3D` は、描画層のレジストリで ID から引く。`store.ts` で `editObj.target` を immutableCheck・serializableCheck から外していた設定も取り除く。
3. **編集操作をコマンドにする**（済み）: 「移動」をコマンドオブジェクト（`MoveEntityCommand`）にし、Undo/Redo に対応する。`TransformControls` での操作結果は、確定時に移動コマンドとしてデータへ書き戻す。「追加」「削除」などのコマンドは、必要になった時点で足す。
4. **ゲームロジックが増えたら ECS を入れる**: 候補は koota（pmndrs）、miniplex、bitecs。1〜3 ができていれば、データ構造を移すだけで済む。

1〜3 で、保存・読み込みとインスペクタの土台（シリアライズできるシーンデータと ID ベースの選択）と、Undo/Redo が使える状態ができた。
