# Figma 主要ノード対応表

Figma MCP には呼び出し回数の上限がある。`ui-designer`・`design-reviewer` は、Figma を探す前にこの文書を読み、ページ全体やファイル全体を探索せずに必要なノードだけを読む。

## ファイル

- URL: https://www.figma.com/design/cJDqltVzv6bir990SJDHlM/WebGameEngine
- fileKey: `cJDqltVzv6bir990SJDHlM`
- Page 1: `0:1`

## 確認状況

この文書の node-id は、Figma 上ではまだ確認していない。次に `ui-designer` が Figma を読むときに、使うノードが対応表のとおりか確かめ、食い違いがあれば報告する。

## 描画の倍率

Figma は実寸の 2 倍で描かれている。実装の値は Figma の値の 2 分の 1 にする（例: Hierarchy の幅は Figma で 480、実装では 240px）。

## 主要ノード

- インスペクタの「選択中のオブジェクト」`7:142`: アイコン・文字色の参考
- インスペクタのコンポーネント見出し `7:201`: 見出しの色の参考（値は `get_variable_defs` で読む）
- フェーズ2時点 `15:3`
  - 3Dシーンエディター（フェーズ2時点）`15:10`
    - Hierarchy `15:36`
      - 本文 `15:43`
        - 仮の表示 `15:44`

## 更新のルール

- node-id は、Figma 上でノードを消したり作り直したりすると変わる。`ui-designer`・`design-reviewer` は、この表と食い違うノードや、新しく作った主要ノードに気づいたら、報告に書く
- Figma のフレームを足したり変えたりしたときは、メインが `doc-writer` に依頼して、この文書を更新する
