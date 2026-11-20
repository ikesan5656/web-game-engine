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
- **import は `src/` 起点のパス**（`tsconfig.json` の `paths` で `./src/*` に解決）。例: `import { setTarget } from "redux/slices/editObjSlice";`。`../` の相対パスは使わない。
- **CSS ファイルは作らない**。見た目は MUI で付ける。
- **コメントは日本語**。コンポーネントの役割を JSDoc（`/** ... */`）で1〜3行書く。
- `useSelector`・`useDispatch` は `react-redux` から直接ではなく、`redux/store` から export されている型付きのものを使う。

**既存コードはお手本にしない。** 既存ファイルには相対 import、default export、JSDoc なし、`useFrame` 内での毎回の `new Vector3()` など、上のルールより古い書き方が残っている。書き方はこのスキルの例とルールに合わせる。既存コードは「どの部品・state があるか」を知るために読む。

## 3. 3D（R3F）コンポーネント

```tsx
import { ThreeEvent, useFrame } from "@react-three/fiber";
import { useCursor } from "@react-three/drei";
import { useRef, useState } from "react";
import { Mesh, Vector3 } from "three";
import { setTarget } from "redux/slices/editObjSlice";
import { useDispatch } from "redux/store";

interface SampleSphereProps {
  position?: Vector3 | [number, number, number];
  radius?: number;
}

/**
 * クリックで選択できる、上下にゆれる球体
 */
export const SampleSphere = ({
  position = [0, 1, 0],
  radius = 0.5,
}: SampleSphereProps) => {
  const dispatch = useDispatch();
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime) * 0.2;
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    dispatch(setTarget(e.object));
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
    >
      <sphereGeometry args={[radius]} />
      <meshStandardMaterial color={hovered ? "orange" : "white"} />
    </mesh>
  );
};
```

- **選択（クリックで編集対象にする）**: `setTarget(e.object)` を dispatch すると、シーン側の `<TransformControls>` がその物体に付く。`e.stopPropagation()` で後ろの物体まで反応しないようにする。何もない所のクリックで選択解除する処理は `EditorCanvas` にすでにある。
- **選択以外のクリック**（クリック位置の取得など）: `setTarget` は dispatch しない。位置は `e.point`（ワールド座標）で取れる。
- **既存の物体のクリックに反応したい**とき（例：地面をクリックしたら〜）: 既存ファイルは変更しないので、対象を `children` として受け取り `<group onClick={...}>{children}</group>` で包む形にする。部品が自分で描画するマーカーなどは、`components/webGl/noRaycast` の `noRaycast` を `raycast={noRaycast}` で渡して（`import { noRaycast } from "components/webGl/noRaycast";`）、クリックを横取りしないようにする。
- **毎フレームの処理**は `useFrame` に書き、移動・回転量には `delta` を掛ける（フレームレートに依存させないため）。`useFrame` 内で `new Vector3()` などを毎回作らず、`useRef` や外側の定数で使い回す。
- **キー入力**は `useKeyboardControls`。キー名は `config/keyConfig.ts` の `Controls`。`<KeyboardControls>` の内側でしか動かないことを JSDoc に書く。
- **影**: 落とす物体は `castShadow`、受ける物体は `receiveShadow`。
- **モデル読み込み**: glTF は `app/public/` のファイルを `` `${import.meta.env.BASE_URL}xxx.glb` `` で読む（GitHub Pages ではサブパスで公開するため、`/xxx.glb` だと 404 になる）。MMD（.pmd/.pmx/.vmd）は `new URL("../assets/...", import.meta.url).href` で URL を作る（相対パス文字列だと開発サーバーが HTML の 404 を返し、`MMDLoader` が壊れたデータとして読むため）。
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
- **three.js オブジェクトの状態を表示するときの注意**: Redux の `editObj.target` は `Object3D` そのものを持っている。`TransformControls` で動かしても同じインスタンスのままなので、`useSelector` だけでは位置などの表示が更新されない。UI 側（Canvas の外）では `useFrame` が使えないため、`useEffect` 内で `requestAnimationFrame` を回して値を読み、変わったときだけ `setState` する。
- 選択中オブジェクトの `name` は空のことが多いので、空のときの表示（例：「(名前なし)」）を用意する。

## 5. 作ったファイルだけを確認する

プロジェクトには以前からある lint／型エラー（`SceneDev.tsx`、`GltfModel.tsx`、`MMDModel.tsx` など）が残っている。**作ったファイル以外のエラーはすべて範囲外**なので直さない。

1. lint（作ったファイルをすべて指定）:
   ```shell
   pnpm --dir app exec eslint src/components/SidePanel.tsx src/styles/components/StyledSidePanel.tsx
   ```
2. 型チェック:
   ```shell
   pnpm --dir app exec tsc -b
   ```
   既存エラーのため**終了コードは常に 1** になる。終了コードではなく、出力に作ったファイル名の行があるかで判断する。
3. 作ったファイルにエラーがあれば直して再実行する。

Prettier はまだプロジェクトに入っていないので、整形の確認は ESLint だけでよい。

## 6. 報告

- 作ったファイル（リンク付き）と、3D／UI のどちらとして作ったか
- props の一覧（名前・型・デフォルト値）
- 自分で決めた解釈（座標の種類、地面の扱い方など）と、似た既存部品があればその旨
- 使い方の例（数行の JSX）。3D なら `scenesGl/SceneDev.tsx`、UI なら `pages/Home.tsx` に置く想定。UI を Canvas の上に重ねる場合は `position: "absolute"` の `Box` で包む例にする
- **動作確認に必要な前提が今のシーンにないとき**はその旨（例：選択できる物体がシーンにないので、パネルは常に「未選択」になる）
- lint と型チェックの結果（作ったファイルにエラーがないこと）
