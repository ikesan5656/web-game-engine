# Penpot（ローカル）

## 概要

Figma の代わりに使うデザインツール Penpot を、手元の Docker で起動し、Claude Code から MCP（Model Context Protocol）で読み書きするための手順をまとめる。#23 で Figma を Penpot に置き換える土台として、#24 で用意した。

- 設定のファイルは `designs/`（`docker-compose.yaml`・`.env.example`・`.gitignore`）、ルートの `.mcp.json`、`.claude/settings.json` にある
- ローカル専用。サーバーに置いたり、ほかの人に公開したりしない
- #23 の他のサブ Issue の追記は、「トラブルシューティング」の前に H2 を足す

## ローカル専用の前提

`designs/docker-compose.yaml` には、手元で使うための開発用フラグを残している。

- `disable-email-verification`: アカウント作成時のメール確認を省く
- `disable-secure-session-cookies`: HTTPS でなくてもログインの cookie を使えるようにする
- `enable-prepl-server`: 開発用の REPL サーバーを有効にする（ポートは公開しない）
- `enable-mcp`: MCP を有効にする

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
2. アカウントの設定 → Integrations で MCP キーを発行する。キーは 1 回しか表示されず、有効期限がある。発行し直すと、古いキーはすぐ無効になる
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
