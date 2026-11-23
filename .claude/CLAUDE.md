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

Issue 対応は `/issue` スキルの流れ（① 要件定義 `doc-reviewer` → ② 設計 `planner`（UI に関わるときは `ui-designer` も。Penpot にないデザインは了承後に `ui-designer` が Penpot へ反映する） → ③ 実装 `implementer`・`doc-writer`（実装中に Penpot の追加修正が要ると分かったときだけ `ui-designer` も） → ④ レビュー `code-reviewer`・`quality-checker`（UI に関わるときは `design-reviewer` も） → ⑤ 動作確認 → PR 作成）に従う。新規 Issue は、ユーザーが要件を了承してから起票する。各工程の終わりにユーザーの了承を取り、進捗は Issue の工程ごとのコメントと本文最上部のステータス欄に記録する。サブ Issue が完了として閉じられたり開き直されたりすると、GitHub Actions（`.github/workflows/update-parent-issue.yml`）が、親 Issue の本文のチェックリストで行末に子の番号だけが並ぶ項目を、すべて完了なら `[x]`、そうでなければ `[ ]` に合わせる。番号の書き方と注意点は `/issue` スキルの「B. 新規起票」を参照。

サブエージェントは、報告を要点のみにし、最後に「ユーザーの判断が必要な点」の見出しを設けて書く（`quality-checker` は対象外）。対象は次のもの。各項目に選択肢・推奨案・理由を短く添え、簡潔さより優先して省略しない。なければ「なし」と書く。

- 複数案があり選択が必要なもの
- 要件・設計にない判断や、要件・設計から外れるもの
- 既存の挙動や設計方針に影響するもの

メインは、報告を受けたら次の工程や再依頼に進む前に、この項目を削らず、選択肢・推奨案・理由を保ったままユーザーに提示する。選択が必要なものは AskUserQuestion で示す（`/issue` スキルの「判断が必要なとき」と同じ形）。

ドキュメント（`*.md`、`docs/`、`.claude/` 配下など）の作成・更新は、メインや `implementer` では行わず `doc-writer` に任せる。コードの変更もあるときは、`implementer` と `doc-writer` を**並行して**起動する。

UI に関わる Issue では、Penpot を扱う `ui-designer` を使う。UI に関わらない Issue では起動しない。Penpot のファイル（名前・file-id）は、Issue の本文・コメントにあるものを渡す（なければ `docs/penpot.md` の対応表のファイルを使い、どちらにもなければユーザーに聞く）。② で得たファイルと、② で変更したシェイプ（名前の経路と shape-id）は ② の工程コメントに残し、③・④ でも再利用する。②③④ の工程コメントには、その工程で変更したシェイプを、上書きするときも消さず累積して書く。`ui-designer` は Penpot のファイルを新規作成せず（MCP ではファイルを作れない）、接続された既存のファイルの中にページやボードを足すことだけをする。

Penpot の MCP は、応答が遅く不安定で、`execute_code` の出力がコンテキストを圧迫するので、読み方に決まりがある。メインは `ui-designer`・`design-reviewer` に `docs/penpot.md` の「Issue 対応でのデザインの扱い（#26）」（主要シェイプの対応表・読み方の決まり）を読ませ、工程コメントなどのシェイプ（名前の経路と shape-id）を渡す。エージェントは、渡されたシェイプとその近くだけを読み、`execute_code` では要るプロパティだけを返させ、編集はまとめる。この受け渡しは、起動と再確認のたびに行う。MCP は接続しているタブで開いているファイルに対して動くので、起動する前に、ユーザーに対象のファイルを開いて File → MCP Server → Connect を選ぶよう頼む。`ui-designer` と `design-reviewer` は同じ接続を使うので、同時に起動しない。接続が切れたときの流れは `/issue` スキルの「Penpot の接続切れ」に従う。Penpot のボードを足したり変えたりしたとき、または報告に `docs/penpot.md` の対応表との食い違いがあるときは、その工程の中で `doc-writer` に対応表を更新させ、`doc-reviewer` と `prettier --check` の対象に含める。Penpot のデザインを変えた Issue では、PR 作成の前に、メインが `designs/scripts/export-penpot.mjs` で `.penpot` を書き出す。リポジトリは公開なので、コミットするのは、その Issue で変えたファイルの `.penpot` のうち、ユーザーが了承したものだけにする（`/issue` スキルの「PR 作成」を参照）。

- ② 設計: `planner` と**並行して**起動し、Penpot を読んで UI 設計（画面構成・使う既存部品・色・余白・状態など）をまとめさせる。Penpot に必要なデザインがない（または変える必要がある）ときは、既存のデザイン（配色・余白・既存部品）に合わせて設計させ、Penpot への反映が必要かと反映する内容も報告させる。設計の要約をユーザーが了承したら、② の中で `ui-designer` を再度起動し、Penpot のファイル・了承された UI 設計・反映する内容を渡して、接続された既存のファイルに反映させる（新規ファイルは作らない）。変更したシェイプをユーザーに示し、Penpot（`http://localhost:9001`）で該当のボードを見て了承を取る（修正を求められたら `ui-designer` に直させて繰り返す）。この Penpot を実装前に `design-reviewer` にレビューさせることはしない。Penpot に必要なデザインがすでにあれば、反映の手順は行わない
- ③ 実装: `implementer` は、② で Penpot に反映したデザインを正として実装する。実装中に Penpot の追加修正が要ると分かったときなど、例外的な場合だけ、`implementer`・`doc-writer` と**並行して** `ui-designer` を起動する。変更した Penpot のシェイプは、② で変更したシェイプと合わせて ④ に渡す。報告に「UI 設計の更新点」があれば、ユーザーに示して `implementer` に追加で依頼する

`implementer`・`doc-writer`（起動したときは `ui-designer` も）の作業が終わったら、`code-reviewer` と `quality-checker` を**並行して**起動し、両方が報告した変更ファイルの一覧を渡す。ドキュメント（`*.md`、`docs/`、`.claude/` 配下など）を変更していれば、`doc-reviewer` も同時に必ず起動する（コードを変更していなければ `doc-reviewer` だけを起動する）。UI に関わる変更（UI のコード変更または Penpot の修正）があれば、`design-reviewer` も同時に起動し（`ui-designer` を起動したときは、その作業が終わってから）、Penpot のファイルと、② と ③ で変更したシェイプの両方を渡す。

- いずれかで指摘があれば、コードの指摘は `implementer`、ドキュメントの指摘は `doc-writer`、Penpot の指摘は `ui-designer` に修正を依頼し（複数あれば並行して。ただし `ui-designer` と `design-reviewer` は同時に起動しない）、修正後に起動したエージェントすべて（`design-reviewer` を含む）にもう一度確認させる（`design-reviewer` には ②③④ で変更したシェイプを渡す。軽微な修正なら再レビューを省ける。細かい条件は `.claude/skills/issue/SKILL.md` の④に従う）
- 指摘がなくなったら、lint とフォーマットを確認し（ドキュメントを変更していれば、メインが `prettier --check` も実行する。`app/` の外のファイルには `--config .prettierrc.json` を付ける）、レビュー結果・チェック結果と、ユーザーが画面で確認すべき箇所を報告する

軽微な修正なら、レビュー（`code-reviewer`・`doc-reviewer`・`design-reviewer`）だけを省いてよい。lint・型チェック・フォーマットなどの機械的な確認は省かない。省く前に、軽微と判断した理由を添えてユーザーに伝える。迷ったら軽微として扱わない。

- 軽微とするもの（次のどれかで、下の「含めないもの」に当たらないもの）: 誤字・脱字・文言・コメントの修正／レビューの指摘を、指摘の修正案どおりに直しただけの修正（再レビューを省く）／挙動を変えない数行程度の変更（1 ファイル内で完結する命名の変更、整形など）／Penpot の画面上の文言・誤字の修正だけ
- 軽微に含めないもの（必ずレビューする）: Penpot のレイアウト・色・部品の変更（② または ③ で変えたときは、コードの変更が軽微でも ④ で `design-reviewer` を必ず起動する）、設定・権限・フック（`.claude/settings*.json`、`.claude/hooks/`）とエージェントやスキルの定義（`.claude/agents/`、`.claude/skills/`）の変更（誤字の修正や、指摘を修正案どおりに直した修正も含む）、CLAUDE.md・`.claude/rules/`・`docs/architecture.md` の方針の変更、設計や挙動に関わる変更

## アーキテクチャ

入口: `app/src/main.tsx` → `pages/Home` → `container/EditorCanvas`（R3F の `<Canvas>`）→ `scenesGl/SceneDev`。`pages/Home` は Header とパネル配置（`EditorPanel`）を組み、Scene パネルに `container/EditorCanvas` を置く

- `scenesGl/`: シーンの構成（現状は開発用シーンのみ）。シーンデータの描画と、エディタ側の表示（カメラ操作、ギズモ、グリッド、`TransformControls`）を組み合わせる
- `components/webGl/`: 再利用する R3F 部品（カメラ操作、ライト、モデルなど）
- `components/webGl/sceneView/`: シーンデータ（エンティティの配列）の描画と、ID から根の `Object3D` を引くレジストリ（`entityObjectRegistry.ts`・`EntityObjectRegistryProvider`）
- `components/webGl/editorCamera/`: エディタカメラの計算・操作の判定・フライスルーのキー入力
- `components/`・`styles/components/`: MUI の UI 部品。パネルの枠（`components/EditorPanel.tsx`、配置の `styles/components/StyledEditorLayout.tsx`）もここに置く。パネルの色は定数 `styles/editorColors.ts` にまとめる
- `redux/`: エディタの状態（選択の `selection` slice、Undo/Redo の履歴の `history` slice、ドラッグ中の一時状態の `transformEdit` slice など）とシーンデータ（`scene` slice）。編集操作のコマンドの実行・Undo・Redo は `redux/commands.ts` の thunk を通す
- `hooks/`・`utils/`: Undo/Redo のショートカット（`hooks/useUndoRedoShortcuts.ts`）、入力欄の判定（`utils/isTextEditingElement.ts`）
- `core/`: シーンデータの型と初期データ（`core/scene/devScene.ts`）、コマンドの型と適用・取り消し（`core/command/`）など。`three`・`react`・`redux` に依存しない純粋な TypeScript

設計の詳しい説明、各方針の理由、移行計画は `docs/architecture.md` にある。設計に関わる変更をするときは先に読むこと。

エディタの操作方法（マウス・キーの割り当て）は `docs/editor-controls.md` にある。操作やショートカットを追加・変更するとき、操作について聞かれたときに読む。変更したら `doc-writer` に更新させ、`docs/architecture.md` のエディタカメラの操作一覧も合わせる。

Penpot の起動・MCP の接続・書き出しの手順と、Issue 対応でのデザインの扱い（ファイルとシェイプの指し方、主要シェイプの対応表、描画の倍率（等倍）、読み方の決まり、接続切れの流れ）は `docs/penpot.md` にある。メインは、`ui-designer`・`design-reviewer` に渡すシェイプを探すときに読み、エージェントにも読ませる。Penpot のシェイプを変えたら `doc-writer` に更新させる。

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
