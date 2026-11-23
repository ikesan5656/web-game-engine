# Penpot（ローカル）

## 概要

Figma の代わりに使うデザインツール Penpot を、手元の Docker で起動し、Claude Code から MCP（Model Context Protocol）で読み書きするための手順をまとめる。#23 で Figma を Penpot に置き換える土台として、#24 で用意した。

- 設定のファイルは `designs/`（`docker-compose.yaml`・`.env.example`・`.gitignore`）、ルートの `.mcp.json`、`.claude/settings.json` にある。デザインの書き出しに関わるファイル（`designs/scripts/`・`designs/exports/`・`designs/.gitattributes`）は、「デザインの書き出しと復元」を参照
- ローカル専用。サーバーに置いたり、ほかの人に公開したりしない
- #23 の他のサブ Issue の追記は、「トラブルシューティング」の前に H2 を足す

## ローカル専用の前提

`designs/docker-compose.yaml` には、手元で使うための開発用フラグを残している。

- `disable-email-verification`: アカウント作成時のメール確認を省く
- `disable-secure-session-cookies`: HTTPS でなくてもログインの cookie を使えるようにする
- `enable-prepl-server`: 開発用の REPL サーバーを有効にする（ポートは公開しない）
- `enable-mcp`: MCP を有効にする
- `enable-access-tokens`: アクセストークンの発行画面を有効にする（書き出しスクリプトのアクセストークンのため。「デザインの書き出しと復元」を参照）

どれも外部に公開すると危険な設定（認証の省略、cookie の保護の無効化）なので、手元以外で動かさない。そのため、公開するポートはすべて `127.0.0.1` だけで受け、同じネットワークの別の端末からは繋がらない。テレメトリは無効にしている。

## ポート一覧

| ポート | 用途                                   | 接続元                |
| ------ | -------------------------------------- | --------------------- |
| 9001   | Penpot の画面と MCP の中継             | ブラウザ、Claude Code |
| 8025   | mailpit（Penpot が送ったメールを見る） | ブラウザ              |

どちらも `127.0.0.1` だけで受ける。MCP サーバー（`penpot-mcp`）のポート（4400・4401・4402）と REPL のポートは外に出さない。`penpot-mcp` は compose の内部で 4401（MCP）と 4402（ブラウザとの WebSocket）を使い、Claude Code は 9001 の中継（`/mcp/stream`）を通して繋ぐ。4400 のプラグイン配信は、この構成では使わない。

## 初回セットアップ

`designs/` で次を行う。コマンドは `docker compose` で書くが、`docker compose`（Compose プラグイン）が使えない環境では `docker-compose` に読み替える。

1. `.env.example` をコピーする

   ```shell
   cp .env.example .env
   ```

2. 鍵を作り、`.env` の `PENPOT_SECRET_KEY=` の右側に書き込む

   ```shell
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

   `.env` は Git に入れない（`designs/.gitignore` で除外済み）。また、Claude Code の Read ツールで読ませない（`.claude/settings.json` の deny `Read(**/.env)`）。

3. 起動する

   ```shell
   docker compose up -d
   ```

4. ブラウザで `http://localhost:9001` を開き、アカウントを作る。メール確認は無効なので、作ったアカウントをそのまま使える。Penpot が送ったメールは `http://localhost:8025`（mailpit）で見られる

## 起動と停止

Docker の実行環境が先に動いている必要がある（例: colima なら `colima start`）。コマンドは `designs/` で実行する。

```shell
docker compose up -d    # 起動
docker compose ps       # 状態の確認
docker compose logs -f  # ログの表示
docker compose down     # 停止（データは残る）
```

全サービスに `restart: unless-stopped` を付けている。`stop` や `down` で自分で止めたものは、Docker を起動しても止まったままになる。止めていなければ、Docker の起動に合わせて立ち上がる。

`docker compose down -v` は、データのボリュームも消す。Penpot のファイルとアカウントが全て失われるので、通常は使わない。

## 版を上げる

1. `designs/.env.example` と `designs/.env` の `PENPOT_VERSION` を、両方同じ版に変える
2. Penpot のリリースノートを読み、変更点を確認する
3. データベースのマイグレーションは元に戻せないので、上げる前にボリュームを退避する。退避したファイルにはアカウント情報が入るので、リポジトリの外に置く。停止してから、DB と assets の両方を tar に固める

   ```shell
   mkdir -p ~/penpot-backups
   docker compose down
   docker run --rm -v web-game-engine-penpot_penpot_postgres_v15:/v -v ~/penpot-backups:/b alpine tar czf /b/penpot-postgres.tgz -C /v .
   docker run --rm -v web-game-engine-penpot_penpot_assets:/v -v ~/penpot-backups:/b alpine tar czf /b/penpot-assets.tgz -C /v .
   ```

4. 新しい版を取得して起動する

   ```shell
   docker compose pull
   docker compose up -d
   ```

上げたあとに戻したいときは、次の手順で復元する。

1. `docker compose down` で止める
2. ボリュームを（隠しファイルも含めて）空にして、tar を展開する（DB と assets の両方）

   ```shell
   docker run --rm -v web-game-engine-penpot_penpot_postgres_v15:/v -v ~/penpot-backups:/b alpine sh -c "find /v -mindepth 1 -delete && tar xzf /b/penpot-postgres.tgz -C /v"
   docker run --rm -v web-game-engine-penpot_penpot_assets:/v -v ~/penpot-backups:/b alpine sh -c "find /v -mindepth 1 -delete && tar xzf /b/penpot-assets.tgz -C /v"
   ```

3. `designs/.env` と `designs/.env.example` の `PENPOT_VERSION` を元の版に戻す（コミット済みなら git で戻す）
4. `docker compose up -d` で起動する

## Claude Code との接続

公式の `penpotapp/mcp` は複数ユーザー向け（`--multi-user`）のリモートモードで動き、接続に MCP キー（userToken）が要る。プラグインは Penpot 本体に組み込まれているので、プラグインの URL を読み込む手順はない。

設定は次の 2 つで済んでいる。

- `.mcp.json`: `penpot` サーバーを定義する。`type` は `http`、`url` は `http://localhost:9001/mcp/stream?userToken=${PENPOT_MCP_TOKEN}`。キーの値は、環境変数 `PENPOT_MCP_TOKEN` から Claude Code が展開する
- `.claude/settings.json` の `enabledMcpjsonServers`: `penpot` を承認済みにする。起動のたびの確認ダイアログは出ない

手順は次のとおり。

1. 「初回セットアップ」までを終え、`http://localhost:9001` にログインする
2. 「あなたのアカウント」→ Integrations で MCP キーを発行する。キーは 1 回しか表示されず、有効期限がある。発行し直すと、古いキーはすぐ無効になる
3. `~/.zshrc` などに、環境変数を書く

   ```shell
   export PENPOT_MCP_TOKEN=<発行したキー>
   ```

   - ターミナルの CLI で使うときは、新しいシェルで Claude Code を起動する
   - VS Code の拡張機能で使うときは、VS Code を Cmd+Q で完全に終了して起動し直す。VS Code は起動時の環境変数を拡張機能に引き継ぐので、Claude Code だけを再起動しても届かない
   - `designs/.env` に書いても Claude Code は読まない

4. Penpot でファイルを開き、File → MCP Server → Connect を選ぶ。接続している間は、そのタブを開いたままにして、休止させない
5. Claude Code で `/mcp` を実行し、`penpot` が connected になっていることを確かめる

分かっていること。

- 同じキーでの 2 つ目の接続（別のタブなど）は、MCP サーバーに拒否される（ログ: `Duplicate connection for given user token; rejecting new connection`）。接続できるのは 1 タブだけで、前のタブを閉じるか接続を切ると、次の接続が通る
- MCP は、接続しているタブで開いているファイルの、今のページに対して動く
- 公式（help.penpot.app/mcp/）では、ファイルを開くたびに File → MCP Server → Connect が要るとされている。確認したのは 1 ファイルだけで、ファイルを替えたときの挙動は未確認
- Penpot を起動していないときは、`/mcp` で `penpot` が failed になるだけで、ほかには影響しない
- MCP キーは URL のクエリで送られるため、frontend（nginx）のアクセスログ（`docker compose logs penpot-frontend`）にそのまま残る。`penpot-mcp` のログには指紋（先頭数文字）しか出ない。ログを Issue などに貼るときは、キーを伏せる。キーが漏れたら、発行し直す。frontend のコンテナを作り直すと、このログは消える

## 接続し直す

公式の手順（MCP サーバーを再起動 → ブラウザで接続し直す → Claude Code で再接続）に基づく。実際に切断を起こして確かめてはいない。

- 接続が切れた、タブを閉じた、タブが休止した: タブを開き直し、File → MCP Server → Connect を選ぶ
- `penpot-mcp` を再起動した（`docker compose restart penpot-mcp`）: ブラウザ側で Connect し直し、Claude Code の `/mcp` から `penpot` を reconnect する
- Claude Code 側だけが切れた: `/mcp` から `penpot` を reconnect する

## MCP ツール一覧

Claude Code 上のツール名は `mcp__penpot__<名前>` になる。

| ツール名            | 種別     | 用途                                | 確認結果 | 自動許可 |
| ------------------- | -------- | ----------------------------------- | -------- | -------- |
| execute_code        | 読み書き | Plugin API の JavaScript を実行する | 確認済み | しない   |
| high_level_overview | 読み取り | ツールと API の概要を返す           | 確認済み | する     |
| penpot_api_info     | 読み取り | API の型・メンバーの資料を返す      | 確認済み | する     |
| export_shape        | 読み取り | シェイプを画像に書き出して返す      | PNG のみ | しない   |
| import_image        | 提供なし | Remote mode のため提供されない      | 対象外   | -        |

- `execute_code`: Penpot Plugin API の JavaScript を実行する。フレーム（Board）と矩形を作り、構造・位置・色を読み取れた。書き込みもできるので、自動許可しない
- `high_level_overview`・`penpot_api_info`: サーバー内の静的な資料を返すだけ。`penpot_api_info` では `Board.resize` の資料を取得できた。`.claude/settings.json` の allow に入れている
- `export_shape`: シェイプ（または `page`・`selection`）を PNG か SVG に書き出し、画像として返す。PNG の取得を確認した。SVG や `page`・`selection` の指定は、公式の仕様にあるが未確認。Remote mode なので、ローカルのファイルには保存しない。自動許可しないのは現時点の決定で、#23 の別のサブ Issue で `design-reviewer` の比較に使うときに見直す
- `import_image`: Remote mode ではファイルシステムにアクセスしないので、提供されない

## デザインの書き出しと復元

Penpot のデータは Docker のボリュームにあり、git には入らない。そこで、スクリプト `designs/scripts/export-penpot.mjs` で全ファイルを `.penpot` に書き出し、`designs/exports/` に置いて git で管理する（#25）。書き出しは手動で実行する。フックや CI での自動実行はしない。

### アクセストークンの発行

書き出しは Penpot の API を呼ぶので、アクセストークンが要る。MCP キー（「Claude Code との接続」）とは別のものを発行する。Access tokens の画面は既定では出ないので、`designs/docker-compose.yaml` の `PENPOT_FLAGS` に `enable-access-tokens` を足して有効にしている。

1. `http://localhost:9001` にログインする
2. 「あなたのアカウント」→ Integrations（MCP Server と同じ画面）の Access tokens でトークンを発行する。フラグを有効にすると、Integrations にこの項目が出ることを確認済み
3. 期限は 90 日を選ぶ
4. 発行時の 1 回しか表示されないので、表示されたトークンをすぐ `designs/.env` の `PENPOT_ACCESS_TOKEN` に書く

トークンは会話やコードに貼らない。`.env` は git に入らず（`designs/.gitignore`）、ファイルへの書き込み時とコミット時に検査するフック `.claude/hooks/check-secrets.sh` でも検出する。検出するのは次の行（`$` を含む値（`${...}` などの参照）は対象外）。

- `PENPOT_ACCESS_TOKEN` の後に `=` または `:`（前後の空白可）で 16 文字以上の値が続く行
- `Authorization: Token <16 文字以上の値>` の行（値からは引用符とバッククォートを除く）

誤検出の行は、同じ行に `secret-scan:allow` と書けば除外できる。

### 有効期限の扱い

- 期限は 90 日を推奨する
- 期限が切れると、書き出しが 401（または 403）で失敗する。どちらになるかは未確認。再発行して `designs/.env` の値を書き換える
- 不要になったトークンは、同じ画面から失効させる

### 設定

`designs/.env.example` の次の項目を `designs/.env` に書く。

- `PENPOT_ACCESS_TOKEN`（必須）: 上で発行したアクセストークン
- `PENPOT_BASE_URL`（任意）: Penpot の URL。省略時は `http://localhost:9001`

### 書き出し

Penpot を起動した状態で、`designs/` で実行する。Node 20.12 以上が必要（`process.loadEnvFile` を使うため）。

```shell
node scripts/export-penpot.mjs
```

スクリプトは Penpot の API（`POST /api/main/methods/<名前>`）を呼ぶ。API のドキュメントは `http://localhost:9001/api/main/doc` で見られる。

- 全プロジェクトの全ファイル（Drafts を含む）を、`designs/exports/<プロジェクト名>/<ファイル名>.penpot` に上書きで保存する
- ファイル名に使えない文字と、先頭の `.` は `_` にする。同じプロジェクトに同名のファイルがあれば、`-<ID の先頭 8 文字>` を付ける
- 保存先が重なったとき（チームが複数あってそれぞれに Drafts がある、別のプロジェクトと名前が同じ、大文字と小文字だけが違う）は、ファイルに `-<ファイル ID の先頭 8 文字>`、プロジェクトのフォルダに `-<プロジェクト ID の先頭 8 文字>` を付け、両方を保存する
- 途中で失敗したときは、それまでに書けたファイルは残り、残りは書き出されない。書き込み中の一時ファイル（`.tmp`）は消す（`designs/.gitignore` で `*.tmp` を無視している）
- Penpot で消した、または名前を変えたファイルの古い `.penpot` は、自動では消さない。スクリプトが一覧を出すので、確かめてから `git rm` する

### コミット

- `.penpot` は通常の git で管理する（Git LFS は使わない）
- zip のバイナリなので、差分は読めない（`designs/.gitattributes` で binary 指定）。変更内容は PR の説明や Penpot の画面で確かめる
- `.penpot` の中には書き出した時刻が入るので、デザインが同じでも変更扱いになることがある。デザインを変えていないファイルはコミットしなくてよい
- 1 ファイルが 5 MB を超えると、スクリプトが「警告: 5 MB を超えるファイルがあります。git LFS への移行を検討してください（docs/penpot.md）。」と出す。目安の 5 MB を超えたら Git LFS に移す。移すときは `designs/.gitattributes` も LFS 用に直す

### 復元

1. Penpot のダッシュボードで「Import」（取り込み）を選び、`designs/exports/` の `.penpot` を選んで取り込む。元と同じデザインで復元できることを確認済み
2. 取り込むと、別のファイルとして作られる（元のファイルはそのまま残る）。中身を確かめたら、元のファイルか取り込んだ側の、一方を消す。取り込んだ側が元と同名のとき、同じプロジェクトに同名のファイルが並んだままだと、次の書き出しで `-<ID の先頭 8 文字>` 付きの名前になる

### 共有ライブラリ

現状の書き出しは `includeLibraries: false` で、共有ライブラリは含めない。共有ライブラリを使い始めたら、スクリプトの設定（`includeLibraries`）を変える必要がある。共有ライブラリを使うファイルは、復元後に参照が切れる可能性がある（未確認）。

### 書き出しのトラブル

スクリプトが出すエラーと、その対処。

- 「designs/.env がありません。.env.example をコピーして作ってください。」: 「初回セットアップ」の手順で `.env` を作る
- 「PENPOT_ACCESS_TOKEN が空です。Penpot のアカウント設定 → Integrations → Access tokens で発行し、designs/.env に書いてください。」: トークンを発行して `.env` に書く
- 「認証に失敗しました（HTTP 401）。アクセストークンの期限切れ・失効・誤りの可能性があります。再発行して designs/.env を更新してください。」（403 のときは HTTP 403）: 再発行して `designs/.env` を直す
- 「http://localhost:9001 に接続できません。Penpot が起動していません（designs/ で docker compose up -d）。」: Penpot を起動する。`PENPOT_BASE_URL` を変えているときは、その URL も確かめる。「起動と停止」を参照する
- 応答を解析できないとき: 受け取った内容の先頭 200 文字を出して止まる（トークンは出さない）。URL が Penpot のものか、Penpot の版を確かめる
- 上記以外の「… が失敗しました（HTTP n）」などのエラー: Penpot のログ（`docker compose logs`）を見る
- 「designs/.env を読めません: <コード>」: ファイルの権限などを確かめる
- 「書き出した内容が .penpot（zip）ではありません（<n> バイト、Content-Type: <型 または 不明>）。」: `PENPOT_BASE_URL` が Penpot を指しているか、Penpot の版を確かめる
- 「<URL> への接続に失敗しました: TypeError: fetch failed」: `PENPOT_BASE_URL` が http と https で食い違うなどでリダイレクトされると、スクリプトはリダイレクトを拒否し、このエラーで失敗する。リダイレクトのほか、原因が特定できない接続失敗でも出る。まず `PENPOT_BASE_URL` を実際の URL に合わせられているか確かめる
- 画面に Access tokens の項目がない: `designs/docker-compose.yaml` の `PENPOT_FLAGS` に `enable-access-tokens` があるか確かめ、`docker compose up -d` で反映する

## トラブルシューティング

- `docker compose` が `PENPOT_VERSION` や `PENPOT_SECRET_KEY` が未設定というエラーで止まる: `designs/.env` がない、または値が空。「初回セットアップ」の手順で作る
- ポートが使用中で起動できない: 9001・8025 を使っているプロセスを止める。ほかの Penpot が動いていないかも確かめる
- `localhost` で繋がらず、`127.0.0.1` なら繋がる: `localhost` が IPv6（`::1`）に解決されている。ポートは IPv4 の `127.0.0.1` だけで受けている。このような環境では、`.mcp.json` やブラウザの URL を `127.0.0.1` に替える。`PENPOT_PUBLIC_URI` は `localhost` なので、`127.0.0.1` で開いたときのログインなどの挙動は未確認
- ツールが `No Penpot instance connected for user token` で失敗する: 次のどれか
  - ブラウザ側が未接続: File → MCP Server → Connect を選ぶ
  - Claude Code に `PENPOT_MCP_TOKEN` が届いていない: `docker compose logs penpot-mcp` に `userTokenFp=${PENPOT` と出ていれば、キーが展開されずに文字のまま送られている。環境変数を設定してから、VS Code（または Claude Code）を起動し直す
  - キーの期限切れ、または発行し直した: 新しいキーを環境変数に入れ、起動し直してから、ブラウザ側も接続し直す
- `high_level_overview`・`penpot_api_info` は成功するのに、ほかのツールが失敗する: この 2 つはサーバー内の資料を返すだけなので、ブラウザ側が未接続でも成功する。接続の確認には使えない。接続の確認は、`execute_code` で `penpot.currentPage.name` を返すなどして行う
- しばらく使わないと MCP が応答しなくなる: ブラウザがタブを休止している。Chrome では、設定 → パフォーマンス → メモリセーバー の「常にアクティブにするサイト」に加える（タブのピン留めの効果は未検証）。休止したら「接続し直す」を参照する
- Claude Code で `penpot` が failed になる: Penpot が起動していない。「起動と停止」を確かめる
