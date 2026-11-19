---
name: issue
description: 指定した GitHub Issue に着手し、修正して PR を作成する。引数がなければ、既存 Issue に着手するか、.github/ISSUE_TEMPLATE のテンプレートに沿って新規起票するかを聞く
argument-hint: "[issue番号 または URL]"
disable-model-invocation: true
allowed-tools: Bash(ls .github/ISSUE_TEMPLATE), Bash(gh issue view:*), Bash(gh issue list:*), Bash(git status:*), Bash(git diff:*), Bash(git switch:*), Bash(git pull:*), Bash(pnpm --dir app exec eslint:*), Bash(pnpm --dir app exec tsc -b)
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

Issue テンプレートは `.github/ISSUE_TEMPLATE/` にある。現在のテンプレート:

!`ls .github/ISSUE_TEMPLATE`

1. 何を起票したいかユーザーに聞く（不具合か機能追加か、内容、再現手順や期待する動き）
2. 内容に合うテンプレートを選んで Read する。各テンプレートの frontmatter の `name`／`about` で判断し、どれに当たるか迷うときはユーザーに聞く
3. 必要に応じて関連コードを調べ、原因の候補や影響しそうなファイルを把握する
4. テンプレートに従ってタイトルと本文の案を日本語で作る
   - **タイトル**: frontmatter の `title`（例: `[バグ] `、`[Feature] `）を先頭に付ける
   - **本文**: テンプレートの見出し（`## 〜`）を同じ順番ですべて残し、各見出しの下を埋める
     - `<!-- -->` のコメントは書き方の指示として読み、本文からは消す
     - 書くことがない見出しは消さず、テンプレートにある既定の文（例: 「特に無し」）を残すか「特に無し」と書く
     - 「関連Issue」のチェックリストは、関連する Issue があれば `- [ ] #<番号>` の形で書き、なければ空の項目を消して「特に無し」と書く
     - 調べて分かった関連ファイルは、「補足」（機能の場合は「設計方針」でもよい）に `[ファイル名](パス)` の形で書く
   - **ラベル**: frontmatter の `labels` をそのまま使う
5. タイトル・ラベル・本文の案をユーザーに見せて了承を取る
6. 了承されたら、本文を `mktemp` で作った一時ファイルに書き出し、`gh issue create --title "<タイトル>" --body-file <一時ファイル> --label "<ラベル>"` で起票して Issue の URL を報告する（ラベルが複数あるときは `--label` を繰り返す）
7. そのまま着手するかユーザーに聞き、着手するなら作成した番号で「A. 既存 Issue の修正」に進む
