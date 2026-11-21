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
pnpm run dev        # Vite 開発サーバー起動（http://localhost:3000/web-game-engine/）
pnpm run build      # tsc -b && vite build（型チェック＋バンドル）
pnpm run lint       # eslint .
pnpm run format     # prettier --write .
pnpm run format:check # prettier --check .
pnpm run preview    # 本番ビルドのプレビュー（http://localhost:4173/web-game-engine/）
```

テストフレームワークは未導入。

TypeScript は 7 系を使う。typescript-eslint が TS7 に未対応のため、`tsc` は `@typescript/native`（`npm:typescript@7.x` の別名）から実行し、`typescript` という名前には TS6 の API を提供する公式互換パッケージ `@typescript/typescript6` を入れている。どちらかを更新するときは、この組み合わせを崩さないこと。

## ブランチ運用

開発の起点は `develop`。作業ブランチは `develop` から切り、PR も `develop` 向けに出す（`gh pr create --base develop`）。`main` は first commit のまま使っていない。GitHub 上のデフォルトブランチも `develop` で、PR の `Closes #<番号>` による Issue のクローズと、Issue のイベントで動く GitHub Actions は、`develop` を基準に動く。

`develop` に push すると、GitHub Actions（`.github/workflows/deploy.yml`）が GitHub Pages（`https://ikesan5656.github.io/web-game-engine/`）に公開する（Actions タブから手動でも実行できる）。

## サブエージェントの使い方

Issue 対応は `/issue` スキルの流れ（① 要件定義 `doc-reviewer` → ② 設計 `planner` → ③ 実装 `implementer`・`doc-writer` → ④ レビュー `code-reviewer`・`quality-checker` → ⑤ 動作確認 → PR 作成）に従う。新規 Issue は、ユーザーが要件を了承してから起票する。各工程の終わりにユーザーの了承を取り、進捗は Issue の工程ごとのコメントと本文最上部のステータス欄に記録する。サブ Issue が完了として閉じられたり開き直されたりすると、GitHub Actions（`.github/workflows/update-parent-issue.yml`）が、親 Issue の本文のチェックリストで行末に子の番号だけが並ぶ項目を、すべて完了なら `[x]`、そうでなければ `[ ]` に合わせる。番号の書き方と注意点は `/issue` スキルの「B. 新規起票」を参照。

サブエージェントは、報告を要点のみにし、最後に「ユーザーの判断が必要な点」の見出しを設けて書く（`quality-checker` は対象外）。対象は次のもの。各項目に選択肢・推奨案・理由を短く添え、簡潔さより優先して省略しない。なければ「なし」と書く。

- 複数案があり選択が必要なもの
- 要件・設計にない判断や、要件・設計から外れるもの
- 既存の挙動や設計方針に影響するもの

メインは、報告を受けたら次の工程や再依頼に進む前に、この項目を削らず、選択肢・推奨案・理由を保ったままユーザーに提示する。選択が必要なものは AskUserQuestion で示す（`/issue` スキルの「判断が必要なとき」と同じ形）。

ドキュメント（`*.md`、`docs/`、`.claude/` 配下など）の作成・更新は、メインや `implementer` では行わず `doc-writer` に任せる。コードの変更もあるときは、`implementer` と `doc-writer` を**並行して**起動する。

`implementer`・`doc-writer` の作業が終わったら、`code-reviewer` と `quality-checker` を**並行して**起動し、両方が報告した変更ファイルの一覧を渡す。ドキュメント（`*.md`、`docs/`、`.claude/` 配下など）を変更していれば、`doc-reviewer` も同時に必ず起動する（コードを変更していなければ `doc-reviewer` だけを起動する）。

- いずれかで指摘があれば、コードの指摘は `implementer`、ドキュメントの指摘は `doc-writer` に修正を依頼し（両方あれば並行して）、修正後に起動したエージェントすべてにもう一度確認させる（軽微な修正なら再レビューを省ける。細かい条件は `.claude/skills/issue/SKILL.md` の④に従う）
- 指摘がなくなったら、lint とフォーマットを確認し（ドキュメントを変更していれば、メインが `prettier --check` も実行する。`app/` の外のファイルには `--config .prettierrc.json` を付ける）、レビュー結果・チェック結果と、ユーザーが画面で確認すべき箇所を報告する

軽微な修正なら、レビュー（`code-reviewer`・`doc-reviewer`）だけを省いてよい。lint・型チェック・フォーマットなどの機械的な確認は省かない。省く前に、軽微と判断した理由を添えてユーザーに伝える。迷ったら軽微として扱わない。

- 軽微とするもの（次のどれかで、下の「含めないもの」に当たらないもの）: 誤字・脱字・文言・コメントの修正／レビューの指摘を、指摘の修正案どおりに直しただけの修正（再レビューを省く）／挙動を変えない数行程度の変更（1 ファイル内で完結する命名の変更、整形など）
- 軽微に含めないもの（必ずレビューする）: 設定・権限・フック（`.claude/settings*.json`、`.claude/hooks/`）とエージェントやスキルの定義（`.claude/agents/`、`.claude/skills/`）の変更（誤字の修正や、指摘を修正案どおりに直した修正も含む）、CLAUDE.md・`.claude/rules/`・`docs/architecture.md` の方針の変更、設計や挙動に関わる変更

## アーキテクチャ

入口: `app/src/main.tsx` → `pages/Home` → `container/EditorCanvas`（R3F の `<Canvas>`）→ `scenesGl/SceneDev`

- `scenesGl/`: シーンの構成（現状は開発用シーンのみ）。シーンデータの描画と、エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`）を組み合わせる
- `components/webGl/`: 再利用する R3F 部品（カメラ操作、ライト、モデルなど）
- `components/webGl/sceneView/`: シーンデータ（エンティティの配列）の描画と、ID から根の `Object3D` を引くレジストリ（`entityObjectRegistry.ts`・`EntityObjectRegistryProvider`）
- `components/`・`styles/components/`: MUI の UI 部品
- `redux/`: エディタの状態（選択の `selection` slice、Undo/Redo の履歴の `history` slice、ドラッグ中の一時状態の `transformEdit` slice など）とシーンデータ（`scene` slice）。編集操作のコマンドの実行・Undo・Redo は `redux/commands.ts` の thunk を通す
- `hooks/`・`utils/`: Undo/Redo のショートカット（`hooks/useUndoRedoShortcuts.ts`）、入力欄の判定（`utils/isTextEditingElement.ts`）
- `core/`: シーンデータの型と初期データ（`core/scene/devScene.ts`）、コマンドの型と適用・取り消し（`core/command/`）など。`three`・`react`・`redux` に依存しない純粋な TypeScript

設計の詳しい説明、各方針の理由、移行計画は `docs/architecture.md` にある。設計に関わる変更をするときは先に読むこと。

### 設計方針

Ports and Adapters（ヘキサゴナルアーキテクチャ）を参考にし、**シーンをデータで持ち、three.js はそのデータを表示する層として扱う**。

- 正となるデータは three.js の外に置く。`Object3D` は描画の結果であって、Redux などの state には保持しない。選択などは ID で持つ
- 依存の向きは「UI・描画・保存 → エディタ → コア」の一方向だけにする
- コア（`app/src/core/`）は純粋な TypeScript で書き、`three`・`react`・`redux` を import しない。ベクトルなどは `[x, y, z]` のような単純な型で持ち、描画層で変換する。ファイルは `.ts` だけにし、コア内の import も `core/...` の形で書く（`core/...` 以外や `..` を含むパスの import、動的 import、JSX は ESLint でエラーになる）
- 編集操作（移動・追加・削除など）はコマンドとして実装し、Undo できるようにする
- 毎フレーム変わる値は React の state や Redux を通さず、`useFrame` の中で ref などを直接更新する。この部分は性能を優先し、層を挟まずに書いてよい
- 「クリーンアーキテクチャ」などの名前に合わせて、UseCase・Repository・Presenter といった層を増やさない

### 現状と方針の差

移行前の暫定実装で、設計方針と食い違うものを挙げる。ほかに見つけたり、やむを得ず加えたりしたときはここに書く。既存の挙動を保つタスクであればそのまま使ってよいが、新しいコードでは同じ書き方を広げないこと。

- 現在、食い違うものはない。
