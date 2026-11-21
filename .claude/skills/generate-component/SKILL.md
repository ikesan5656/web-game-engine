---
name: generate-component
description: WebGameEngine（app/src）に React コンポーネントを新しく作成する。MUI の UI 部品（ヘッダー、パネル、ボタン、メニューなど）と、R3F（@react-three/fiber / drei）の 3D 部品（メッシュ、ライト、モデル表示、ヘルパー、カメラ操作、クリック位置の取得など）の両方に対応。「〜コンポーネントを作って」「〜を表示する部品を追加して」「シーンに置く〇〇を作りたい」「パネル／ボタンを作って」「〇〇したら△△が出るやつ作って」など、新しい .tsx 部品を作る依頼では、コンポーネントという言葉がなくても必ずこのスキルを使うこと。
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(pnpm --dir app exec eslint:*), Bash(pnpm --dir app exec tsc -b), Bash(git status:*)
---

# コンポーネント作成

このプロジェクトのルールに合わせて、コンポーネントを1つ（UI なら styled 部品も）作る。**作成と確認までが範囲**で、既存ファイルの変更やシーン／ページへの組み込みは行わない。組み込みはユーザーが別途指示する。

## 1. 種類を判断する

| 種類      | 判断の目安                                                                                                              | 置き場所                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 3D（R3F） | `<Canvas>` の中に置くもの。メッシュ、ライト、モデル、ヘルパー、`useFrame` で動かすもの、3D 空間のクリックに反応するもの | `app/src/components/webGl/<Name>.tsx`                                                      |
| UI（MUI） | Canvas の外の画面部品。「パネル」「画面に表示」「ボタン」「メニュー」と言われたものはこちら                             | `app/src/components/<Name>.tsx`（スタイルは `app/src/styles/components/Styled<Name>.tsx`） |

**止まって確認するのは、種類そのものが判断できないときだけ**にする（例：「選択中のオブジェクトの名前を出して」だけで、3D 空間内のラベルか画面のパネルか分からない）。種類を間違えると全部作り直しになるが、それ以外の細かい解釈（ローカル座標かワールド座標か、既存の地面をどう扱うか、など）は妥当な方を選んで進め、選んだ内容を最後の報告に書く。そのほうがユーザーの手間が少ない。

作る前に `app/src/components/` を見て、似た部品がないか確認する。あっても新しく作ってよいが、報告で「既存の `〇〇` を拡張する形にもできる」と触れる。

## 2. 共通ルール

`.claude/rules/code-style.md` に従う。

- **named export のみ**（`export const Foo = () => ...`）。default export は使わない。
- **`any` 禁止**。props は `interface <Name>Props` で型を書く。three.js の型は `three` から import する。
- **import は `src/` 起点のパス**（`tsconfig.json` の `paths` で `./src/*` に解決）。例: `import { useSelector } from "redux/store";`。`../` の相対パスは使わない。
- **CSS ファイルは作らない**。見た目は MUI で付ける。
- **コメントは日本語**。コンポーネントの役割を JSDoc（`/** ... */`）で1〜3行書く。
- `useSelector`・`useDispatch` は `react-redux` から直接ではなく、`redux/store` から export されている型付きのものを使う。

**既存コードはお手本にしない。** 既存ファイルには相対 import、default export、JSDoc なし、`useFrame` 内での毎回の `new Vector3()` など、上のルールより古い書き方が残っている。書き方はこのスキルの例とルールに合わせる。既存コードは「どの部品・state があるか」を知るために読む。

## 3. 3D（R3F）コンポーネント

このスキルで作る 3D 部品は、エディタ側の表示（ヘルパー、マーカーなど）や、シーンデータの描画（`components/webGl/sceneView/`）から使われる部品にする。**シーンに置く物（エンティティ）は部品を個別に作らず、シーンデータ（初期データはコアの `core/scene/devScene.ts`）に足す**。`components/webGl/sceneView/` の `SceneView`・`EntityView` がデータから描画する。

```tsx
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { noRaycast } from "components/webGl/noRaycast";

interface SpinningMarkerProps {
  position?: [number, number, number];
  size?: number;
  /** 1 秒あたりの回転量（ラジアン） */
  speed?: number;
}

/**
 * 指定した位置で回り続ける目印。クリックの対象にはしない
 */
export const SpinningMarker = ({
  position = [0, 0.5, 0],
  size = 0.3,
  speed = Math.PI / 2,
}: SpinningMarkerProps) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += speed * delta;
  });

  return (
    <mesh ref={meshRef} position={position} raycast={noRaycast}>
      <octahedronGeometry args={[size]} />
      <meshBasicMaterial color="orange" wireframe />
    </mesh>
  );
};
```

- **選択（クリックで編集対象にする）**: 選択の流れはシーンデータの描画にすでにある。部品の中で `selectEntity`・`clearSelection` を dispatch しない。
  - `EntityView` が選べるエンティティの根の `group` に `onClick` を付け、`e.stopPropagation()` してから `onSelect(entity.id)` を呼ぶ（渡すのはエンティティの ID で、`Object3D` は渡さない）
  - どのエンティティを選べるかは `SceneView` の `isSelectable` で受け取り、`scenesGl/SceneDev.tsx` が判定する。`onSelect` を受けた `SceneDev` が `selectEntity(id)` を dispatch し、選択中の ID から `useEntityObject` で引いた根の `Object3D` に `<TransformControls>` が付く
  - 何もない所（ハンドラを持たない物を含む）のクリックは `EditorCanvas` の `onPointerMissed` で `clearSelection()` を dispatch して選択を解除する
  - 選択中の物の `Object3D` が要る部品は、`useEntityObject(id)`（`components/webGl/sceneView/entityObjectRegistry.ts`）で引く。`Object3D` を Redux に入れない。`useEntityObject` は `Object3D` そのものが要る 3D のエディタ表示（`TransformControls`、ヘルパーなど）に限り、名前や位置などの値を読むためには使わない（値は ID で `scene` slice から読む。「4. UI（MUI）コンポーネント」の選択中のエンティティの情報の項目を参照）。`EntityObjectRegistryProvider` の内側（今は `SceneDev` 以下）でしか動かないことを JSDoc に書く
  - 選べる物を増やしたいときは、部品を作らず、シーンデータへのエンティティの追加と `SceneDev` の `isSelectable` の変更が必要になる。どちらも既存ファイルの変更なので、報告でその旨を伝える。`sceneView/` の部品は特定のエンティティの ID を参照しない（選べるかどうかなどの判断は props で受け取る）
- **選択以外のクリック**（クリック位置の取得など）: `selectEntity` は dispatch しない。位置は `e.point`（ワールド座標）で取れる。
- **既存の物体のクリックに反応したい**とき（例：地面をクリックしたら〜）: 既存ファイルは変更しないので、対象を `children` として受け取り `<group onClick={...}>{children}</group>` で包む形にする。包んだ物はクリックの対象になり、クリックしても `onPointerMissed` による選択解除が起きなくなるので、報告でその旨を伝える。部品が自分で描画するマーカーなどをハンドラ付きの `group` の内側に置くときは、`raycast={noRaycast}` を渡してクリックを横取りしないようにする（ハンドラを持つ物の子孫は raycast の対象になるため）。
- **毎フレームの処理**は `useFrame` に書き、移動・回転量には `delta` を掛ける（フレームレートに依存させないため）。`useFrame` 内で `new Vector3()` などを毎回作らず、`useRef` や外側の定数で使い回す。
- **キー入力**は `useKeyboardControls`。キー名は `config/keyConfig.ts` の `Controls`。`<KeyboardControls>` の内側でしか動かないことを JSDoc に書く。
- **影**: 落とす物体は `castShadow`、受ける物体は `receiveShadow`。
- **モデル読み込み**: glTF も MMD（.pmd/.pmx/.vmd）も `app/public/` に置き、`import.meta.env.BASE_URL` を基準にした URL で読む（GitHub Pages ではサブパスで公開するため、`/xxx.glb` だと 404 になる）。`BASE_URL` は自分で連結せず、`components/webGl/sceneView/resolvePublicUrl` の `resolvePublicUrl` に `public/` からの相対パス（例: `miku/miku_v2.pmd`）を渡す。パスを間違えると開発サーバーが HTML を返し、`MMDLoader` が壊れたデータとして読むので注意する。シーンに置くモデルは部品を作らず、シーンデータ（`core/scene/devScene.ts`）に `model` コンポーネントとして足せば `SceneView` が描画する。
- 何も描画しない制御用の部品は `return null` でよい。

## 4. UI（MUI）コンポーネント

styled 部品は `styles/components/` に分ける。

`app/src/styles/components/StyledSidePanel.tsx`:

```tsx
import { styled } from "@mui/material";

export const StyledSidePanel = styled("aside")(({ theme }) => ({
  width: 280,
  padding: theme.spacing(2),
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
}));
```

`app/src/components/SidePanel.tsx`:

```tsx
import { Typography } from "@mui/material";
import { StyledSidePanel } from "styles/components/StyledSidePanel";

interface SidePanelProps {
  title: string;
}

/**
 * エディタ右側に表示するパネル
 */
export const SidePanel = ({ title }: SidePanelProps) => {
  return (
    <StyledSidePanel>
      <Typography variant="subtitle1">{title}</Typography>
    </StyledSidePanel>
  );
};
```

- ボタンや入力欄は MUI の部品（`Button`、`TextField`、`Typography` など）を使う。一度しか使わない小さな調整は `sx` でよい。
- **選択中のエンティティの情報を表示するときの注意**: 選択は Redux の `selection` slice に ID（`selectedEntityId`、未選択は `null`）で持っている。表示する値（名前、位置など）は、その ID で `scene` slice のエンティティから読むのが原則で、Canvas の外の UI から `Object3D` を直接読む書き方はしない（`useEntityObject` は `Object3D` そのものが要る 3D のエディタ表示のためのもので、値の読み取りには使わない）。ただし今は `TransformControls` で動かした位置がシーンデータに書き戻されない（編集操作をコマンドにするまで）ので、`scene` slice の位置は動かす前の値のままになる。位置を表示する部品を作るときは、報告でその旨を伝える。
- 名前を表示するときはエンティティの `name`（`Entity.name`）を使う。空の場合に備えて、空のときの表示（例：「(名前なし)」）を用意する。

## 5. 作ったファイルだけを確認する

プロジェクトに以前からある lint／型エラーが残っていることがある。**作ったファイル以外のエラーはすべて範囲外**なので直さない。

1. lint（作ったファイルをすべて指定）:
   ```shell
   pnpm --dir app exec eslint src/components/SidePanel.tsx src/styles/components/StyledSidePanel.tsx
   ```
2. 型チェック:
   ```shell
   pnpm --dir app exec tsc -b
   ```
   既存エラーがあると終了コードが 1 になるので、終了コードではなく、出力に作ったファイル名の行があるかで判断する。
3. 整形の確認（作ったファイルをすべて指定）:
   ```shell
   pnpm --dir app exec prettier --check src/components/SidePanel.tsx src/styles/components/StyledSidePanel.tsx
   ```
   差分があれば `--check` を `--write` に替えて整形する。`app/` の `pnpm run format`・`pnpm run format:check` はプロジェクト全体が対象になるので、ここでは使わない。
4. 作ったファイルにエラーや整形の差分があれば直して再実行する。

## 6. 報告

- 作ったファイル（リンク付き）と、3D／UI のどちらとして作ったか
- props の一覧（名前・型・デフォルト値）
- 自分で決めた解釈（座標の種類、地面の扱い方など）と、似た既存部品があればその旨
- 使い方の例（数行の JSX）。3D なら `scenesGl/SceneDev.tsx`（エディタ側の表示として置く部品）、UI なら `pages/Home.tsx` に置く想定。UI を Canvas の上に重ねる場合は `position: "absolute"` の `Box` で包む例にする
- **動作確認に必要な前提が今のシーンにないとき**はその旨（例：選択できる物体がシーンにないので、パネルは常に「未選択」になる）
- lint・型チェック・整形の確認の結果（作ったファイルにエラーや差分がないこと）
