---
paths:
  - "app/src/assets/**"
  - "app/public/**"
  - "app/src/components/webGl/**"
  - "app/src/scenesGl/**"
  - "app/src/global.d.ts"
  - "app/vite.config.ts"
---

# 3D アセットの扱い

- `app/public/` の glTF/GLB ファイルは `import.meta.env.BASE_URL` を基準にした URL で読み込む（例: ``useLoader(GLTFLoader, `${import.meta.env.BASE_URL}AvatarSample_M_converted.glb`)``）。GitHub Pages ではサブパス（`/web-game-engine/`）で公開するため、`"/xxx.glb"` のように `/` から始まるパスだと 404 になる。`BASE_URL` は末尾が `/` なので、ファイル名をそのまま連結する
- MMD アセットは `app/src/assets/`（`miku/`、`hotaru/`）にある。`vite.config.ts` で `.pmx/.pmd/.vmd` を `assetsInclude` に追加し、`src/global.d.ts` で文字列モジュールとして型宣言している
- MMD アセットの URL は必ず `new URL("../assets/...", import.meta.url).href` で解決すること。単なる相対パスの文字列を渡すと、開発サーバーが HTML の 404 ページを返し、`MMDLoader` がそれを誤って解析してしまう
- `MMDModel`・`MMDModelWithAnim` は `MMDLoader` と `MMDAnimationHelper` を `physics: false` で使っている。three r172 で three 本体から削除されたため、`three-stdlib` から import する（`three/addons` からは読めない）。ammo.js による物理演算はまだ組み込まれていない（TODO）
