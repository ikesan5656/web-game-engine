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
- `scene/transform.ts`: `Transform`（位置・回転・スケール）、`createDefaultTransform`
- `scene/components.ts`: `Component`（`mesh`・`model`・`directionalLight` の判別共用体）と、各コンポーネント・形状・マテリアルの型
- `scene/entity.ts`: `Entity`（`{ id, name, transform, components }`）、`findComponent`
- `scene/sceneData.ts`: `SceneData`（`{ entities: Entity[] }`）

データには次の約束がある。型では強制していないものも含む。

- **保存するデータの型では、省略可能なプロパティ（`?:`）を使わない**: 値がないときは `null` を入れる。`undefined` は JSON にすると消え、保存と読み込みで形が変わるため。`findComponent` などの関数が見つからないときに `undefined` を返すのは対象外。
- **数値は有限の値だけにする**: `NaN`・`Infinity` は JSON にすると `null` になるため。
- **回転はオイラー角（ラジアン）で、順序は `XYZ` に固定する**: three の `Euler` の既定と同じなので R3F の `rotation` にそのまま渡せ、インスペクタでも編集しやすいため。
- **`entities` の配列の順序をヒエラルキーの表示順とする**: 表示順を別のデータで持たずに済み、JSON にしても順序が保たれるため（ID をキーにしたオブジェクトでは、`"1"` のような整数に見えるキーの順序が入れ替わる）。親子関係を追加した後は、同じ親を持つエンティティ同士の順序になる。
- **同じ種類のコンポーネントは 1 つのエンティティに 1 つまで**: 描画層や `findComponent` が種類ごとに 1 つだけあるものとして扱え、インスペクタでも種類ごとに 1 つの欄を出せるようにするため。
- **モデルの URL は `public/` からの相対パスにする（先頭に `/` を付けない）**: デプロイ先（GitHub Pages のサブパス）や開発サーバーに依存させないため。`import.meta.env.BASE_URL` を前に付けるのは描画層で行う。親 Issue #7 のフェーズ 4 でアセット ID に置き換える。
- **エンティティ ID はブランド型の文字列にする**: 名前や URL などのほかの文字列と取り違えないため。新しい ID は `createEntityId`（`crypto.randomUUID`）で作り、初期データでは `toEntityId("floor")` のような固定の ID を使う。`crypto.randomUUID` はセキュアコンテキスト（`localhost` や https）でしか使えない。
- **ディレクショナルライトは Transform の回転とスケールを使わない**: three の `DirectionalLight` は位置から target（既定では原点）に向けて照らすので、向きは位置で決まるため。

親子関係はまだ持たない。親 Issue #7 のフェーズ 3 で `Entity` に `parentId: EntityId | null` を足す。エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`、ライトのヘルパー）はシーンデータに含めない。

## 状態管理の使い分け

- **エディタの操作（選択、追加、削除、プロパティの編集）**: Redux で管理する。ドラッグ中のように頻繁に起きる更新は、確定時（ドラッグ終了時など）にだけ dispatch する。
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

- `app/src/redux/slices/editObjSlice.ts` が、選択中の `Object3D` を `editObj.target` として直接保持している。クリック可能なメッシュが `setTarget(e.object)` を dispatch し（`components/webGl/ThreeBox.tsx`）、`scenesGl/SceneDev.tsx` がそのターゲットに drei の `<TransformControls>` を付けている。
  - シーンを JSON にできない、Undo/Redo を作れない、`TransformControls` で動かした位置が Redux に反映されない、という問題がある。
- シーンのオブジェクト配置は `SceneDev.tsx` に直接書かれており、データとして持っていない。
- `app/src/core/` にシーンデータの型（`EntityId`・`Transform`・`Component`・`Entity`・`SceneData`）があるが、まだ描画には使っていない。

## 移行計画

プロトタイプなので段階的に進める。1〜3 は親 Issue #7 のフェーズ 1 に当たる。

1. **シーンをデータで持つ**: コアにシーンデータの型を定義し（済み）、`SceneDev` の配置をそのデータに移して、データから描画する。シーンデータは `{ id, name, transform, components }` のエンティティの配列（`SceneData.entities`）で、モデルは当面 URL で参照する。
2. **選択を ID ベースにする**: `editObj.target` を `Object3D` から `EntityId` に変える。
3. **編集操作をコマンドにする**: 「移動」「追加」などをコマンドオブジェクトにし、Undo/Redo に対応する。`TransformControls` での操作結果は、確定時に移動コマンドとしてデータへ書き戻す。
4. **ゲームロジックが増えたら ECS を入れる**: 候補は koota（pmndrs）、miniplex、bitecs。1〜3 ができていれば、データ構造を移すだけで済む。

1 と 2 だけでも、保存と読み込み、インスペクタ、Undo の土台ができる。
