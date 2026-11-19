# WebGameEngine
このプロジェクトはReactで作成された、Web用ゲームエンジン。

## Language Preference
常に日本語で返答してください。すべての応答、説明、コメントは日本語で行ってください。

## 概要

React + TypeScript + Vite で構築したブラウザ向け 3D エディタ／ゲームエンジンのプロトタイプ。描画は `@react-three/fiber` と `@react-three/drei` 経由で three.js を使用する。glTF と MMD（PMD/PMX モデル、VMD モーション）アセットを読み込む。コード中のコメントや UI テキストは日本語。

アプリ本体は `app/` 配下にある。ルートの `package.json` には不要な `vite-tsconfig-paths` の devDependency があるだけなので、コマンドはすべて `app/` で実行する。パッケージマネージャーは **pnpm**。

## コマンド（`app/` で実行）

```shell
pnpm i              # 依存パッケージのインストール
pnpm run dev        # Vite 開発サーバー起動（http://localhost:3000）
pnpm run build      # tsc -b && vite build（型チェック＋バンドル）
pnpm run lint       # eslint .
pnpm run preview    # 本番ビルドのプレビュー
```

テストフレームワークは未導入。

## ブランチ運用

開発の起点は `develop`。作業ブランチは `develop` から切り、PR も `develop` 向けに出す（`gh pr create --base develop`）。`main` は first commit のまま使っていない。

## サブエージェントの使い方

`implementer` に実装を任せたら、終わった後に `code-reviewer` と `quality-checker` を**並行して**起動し、`implementer` が報告した変更ファイルの一覧を両方に渡す

- どちらかで指摘があれば、内容をまとめて `implementer` に修正を依頼し、修正後にもう一度両方に確認させる
- 指摘がなくなったら、レビュー結果とチェック結果をユーザーに報告する

## アーキテクチャ

**描画ツリー:** `main.tsx`（Redux `Provider`）→ `App` → `pages/Home`（ヘッダー＋遅延読み込みのエディタ）→ `container/EditorCanvas` → `scenesGl/SceneDev`

- `EditorCanvas` は R3F の `<Canvas>` を持ち、`hooks/useResizeObserver` で取得したサイズを明示的に指定する。また `config/keyConfig.ts` のキーマップを使って drei の `<KeyboardControls>` で囲んでいる。何もない場所をクリックする（`onPointerMissed`）と選択が解除される。
- `scenesGl/` にはシーンの構成を置く（現状は開発用シーンのみ）。シーンは `components/webGl/` のカメラ制御、ライト、ヘルパー、モデルを組み合わせて作る。モデルの差し替えや表示切り替えはここで行う（実験用にいくつかコメントアウトされている）。
- `components/webGl/` には再利用可能な R3F コンポーネントを置く。`CameraControl` は `useFrame` 内でキーボード操作によるカメラ移動を実装している（WASD／矢印キーで移動、Q/E でワールド Y 軸周りに回転）。キー状態は `useKeyboardControls` で取得するため、`KeyboardControls` の内側で描画する必要がある。

**選択／編集:** `redux/slices/editObjSlice.ts` が選択中の `three.Object3D` を `editObj.target` として保持する。クリック可能なメッシュは `setTarget(e.object)` を dispatch し（`ThreeBox` 参照）、`SceneDev` はそのターゲットに drei の `<TransformControls>` を付ける。シリアライズ不可能な three.js オブジェクトを Redux の state に直接入れている点に注意。`useSelector` は `redux/store.ts` から export している型付きのものを使う。

**スタイリング:** MUI の `styled`／Emotion を使用。共通の styled コンポーネントは `styles/components/` にある。

## import パス

`tsconfig.json` で `baseUrl: "src"` を設定し、`vite-tsconfig-paths` で解決しているため、`src/` からの相対パスをそのまま書いて import する（例: `import { store } from "redux/store"`、`components/webGl/MMDModel`）。古いファイルには相対パスの import が残っているものもある。

## 3D アセット

- `app/public/` の glTF/GLB ファイルは絶対 URL で読み込む（例: `useLoader(GLTFLoader, "/AvatarSample_M_converted.glb")`）。
- MMD アセットは `app/src/assets/`（`miku/`、`hotaru/`）にある。`vite.config.ts` で `.pmx/.pmd/.vmd` を `assetsInclude` に追加し、`src/global.d.ts` で文字列モジュールとして型宣言している。URL は `new URL("../assets/...", import.meta.url).href` で解決すること。単なる相対パスの文字列を渡すと開発サーバーが HTML の 404 ページを返し、`MMDLoader` がそれを誤って解析してしまう。
- MMD コンポーネント（`MMDModel`、`MMDModelWithAnim`）は three の `MMDLoader` と `MMDAnimationHelper` を `physics: false` で使用している。ammo.js による物理演算はまだ組み込まれていない（TODO）。
