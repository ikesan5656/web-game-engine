#!/usr/bin/env bash
# /issue 実行時にセッション名を「#<番号>-<タイトル>」にする（Claude Code の UserPromptSubmit フック）
#
# - プロンプトが「/issue <引数>」のときだけ動く（/issue の直後が空白・改行のときに限る）
# - 最初の引数だけを見て、Issue 番号（12 / #12 / このリポジトリの Issue URL）なら
#   gh で Issue のタイトルを取得し、stdout に sessionTitle を含む JSON を 1 行だけ出す
# - タイトル先頭の「[Feature]」のような接頭辞 1 つと直後の空白（半角・全角）は除く
#
# このフックはプロンプトの送信を止めてはいけないので、どんな失敗（gh / jq がない、
# 未認証、ネットワークエラー、存在しない番号、入力が JSON でないなど）でも
# 何も出力せず exit 0 で終える。そのため set -e / set -euo pipefail は使わず、
# 各コマンドの失敗を個別に判定して抜ける。
#
# macOS 標準の bash 3.2 でも動くように書く（連想配列・${var,,}・wait -n は使わない）。

# 対象リポジトリ。URL で指定されたときは、このリポジトリの Issue URL だけを受け付ける
REPO='ikesan5656/web-game-engine'
# 受け付ける URL: https://github.com/ikesan5656/web-game-engine/issues/<番号>
#   末尾の「/」、クエリ（?...）、アンカー（#...）は無視する
re_url='^https://github\.com/ikesan5656/web-game-engine/issues/([1-9][0-9]{0,8})/?([?#].*)?$'
# 受け付ける番号: 12 / #12
re_num='^#?([1-9][0-9]{0,8})$'
# 「/issue」の直後が空白（改行を含む）のときの最初の引数
re_cmd='^/issue[[:space:]]+([^[:space:]]+)'

# gh の実行上限（秒）
GH_TIMEOUT=5

command -v jq >/dev/null 2>&1 || exit 0
command -v gh >/dev/null 2>&1 || exit 0

# 指定秒数でコマンドを打ち切る（macOS には timeout コマンドが無いため bash だけで実装する）
# 見張り役のサブシェルは stdout / stderr を /dev/null に向ける。そうしないと $(...) が
# 見張り役の sleep の終了まで待ってしまい、毎回 secs 秒遅れる。
# 見張り役を止めるときは trap で sleep も片付ける。
# 打ち切るときは対象の直接の子プロセスも止める（孫以降は対象外）
run_with_timeout() {
  local secs="$1"
  shift
  "$@" &
  local pid=$!
  (
    # sleep より先に trap を設定する（間に TERM が届くと sleep だけが残るため）
    sp=""
    trap '[ -n "$sp" ] && kill "$sp" 2>/dev/null; exit 0' TERM
    sleep "$secs" &
    sp=$!
    wait "$sp"
    # 子プロセスが stdout を握ったまま残ると $(...) が終わらないため、先に子も止める
    pkill -TERM -P "$pid" 2>/dev/null
    kill -TERM "$pid" 2>/dev/null
  ) >/dev/null 2>&1 &
  local wd=$!
  wait "$pid"
  local rc=$?
  kill -TERM "$wd" 2>/dev/null
  wait "$wd" 2>/dev/null
  return "$rc"
}

input="$(cat)"

# /issue を含まないプロンプトは jq を起動せずに抜ける
case "$input" in
  *'/issue'*) ;;
  *) exit 0 ;;
esac

prompt="$(jq -r '.prompt // empty' <<<"$input" 2>/dev/null)" || exit 0

[[ $prompt =~ $re_cmd ]] || exit 0
arg="${BASH_REMATCH[1]}"

num=""
if [[ $arg =~ $re_num ]]; then
  num="${BASH_REMATCH[1]}"
elif [[ $arg =~ $re_url ]]; then
  num="${BASH_REMATCH[1]}"
fi
[ -n "$num" ] || exit 0

issue_json="$(run_with_timeout "$GH_TIMEOUT" \
  env GH_PROMPT_DISABLED=1 GH_NO_UPDATE_NOTIFIER=1 \
  gh issue view "$num" -R "$REPO" --json title,url \
  2>/dev/null </dev/null)" || exit 0

# URL が /issues/<番号> で終わることを確かめる（PR 番号を指定したときの対策）
output="$(jq -c --arg n "$num" '
  select((.url | type) == "string" and (.url | endswith("/issues/" + $n)))
  | select((.title | type) == "string")
  | (.title | sub("^\\[[^\\]]*\\][\\s　]*"; "")) as $t
  | {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        sessionTitle: (if $t == "" then "#\($n)" else "#\($n)-\($t)" end)
      }
    }
' <<<"$issue_json" 2>/dev/null)" || exit 0

[ -n "$output" ] || exit 0
printf '%s\n' "$output"
exit 0
