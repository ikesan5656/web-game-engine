// @ts-check
// Penpot のファイルを export-binfile API で .penpot に書き出す。
// 実行: designs/ で `node scripts/export-penpot.mjs`
// 認証情報は designs/.env の PENPOT_ACCESS_TOKEN から読む（詳しくは docs/penpot.md）。

import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPORTS_DIR = fileURLToPath(new URL("../exports/", import.meta.url));
const LFS_WARN_BYTES = 5 * 1024 * 1024;

/** @typedef {{ id: string, name: string, isDefault?: boolean }} Project */
/** @typedef {{ id: string, name: string }} PenpotFile */

/** 失敗の理由を利用者に伝える（スタックトレースは出さない） */
class ExportError extends Error {}

try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch (e) {
  const code = /** @type {any} */ (e)?.code;
  fail(
    code === "ENOENT"
      ? "designs/.env がありません。.env.example をコピーして作ってください。"
      : `designs/.env を読めません: ${code ?? String(e)}`
  );
}

const token = process.env.PENPOT_ACCESS_TOKEN?.trim() ?? "";
if (token === "") {
  fail(
    "PENPOT_ACCESS_TOKEN が空です。Penpot のアカウント設定 → Integrations → Access tokens で発行し、designs/.env に書いてください。"
  );
}
const baseUrl = (
  process.env.PENPOT_BASE_URL?.trim() || "http://localhost:9001"
).replace(/\/+$/, "");

/** @param {string} message @returns {never} */
function fail(message) {
  console.error(message);
  process.exit(1);
}

/** @returns {Record<string, string>} */
function authHeaders() {
  return { Authorization: `Token ${token}` };
}

/**
 * fetch を呼び、接続失敗と認証エラーを利用者向けの文言にする
 * @param {string} url
 * @param {RequestInit} init
 */
async function request(url, init) {
  let res;
  try {
    res = await fetch(url, { ...init, redirect: "error" });
  } catch (e) {
    const code = /** @type {any} */ (e)?.cause?.code;
    if (code === "ECONNREFUSED") {
      throw new ExportError(
        `${baseUrl} に接続できません。Penpot が起動していません（designs/ で docker compose up -d）。`
      );
    }
    throw new ExportError(
      `${baseUrl} への接続に失敗しました: ${code ?? String(e)}`
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new ExportError(
      `認証に失敗しました（HTTP ${res.status}）。アクセストークンの期限切れ・失効・誤りの可能性があります。再発行して designs/.env を更新してください。`
    );
  }
  return res;
}

/**
 * RPC を呼ぶ。JSON の応答を返す
 * @param {string} name
 * @param {Record<string, unknown>} params
 * @returns {Promise<any>}
 */
async function rpc(name, params) {
  const res = await request(`${baseUrl}/api/main/methods/${name}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new ExportError(
      `${name} が失敗しました（HTTP ${res.status}）: ${(await res.text()).slice(0, 200)}`
    );
  }
  return res.json();
}

/**
 * export-binfile を呼び、.penpot の中身（バイト列）を返す。
 * 応答は 3 通りに対応する: 直接のバイナリ / SSE（end イベントに URI）/ URI を含む JSON
 * @param {string} fileId
 * @returns {Promise<Buffer>}
 */
async function exportBinfile(fileId) {
  const res = await request(`${baseUrl}/api/main/methods/export-binfile`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    // 共有ライブラリを使い始めたら includeLibraries / embedAssets を true にする
    body: JSON.stringify({
      fileId,
      includeLibraries: false,
      embedAssets: false,
    }),
  });
  if (!res.ok) {
    throw new ExportError(
      `export-binfile が失敗しました（HTTP ${res.status}）: ${(await res.text()).slice(0, 200)}`
    );
  }
  const type = res.headers.get("content-type") ?? "";
  if (/zip|octet-stream/.test(type)) {
    const data = Buffer.from(await res.arrayBuffer());
    assertZip(data, type);
    return data;
  }
  const text = await res.text();
  const uri = extractUri(text);
  if (uri === null) {
    throw new ExportError(
      `export-binfile の応答を解析できません（${type}）: ${text.slice(0, 200)}`
    );
  }
  return download(uri);
}

/**
 * SSE / JSON / transit の応答から URI を取り出す。見つからなければ null
 * @param {string} text
 * @returns {string | null}
 */
function extractUri(text) {
  const found = text.match(
    /(?:~r)?(https?:\/\/[^\s"\\]+|\/assets\/[^\s"\\]+)/g
  );
  const last = found?.at(-1);
  return last ? last.replace(/^~r/, "") : null;
}

/**
 * URI の内容を取得する。ホストがコンテナ内部名でも baseUrl に置き換える
 * @param {string} uri
 * @returns {Promise<Buffer>}
 */
async function download(uri) {
  const parsed = new URL(uri, baseUrl);
  const url = new URL(parsed.pathname + parsed.search, baseUrl).toString();
  const res = await request(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new ExportError(
      `書き出したファイルの取得に失敗しました（HTTP ${res.status}）`
    );
  }
  const data = Buffer.from(await res.arrayBuffer());
  assertZip(data, res.headers.get("content-type") ?? "");
  return data;
}

/**
 * 一時ファイルに書いてから rename する
 * @param {Buffer} data
 * @param {string} dest
 */
async function writeAtomic(data, dest) {
  await mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.tmp`;
  try {
    await writeFile(tmp, data);
    await rename(tmp, dest);
  } catch (e) {
    await rm(tmp, { force: true });
    throw e;
  }
}

/**
 * ファイル名・ディレクトリ名に使えない文字を _ にする
 * @param {string} name
 */
function sanitizeFileName(name) {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[/\\:*?"<>|\u0000-\u001f]/g, "_")
    .trim()
    .replace(/^\.+/, (m) => "_".repeat(m.length));
  return cleaned === "" || cleaned === "." || cleaned === ".." ? "_" : cleaned;
}

/**
 * .penpot は zip なので、先頭が PK\x03\x04 であることを確かめる
 * @param {Buffer} data
 * @param {string} type
 */
function assertZip(data, type) {
  if (
    data.length === 0 ||
    !data.subarray(0, 4).equals(Buffer.from("PK\x03\x04"))
  ) {
    throw new ExportError(
      `書き出した内容が .penpot（zip）ではありません（${data.length} バイト、Content-Type: ${type || "不明"}）。`
    );
  }
}

/** @param {number} bytes */
function formatSize(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

/** @param {string} dir @returns {Promise<string[]>} */
async function listPenpotFiles(dir) {
  /** @type {string[]} */
  const result = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await listPenpotFiles(full)));
    else if (entry.name.endsWith(".penpot")) result.push(full);
  }
  return result;
}

async function main() {
  /** @type {Project[]} */
  const projects = await rpc("get-all-projects", {});
  // 名前の付け方を毎回同じにするため、ID 順に処理する
  projects.sort((a, b) => a.id.localeCompare(b.id));
  const written = new Set();
  const usedDirs = new Set();
  const usedDests = new Set();
  let oversize = false;

  for (const project of projects) {
    /** @type {PenpotFile[]} */
    const files = await rpc("get-project-files", { projectId: project.id });
    files.sort((a, b) => a.id.localeCompare(b.id));
    // 大文字小文字だけが違う名前も同じとみなす（macOS など）。重なったら ID を付ける
    let dirName = sanitizeFileName(project.isDefault ? "Drafts" : project.name);
    if (usedDirs.has(dirName.toLowerCase())) {
      dirName = `${dirName}-${project.id.slice(0, 8)}`;
    }
    usedDirs.add(dirName.toLowerCase());
    const projectDir = path.join(EXPORTS_DIR, dirName);
    const nameCount = new Map();
    for (const f of files) {
      const n = sanitizeFileName(f.name).toLowerCase();
      nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
    }
    for (const file of files) {
      const base = sanitizeFileName(file.name);
      const withId = `${base}-${file.id.slice(0, 8)}`;
      let dest = path.join(
        projectDir,
        `${(nameCount.get(base.toLowerCase()) ?? 0) > 1 ? withId : base}.penpot`
      );
      if (usedDests.has(dest.toLowerCase())) {
        dest = path.join(projectDir, `${withId}.penpot`);
      }
      usedDests.add(dest.toLowerCase());
      await writeAtomic(await exportBinfile(file.id), dest);
      const { size } = await stat(dest);
      written.add(dest);
      console.log(
        `${path.relative(process.cwd(), dest)}（${formatSize(size)}）`
      );
      if (size > LFS_WARN_BYTES) oversize = true;
    }
  }

  if (oversize) {
    console.warn(
      "警告: 5 MB を超えるファイルがあります。git LFS への移行を検討してください（docs/penpot.md）。"
    );
  }
  const stale = (await listPenpotFiles(EXPORTS_DIR)).filter(
    (f) => !written.has(f)
  );
  if (stale.length > 0) {
    console.log("今回は書き出されなかった既存のファイル（消していません）:");
    for (const f of stale) console.log(`  ${path.relative(process.cwd(), f)}`);
  }
}

try {
  await main();
} catch (e) {
  fail(
    e instanceof ExportError
      ? e.message
      : `予期しないエラー: ${e instanceof Error ? e.message : String(e)}`
  );
}
