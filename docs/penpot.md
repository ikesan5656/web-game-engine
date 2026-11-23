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

| ツール名            | 種別     | 用途                                | 確認結果 | 自動許可    |
| ------------------- | -------- | ----------------------------------- | -------- | ----------- |
| execute_code        | 読み書き | Plugin API の JavaScript を実行する | 確認済み | しない      |
| high_level_overview | 読み取り | ツールと API の概要を返す           | 確認済み | する        |
| penpot_api_info     | 読み取り | API の型・メンバーの資料を返す      | 確認済み | する        |
| export_shape        | 読み取り | シェイプを画像に書き出して返す      | PNG のみ | する（#26） |
| import_image        | 提供なし | Remote mode のため提供されない      | 対象外   | -           |

- `execute_code`: Penpot Plugin API の JavaScript を実行する。フレーム（Board）と矩形を作り、構造・位置・色を読み取れた。書き込みもできるので、自動許可しない
- `high_level_overview`・`penpot_api_info`: サーバー内の静的な資料を返すだけ。`penpot_api_info` では `Board.resize` の資料を取得できた。`.claude/settings.json` の allow に入れている
- `export_shape`: シェイプ（または `page`・`selection`）を PNG か SVG に書き出し、画像として返す。PNG の取得を確認した。SVG や `page`・`selection` の指定は、公式の仕様にあるが未確認。Remote mode なので、ローカルのファイルには保存しない。#26 で `design-reviewer` の比較に使うことにしたので、`.claude/settings.json` の allow に入れた（「Issue 対応でのデザインの扱い（#26）」を参照）
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

## Issue 対応でのデザインの扱い（#26）

`/issue` スキルのデザインの工程（`ui-designer`・`design-reviewer`）は、Penpot を使う。既存のデザインは移植した（この H2 の最後の H3 の移植の節を参照）。Code Connect に当たる機能は使わない。移植した範囲のほかのデザインは、必要になった Issue で新しく作る。

### デザインの指し方と受け渡し

メイン・`ui-designer`・`design-reviewer` の間では、次の形で指す。

- ファイル: `<プロジェクト名>/<ファイル名>` と file-id（UUID）。画面の URL も添える。形は `http://localhost:9001/#/workspace?team-id=<team-id>&file-id=<file-id>&page-id=<page-id>`（実例: `http://localhost:9001/#/workspace?team-id=9445e4a2-5eee-81fa-8008-fd11f84924b7&file-id=5604a5f5-13c6-817f-8008-fd7ce0e9747d&page-id=06530363-811e-8055-8008-fd7c9c34800e`）。URL の形は版で変わるおそれがある
- ページ: ページ名と page-id
- シェイプ: 名前の経路（例: `ページ名 / ボード名 / 子の名前`）と shape-id。名前は必ず併記する。ID は人が読めず、`.penpot` から復元すると変わるおそれがあるため。工程コメント・Issue・対応表では `ページ名 / ボード名 (shape-id)` の形にそろえる。深いときは、子の名前を、前後に空白を置いた `/` でつないで続ける。経路は省かずに全部書く
- ID は `ui-designer` が `execute_code` で `penpot.currentFile.id`・`penpot.currentPage.id`・`shape.id` を読んで報告する
- Plugin API ではプロジェクト名と team-id を取れない（`currentProject`・`currentTeam` がない）。そのため、プロジェクト名と URL は、ユーザーが画面のパンくずとアドレスバーで確かめる
- `penpot.currentUser` は `Permission user:read is not granted` になり、読めない
- 使うファイルは、Issue に記載があればそれ、なければ下の対応表のファイル。どちらにもなければ、メインがユーザーに聞く
- 別のファイルが要るときは、ユーザーがダッシュボードで作る。MCP ではファイルを作れない。`ui-designer` は、接続されたファイルの中にページやボードを足すことだけをする

### 起動前にユーザーに頼むこと

MCP は、接続しているタブで開いているファイルに対して動く。メインは `ui-designer`・`design-reviewer` を起動する前に、ユーザーに次を頼む。

- 対象のファイルを開く
- File → MCP Server → Connect を選び、そのタブを開いたままにする

具体の手順は、「Claude Code との接続」を参照する。`ui-designer` と `design-reviewer` は同じ接続を使うので、同時に起動しない。

エージェントは、最初の `execute_code` で `{fileId, fileName, pageId, pageName}` を返し、接続の確認とファイルの照合をする。ファイルが違えば、作業せずに報告する。ページは `penpot.openPage()` で切り替えてよい。

### 主要シェイプの対応表

`ui-designer`・`design-reviewer` は、Penpot を探す前にこの表を読み、必要なシェイプだけを読む。

- ファイル: `WebGameEngine/WebGameEngine`
- file-id: `5604a5f5-13c6-817f-8008-fd7ce0e9747d`
- ページ: `Page 1`（経路の先頭の `Page 1 / ` はこのページ名。page-id `06530363-811e-8055-8008-fd7c9c34800e`）

| シェイプ（名前の経路 (shape-id)）                                                                                                                              | 用途                                                           | 移植元の node-id |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------- |
| `Page 1 / 完成予想 / 3Dシーンエディター / 3Dビューとインスペクター / インスペクター / 選択中のオブジェクト` (a030c844-aee9-5dbf-a123-7049d913e60d)             | インスペクタの「選択中のオブジェクト」。アイコン・文字色の参考 | 7:142            |
| `Page 1 / 完成予想 / 3Dシーンエディター / 3Dビューとインスペクター / インスペクター / Transform / コンポーネント見出し` (8a039e8e-a0ad-5bbe-ac33-2202f43f3b99) | インスペクタのコンポーネント見出し。見出しの色の参考           | 7:201            |
| `Page 1 / フェーズ2時点` (136f0b5e-cd20-5a42-95b7-558985d85415)                                                                                                | フェーズ2時点の画面の全体                                      | 15:3             |
| `Page 1 / フェーズ2時点 / 3Dシーンエディター（フェーズ2時点）` (4e96628e-79dc-540d-bc3c-a222c8303c96)                                                          | 3Dシーンエディターの画面（ヘッダーとパネル配置）               | 15:10            |
| `Page 1 / フェーズ2時点 / 3Dシーンエディター（フェーズ2時点） / パネル配置 / 左側 / 上段 / Hierarchy` (61737264-22ed-50e1-b39b-f41a584bd2e2)                   | Hierarchy                                                      | 15:36            |
| `Page 1 / フェーズ2時点 / 3Dシーンエディター（フェーズ2時点） / パネル配置 / 左側 / 上段 / Hierarchy / 本文` (5e2a0951-a757-5796-9187-dd9670a65daf)            | Hierarchy の本文                                               | 15:43            |
| `Page 1 / フェーズ2時点 / 3Dシーンエディター（フェーズ2時点） / パネル配置 / 左側 / 上段 / Hierarchy / 本文 / 仮の表示` (e075b60a-57cd-5ca0-ba63-e22ee605ea5c) | Hierarchy の仮の表示                                           | 15:44            |

### 更新のルール

- shape-id は、Penpot 上でシェイプを消したり作り直したりすると変わる。`.penpot` から復元したときも変わるおそれがある。`ui-designer`・`design-reviewer` は、この表と食い違うシェイプや、新しく作った主要シェイプに気づいたら、報告に書く
- ID が食い違ったときは、名前の経路で探し直して報告する。メインは `doc-writer` に依頼して、この表を直す
- Penpot のボードを足したり変えたりしたときは、メインが `doc-writer` に依頼して、この表を更新する

### 倍率

等倍で描く。実装の値と、Penpot の値は同じ数値にする。移植したボードも等倍に直してある（この H2 の最後の H3 の移植の節を参照）。

### 読み方の決まり

Penpot の MCP は応答が遅く不安定で、`execute_code` の出力がコンテキストを圧迫する。`ui-designer`・`design-reviewer` は、次に従う。

- 起動のたびに、最初に `high_level_overview` を 1 回だけ読む。`penpot_api_info` は、API が分からないときだけ使う
- 渡されたシェイプとその近くだけを読む。ページ全体やファイル全体を走査しない。分からないときだけ、親のボードから子の名前・ID・型を浅く列挙して絞り込む
- `execute_code` では、要るプロパティ（name・id・type・x・y・width・height・fills・strokes・子の ID など）だけを返させる。深い再帰や全プロパティの出力はしない
- `export_shape` は、要るシェイプに絞り、PNG で使う。同じシェイプを同じ起動の中で何度も書き出さない（編集後と再確認の 1 回は例外）。SVG などほかの形式は確かめていないので、まずは PNG とシェイプの ID の指定だけを使う
- 編集は、論理的なまとまりごとに 1 回の `execute_code` にまとめ、まとまりごとに作ったシェイプの ID を返させる。途中で切れたときに、どこまで反映したかを報告できるようにするため
- フォントを当てるときは、`penpot.fonts.all` から fontId が完全一致するものを選ぶ。`penpot.fonts.findById('gfont-inter')` は Inter ではなく Inter Tight を返したため、使わない。当てたあとに、fontFamily と fontId を読み直して確かめる

`design-reviewer` は、`execute_code` では読み取りのコードだけを書き、シェイプの作成・変更・削除のメソッドを呼ばない。

大きな書き換え（100 個を超えるシェイプの値の変更など）の `execute_code` は、Claude Code の auto mode の安全チェックに「破壊的な操作」として止められることがある。止められたら、エージェントは回り込まずに作業を止め、どこまで進んだかを報告する。メインは、ユーザーに続きの許可を取ってから再開させる。

### 接続が切れたときの流れ

1. 検知: `execute_code`・`export_shape` が `No Penpot instance connected for user token` で失敗する、タイムアウトする、ツールが failed になる・使えない。`high_level_overview`・`penpot_api_info` が成功しても、接続している証拠にはならない
2. エージェントは、再試行を 1 回までにし、それでも失敗したら作業を止める。報告に、「接続切れ」であること、どこまで反映したか（作ったシェイプの ID と名前）、残りの作業を書く
3. メインは、ユーザーに「接続し直す」と「トラブルシューティング」の該当する手順を示す（タブを開き直して Connect する、`/mcp` から reconnect する、Penpot が止まっていれば起動する、キーの期限が切れていれば発行し直す、など）
4. ユーザーが直したと答えたら、メインは同じエージェントを起動し直し、前回の報告（反映済みのシェイプと残りの作業）を渡す。起動し直したエージェントは、反映済みのものを確かめてから、残りだけを行う

### design-reviewer の見比べ方

`design-reviewer` は、`export_shape` の PNG（デザイン側）と、コード（`app/src/styles/editorColors.ts`・`app/src/styles/components/` など）を見比べる。数値は、`execute_code` で読んだ値と照らし合わせる。実装の画面のスクリーンショットは撮らない。

Playwright のスクリプトは、今は作らない。PNG とコード・数値の照合でレビューでき、スクリプトの保守を増やさないため。次のときは、作ることを検討する。

- `export_shape` で書き出せないシェイプがあるとき
- 実装の見た目が Penpot の画面と食い違うとき

### デザインを変えた Issue での書き出し

Penpot のデザインを変えた Issue では、PR 作成でコミットする前に、メインがリポジトリのルートで `node designs/scripts/export-penpot.mjs` を実行し（スクリプトは自分の場所を基準にパスを決めるので、ルートからでも動く）、その Issue で変えたファイルの `.penpot` だけをコミットに含める。この実行は自動許可せず、毎回の確認ダイアログで通す。スクリプトの使い方は、「デザインの書き出しと復元」を参照する。

このリポジトリは GitHub で公開されている。スクリプトは Penpot の全プロジェクトの全ファイル（Drafts を含む）を書き出すので、別件の下書きや私的な画像まで公開しないよう、次を守る。

- 書き出しのあとは、次の順に行う
  1. 了承を得ていない追跡済みの `.penpot` の変更を、`git restore` で戻す
  2. 了承した `.penpot` だけを、ファイルを指定して `git add` する。`git add designs/exports`・`git add -A`・`git add -u` のような、まとめての追加はしない
  3. `git diff --cached --name-only` の結果が、了承した一覧（と、この Issue のほかの変更ファイル）と一致することを確かめてから、コミットする
- `.claude/settings.json` の deny で、まとめての追加とコミット（`git add -A`・`--all`・`.`・`-u`・`--update`・`:/`、`git commit -a`・`-am`・`--all`）を止めている。ただし、deny ですべては止まらず、最後の防ぎは手順 3 の `git diff --cached --name-only` での確認である。次の形は止めていない
  - 引数の順序が違う形（`git commit -m x -a` など）
  - `:/` の後ろにパスが続くファイル指定（`git add :/app/x.ts`）
  - ディレクトリを指定した追加（`git add designs/exports`、`git add designs`）
  - `git add ./`
  - シェルのグロブ（`git add designs/exports/*`）
  - `git -C <dir> add -A`
  - オプションを組み合わせた形（`git add -vA` など）
- メインは、PR 作成の手順 1 でコミットの了承を取るときに、次の 2 つをユーザーに示す
  - このリポジトリが公開であり、コミットした `.penpot` は誰でも見られること
  - コミットする `.penpot` のファイル名の一覧
- ユーザーの了承を得たファイルだけをコミットする。それ以外に書き出された `.penpot`（その Issue で変えていないファイル、別件の下書きなど）はコミットしない。新しく書き出された未追跡のファイルは、そのまま残してよい（「コミット」の節を参照）
- アクセストークンと MCP キーは `.penpot` に入らない。`designs/.env` は `.gitignore` とフック `check-secrets.sh` で守られている。ただし、デザインの中身（文言・画像）は公開される。書き出した `.penpot` には、メールアドレスやユーザー名は入っていない。入るのは team-id・project-id・ファイルの作成・更新の日時・Penpot の版（#26 で確かめた）。新しく画像を足したときは、公開する前に中身を確かめる

### Figma からの移植

Figma から Penpot に移したため、`docs/figma.md` は廃止し、中身をこの節と対応表に移した。

- 移植元: Figma の `https://www.figma.com/design/cJDqltVzv6bir990SJDHlM/WebGameEngine` の Page 1。対応表の「移植元の node-id」は、この Figma の node-id
- 取り込み
  - 2026-11-23 に、Figma のプラグイン Penpot Exporter v0.26.3 で `.penpot` に書き出し、Penpot のダッシュボードで取り込んだ
  - 取り込みで、新しいファイル `WebGameEngine` ができた（プロジェクト `WebGameEngine`。取り込み直後は「新規プロジェクト 2」だったので、ユーザーが名前を直した）
  - Penpot の版は `designs/.env.example` の `PENPOT_VERSION` を参照する
  - 版の相性と見た目は、ユーザーが確かめた
- 中身
  - トップのボードは `完成予想`（構想）と `フェーズ2時点` の 2 つ。ページは `Page 1` の 1 つだけ
  - フォントは Inter・Noto Sans JP・Noto Sans（Google Fonts）。`フェーズ2時点` は ④ で Inter だけにした。`完成予想` は取り込んだときのまま
  - 参照画像は `3Dシーン（参照画像）` の 1 種類（2 か所）
- 移植で変わった経路: Hierarchy の上に `パネル配置 / 左側 / 上段` が入った（対応表の経路を参照）
- 縮小（2026-11-24）
  - Figma は実寸の 2 倍で描かれていたので、50% に縮小した
  - Penpot の比例縮小（K キー、Scale content）は使わなかった。Plugin API に比例縮小のメソッドはないので、`ui-designer` が `execute_code` で、親から順に次を半分にした: 位置・大きさ（`resize`）・fontSize・角丸・線幅・flex の gap と padding
  - shape-id は縮小の前後で変わっていない
  - 丸め: ボード・文字・矩形の位置・大きさと fontSize を整数にした（fontSize は四捨五入）。実装に同じ値があればそれに合わせた。線幅の最小は 1
  - 例外: `ヘッダー` は元が 2 倍でなかったので、実装の 50px に合わせた。そのため `フェーズ2時点` は 1590×1019、`完成予想` は 1590×921。`完成予想` の `インスペクター`（元は幅 580）は、構想なので比率を保って 290 にした
  - 端数を残したもの: アイコンのパス、`座標軸インジケーター` の中、`完成予想` の角丸・線幅（2.5・1.25 など）
  - 確かめたこと: `フェーズ2時点` の主な寸法が実装と一致した（Hierarchy の幅 240、Inspector の幅 300、Project の高さ 200、パネルの見出しの高さ 38、タブの文字 13）
- 再現していないもの・既知のこと
  - コンポーネント・変数・プロトタイプは対象外
  - 3D ビューの上端の暗い帯は、参照画像に写ったアプリのヘッダーで、元のデザインにもある
- 見比べ: ユーザーが Figma と Penpot を目で見比べ、おおむね合っていると判断した（2026-11-24）。Figma の PNG は書き出していない
- ④ の確認: `design-reviewer` が次を確かめた
  - 対応表の 7 行が実在する
  - `フェーズ2時点` の寸法と色が実装と一致した
  - 縮小による崩れを直した
- ④ で直したこと
  - `フェーズ2時点` の `ヘッダー` の地の色を、#212121 から実装の `#222` に合わせて #222222 にした
  - `フェーズ2時点` の 9 個の文字を Inter（Regular、fontId `gfont-inter`）にした。変える前は Noto Sans・Noto Sans JP
    - 対象: ヘッダーの Home・Menu、`グリッド`、パネルの `仮の表示` 3 つ、`座標軸インジケーター` の X・Y・Z
    - 今の `フェーズ2時点` は Inter だけ。日本語の文字は、Inter に字形がないので別のフォントで表示される（実装と同じ条件）。ユーザーが了承した
  - 2 つのボードのヘッダーで、縮小の丸めの残りによるはみ出しと重なりを直した
    - `履歴とグリッド表示` の幅を 152 から 158 に広げ、その分だけ左へずらした（右端は同じ位置）。幅 158 のままにすることを、ユーザーが了承した
    - 中の `グリッド／ON` は幅 99 にし、`やり直す` の右端から始めた
- 残したもの
  - `完成予想` のインスペクターに、大きさ 9・10 の小さな文字が 36 個ある。構想なので比率を保ち、そのままにした。実装する Issue で描き直す
  - `app/src/styles/editorColors.ts` のコメントの出どころの記述は、経緯として残す
- 公開の判断: `designs/exports/WebGameEngine/WebGameEngine.penpot` を公開リポジトリにコミットしてよいと、ユーザーが判断した（2026-11-24）。フォントは Google Fonts（OFL）の参照だけで、ファイルは入っていない。画像はボードのサムネイル（PNG）と、参照画像 `3Dシーン（参照画像）` の webp が 1 つ。参照画像はこのアプリの画面のスクリーンショットで、`app/public/` の MMD モデルが写っているが、これらはすでにこのリポジトリと GitHub Pages で公開している。書き出しで一緒にできた別件のファイル（`Drafts/` の下）はコミットしない

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
