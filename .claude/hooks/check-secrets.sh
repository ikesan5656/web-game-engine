#!/usr/bin/env bash
# 認証情報・機微情報の混入チェック（Claude Code の PreToolUse フック）
#
# - Write / Edit / MultiEdit / NotebookEdit: 書き込もうとしている内容を検査する
# - Bash の git commit: ステージ済みの差分（追加行のみ）を検査する
#
# 検出したら exit 2 で操作を止め、理由を Claude に返す。
# 誤検知の行は、同じ行に「secret-scan:allow」と書くと検査対象から外れる。

set -euo pipefail

input="$(cat)"
tool="$(jq -r '.tool_name // empty' <<<"$input")"

# 検査パターン（名前|正規表現）。grep -E で大文字小文字を区別して照合する
PATTERNS=(
  "AWS アクセスキー|AKIA[0-9A-Z]{16}"
  "GitHub トークン|gh[pousr]_[A-Za-z0-9]{36,}"
  "GitHub fine-grained トークン|github_pat_[A-Za-z0-9_]{50,}"
  "Anthropic API キー|sk-ant-[A-Za-z0-9_-]{20,}"
  "OpenAI API キー|sk-(proj-)?[A-Za-z0-9]{32,}"
  "Google API キー|AIza[0-9A-Za-z_-]{35}"
  "Slack トークン|xox[abprs]-[A-Za-z0-9-]{10,}"
  "Stripe シークレットキー|sk_live_[A-Za-z0-9]{20,}"
  "秘密鍵|-----BEGIN ([A-Z]+ )?PRIVATE KEY-----"
  "URL 内の認証情報|[a-z][a-z0-9+.-]*://[^/[:space:]:@]+:[^/[:space:]:@]{3,}@"
  "Penpot 秘密鍵|PENPOT_SECRET_KEY=[^[:space:]\$]{16,}"
  "Penpot MCP キー|userToken=[^\$&\"[:space:]]{8,}"
)
# 代入形式の汎用パターン（大文字小文字を区別しない）
# 注意: macOS の grep では [...] 内の \s が空白にならないため [:space:] を使う
GENERIC_PATTERN="(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)[\"']?[[:space:]]*[:=][[:space:]]*[\"'][^\"'[:space:]]{8,}[\"']"

target=""
content=""

case "$tool" in
  Write | Edit | MultiEdit | NotebookEdit)
    target="$(jq -r '.tool_input.file_path // .tool_input.notebook_path // "(不明なファイル)"' <<<"$input")"
    content="$(jq -r '[.tool_input.content, .tool_input.new_string, .tool_input.new_source, ((.tool_input.edits // [])[] | .new_string)] | map(select(. != null)) | join("\n")' <<<"$input")"
    ;;
  Bash)
    cmd="$(jq -r '.tool_input.command // empty' <<<"$input")"
    # git commit 以外は検査しない
    if ! grep -Eq '(^|[;&|[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+commit' <<<"$cmd"; then
      exit 0
    fi
    cwd="$(jq -r '.cwd // empty' <<<"$input")"
    [ -n "$cwd" ] && cd "$cwd"
    target="git commit（ステージ済みの差分）"
    diff="$(git diff --cached -U0 2>/dev/null || true)"
    # git commit -a / --all はコミット時に変更をステージするので、未ステージの差分も見る
    if grep -Eq '[[:space:]](-[a-zA-Z]*a[a-zA-Z]*|--all)([[:space:]]|$)' <<<"$cmd"; then
      diff="$diff"$'\n'"$(git diff -U0 2>/dev/null || true)"
    fi
    content="$(grep -E '^\+' <<<"$diff" | grep -Ev '^\+\+\+ ' || true)"
    ;;
  *)
    exit 0
    ;;
esac

[ -z "$content" ] && exit 0

# 許可コメント付きの行を除外する
content="$(grep -v 'secret-scan:allow' <<<"$content" || true)"

findings=()
for entry in "${PATTERNS[@]}"; do
  name="${entry%%|*}"
  regex="${entry#*|}"
  if match="$(grep -Eo -- "$regex" <<<"$content" | head -n 1)" && [ -n "$match" ]; then
    findings+=("$name: ${match:0:6}…（以下省略）")
  fi
done
if match="$(grep -Eio -- "$GENERIC_PATTERN" <<<"$content" | head -n 1)" && [ -n "$match" ]; then
  findings+=("パスワード・シークレットらしき値の直書き: ${match:0:16}…（以下省略）")
fi

if [ "${#findings[@]}" -gt 0 ]; then
  {
    echo "機微情報の混入チェックで止めました: $target"
    for f in "${findings[@]}"; do echo "  - $f"; done
    echo "認証情報はコードやコミットに含めず、.env（Git 管理外）や環境変数から読み込んでください。"
    echo "ダミー値などの誤検知であれば、その行に「secret-scan:allow」とコメントを付けてから再実行してください。"
    echo "この警告の内容をユーザーに伝え、どう対応するか確認してください。"
  } >&2
  exit 2
fi

exit 0
