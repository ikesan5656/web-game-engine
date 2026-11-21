---
paths:
  - "app/src/assets/**"
  - "app/public/**"
  - "app/src/components/webGl/**"
  - "app/src/scenesGl/**"
  - "app/vite.config.ts"
---

# 3D アセットの扱い

- モデル（glTF/GLB・MMD）は `app/public/` に置き、`import.meta.env.BASE_URL` を基準にした URL で読み込む。GitHub Pages ではサブパス（`/web-game-engine/`）で公開するため、`"/xxx.glb"` のように `/` から始まるパスだと 404 になる
- シーンデータ（`ModelComponent` の `url`・`motionUrl`）には `public/` からの相対パス（例: `AvatarSample_M_converted.glb`、`miku/miku_v2.pmd`、`miku/vmds/wavefile_v2.vmd`）を書き、先頭に `/` を付けない。`BASE_URL` は描画層の `resolvePublicUrl`（`components/webGl/sceneView/resolvePublicUrl.ts`）でまとめて付ける。部品の中で `BASE_URL` を個別に連結しない
- MMD アセットは `app/public/miku/` にある。モデルが参照するテクスチャは、モデルのファイル内の相対パスどおりに（miku ではモデルと同じフォルダに）置く。`MMDLoader` はモデルの URL のフォルダを基準に解決するため
- パスを間違えると、開発サーバーが 404 の代わりに HTML（`index.html`）を返し、`MMDLoader` がそれを壊れたデータとして読んでしまう（エラーは「`<!d` で始まる」などの分かりにくい形になる）。MMD が読み込めないときは、まずパスを確認する。先頭が `/` のパス、スキーム付きの URL、`..` を含むパスは、開発時に `resolvePublicUrl` がコンソールに警告を出す（ファイル名の打ち間違いは警告されない）
- `app/src/assets/hotaru/` は使っておらず、配布条件を確認できていないため `app/src/assets/` に残している。`app/public/` に置かないこと（`public/` のファイルはそのままデプロイ先に公開される）
- `MMDModel` は `MMDLoader` と `MMDAnimationHelper` を `physics: false` で使っている。three r172 で three 本体から削除されたため、`three-stdlib` から import する（`three/addons` からは読めない）。ammo.js による物理演算はまだ組み込まれていない（TODO）
