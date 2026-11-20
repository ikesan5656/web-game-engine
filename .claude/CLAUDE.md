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

TypeScript は 7 系を使う。typescript-eslint が TS7 に未対応のため、`tsc` は `@typescript/native`（`npm:typescript@7.x` の別名）から実行し、`typescript` という名前には TS6 の API を提供する公式互換パッケージ `@typescript/typescript6` を入れている。どちらかを更新するときは、この組み合わせを崩さないこと。

## ブランチ運用

開発の起点は `develop`。作業ブランチは `develop` から切り、PR も `develop` 向けに出す（`gh pr create --base develop`）。`main` は first commit のまま使っていない。

## サブエージェントの使い方

`implementer` に実装を任せたら、終わった後に `code-reviewer` と `quality-checker` を**並行して**起動し、`implementer` が報告した変更ファイルの一覧を両方に渡す

- どちらかで指摘があれば、内容をまとめて `implementer` に修正を依頼し、修正後にもう一度両方に確認させる
- 指摘がなくなったら、レビュー結果とチェック結果をユーザーに報告する

## アーキテクチャ

入口: `app/src/main.tsx` → `pages/Home` → `container/EditorCanvas`（R3F の `<Canvas>`）→ `scenesGl/SceneDev`

- `scenesGl/`: シーンの構成（現状は開発用シーンのみ）
- `components/webGl/`: 再利用する R3F 部品（カメラ操作、ライト、モデルなど）
- `components/`・`styles/components/`: MUI の UI 部品
- `redux/`: エディタの状態

設計の詳しい説明、各方針の理由、移行計画は `docs/architecture.md` にある。設計に関わる変更をするときは先に読むこと。

### 設計方針

Ports and Adapters（ヘキサゴナルアーキテクチャ）を参考にし、**シーンをデータで持ち、three.js はそのデータを表示する層として扱う**。

- 正となるデータは three.js の外に置く。`Object3D` は描画の結果であって、Redux などの state には保持しない。選択などは ID で持つ
- 依存の向きは「UI・描画・保存 → エディタ → コア」の一方向だけにする
- コア（予定: `app/src/core/`）は純粋な TypeScript で書き、`three`・`react`・`redux` を import しない。ベクトルなどは `[x, y, z]` のような単純な型で持ち、描画層で変換する
- 編集操作（移動・追加・削除など）はコマンドとして実装し、Undo できるようにする
- 毎フレーム変わる値は React の state や Redux を通さず、`useFrame` の中で ref などを直接更新する。この部分は性能を優先し、層を挟まずに書いてよい
- 「クリーンアーキテクチャ」などの名前に合わせて、UseCase・Repository・Presenter といった層を増やさない

### 現状と方針の差

移行前の暫定実装が残っている。既存の挙動を保つタスクであればそのまま使ってよいが、新しいコードでは同じ書き方を広げないこと。

- `redux/slices/editObjSlice.ts` が `Object3D` を `editObj.target` に直接保持している
- シーンのオブジェクト配置は、データではなく `SceneDev` に直接書かれている
