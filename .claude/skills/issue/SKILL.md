---
name: issue
description: 指定した GitHub Issue に着手し、修正して PR を作成する。引数がなければ、既存 Issue に着手するか新規起票するかを聞く
argument-hint: "[issue番号 または URL]"
disable-model-invocation: true
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(git status:*), Bash(git diff:*), Bash(git switch:*), Bash(git pull:*), Bash(pnpm --dir app exec eslint:*), Bash(pnpm --dir app exec tsc -b)
---

# Issue 対応

## 0. 引数の確認

- $ARGUMENTS に Issue 番号または URL があれば、「A. 既存 Issue の修正」に進む。
- $ARGUMENTS が空なら、作業を始めずにユーザーに次のどちらかを聞く。判断の助けとして `gh issue list --state open --limit 10` の結果も見せる。
  - **既存の Issue に着手する** → 番号を聞いて「A. 既存 Issue の修正」へ
  - **新しく起票する** → 「B. 新規起票」へ

## A. 既存 Issue の修正

1. `gh issue view <番号> --comments` で本文とコメントを読む。内容が曖昧で修正方針を決められないときは、作業前にユーザーに確認する
2. `develop` に切り替えて `git pull` で最新にし、そこから作業ブランチ `fix/issue-<番号>` を作る（開発の起点は `develop`。`main` は使わない）
3. 関連ファイルを調べ、修正を実装する（`.claude/rules/` のルールに従う）
4. 変更したファイルだけを確認する
   - `pnpm --dir app exec eslint <変更したファイル>`
   - `pnpm --dir app exec tsc -b`（既存エラーのため終了コードは常に 1。変更したファイルの行が出ていないかで判断する）
5. 変更内容の要約と差分をユーザーに見せ、コミット・push・PR 作成の了承を取る
6. 了承されたら、日本語のメッセージでコミットし、push して `gh pr create --base develop` で `develop` 向けの PR を作る。PR 本文には `Closes #<番号>` と変更の要約を書く
7. 作成した PR の URL を報告する

## B. 新規起票

1. 何を起票したいかユーザーに聞く（不具合か機能追加か、内容、再現手順や期待する動き）
2. 必要に応じて関連コードを調べ、原因の候補や影響しそうなファイルを把握する
3. タイトルと本文の案を日本語で作り、ユーザーに見せて了承を取る。本文の構成:
   - **概要**: 何が問題か／何を追加したいか
   - **再現手順・期待する動き**（不具合の場合）
   - **関連ファイル**: 調べて分かった範囲で
4. 了承されたら `gh issue create --title "<タイトル>" --body "<本文>"` で起票し、Issue の URL を報告する
5. そのまま着手するかユーザーに聞き、着手するなら作成した番号で「A. 既存 Issue の修正」に進む
