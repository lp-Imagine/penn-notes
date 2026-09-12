/**
 * 回收本站 Decap 手写稿已不再引用的 COS 图。
 *
 * 安全边界（同桶其它项目不会误删）：
 * - 只处理本站前缀：
 *   - 新：penn-notes/decap/
 *   - 旧：sync/decap/ + 严格「12 位 hex.hash.扩展名」（历史 Decap 收口）
 * - 不碰 news/、sync/<sourceId>/、其它项目任意路径
 * - 多文共用同一 content-hash 时，只要还有引用就保留
 *
 * 删文章不会立刻调 COS；下次构建 ingest 时回收孤儿对象。
 *
 * Usage:
 *   node scripts/gc-cos-decap-images.mjs
 *   node scripts/gc-cos-decap-images.mjs --dry-run
 * Env:
 *   COS_GC_DECAP=0  跳过回收
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cosConfigured,
  cosConfig,
  loadDotEnv,
  listObjectKeys,
  deleteObjects,
  isCdnUrl,
  repoRoot,
} from "./cos-upload.mjs";

const root = repoRoot;
const websiteRoot = path.join(root, "website");

/** 本站专用前缀（新上传） */
const PREFIX_NEW = "penn-notes/decap/";
/** 历史 Decap 收口前缀（仅匹配固定命名，避免误伤同目录其它项目文件） */
const PREFIX_LEGACY = "sync/decap/";
const LEGACY_KEY_RE = /^sync\/decap\/[a-f0-9]{12}\.(jpe?g|png|gif|webp|avif)$/i;
const NEW_KEY_RE = /^penn-notes\/decap\/[a-f0-9]{12}\.(jpe?g|png|gif|webp|avif)$/i;

const NOTE_SECTIONS = [
  "web",
  "ui",
  "engineering",
  "backend",
  "tech",
  "computer",
  "agent",
  "misc",
];
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;
const dryRun = process.argv.includes("--dry-run");

function walkMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkMd(full, acc);
    else if (name.endsWith(".md") && name !== "index.md") acc.push(full);
  }
  return acc;
}

function listNoteMarkdown() {
  const out = [];
  for (const section of NOTE_SECTIONS) {
    walkMd(path.join(websiteRoot, section), out);
  }
  walkMd(path.join(websiteRoot, "sync"), out);
  return out;
}

function collectRawRefs(raw) {
  const refs = new Set();
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end > 0) {
      const m = raw.slice(4, end).match(/^cover:\s*(.+)$/m);
      if (m) refs.add(m[1].trim().replace(/^["']|["']$/g, ""));
    }
  }
  for (const m of raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (m[1]) refs.add(m[1].trim());
  }
  for (const m of raw.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    if (m[1]) refs.add(m[1].trim());
  }
  return [...refs].filter(Boolean);
}

function extFromPath(p, fallback = "jpg") {
  const ext = path.extname(String(p).split("?")[0]).toLowerCase().replace(".", "");
  if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return fallback;
}

function isManagedKey(key) {
  return NEW_KEY_RE.test(key) || LEGACY_KEY_RE.test(key);
}

function keyFromCdnUrl(url) {
  const base = cosConfig().cdnBase;
  if (!base || !url.startsWith(base + "/")) return null;
  const key = url.slice(base.length + 1).split("?")[0];
  return isManagedKey(key) ? key : null;
}

/** 本地仍引用的 uploads → 新旧两套可能 key（兼容历史） */
function keysFromLocalUpload(ref) {
  let rel = String(ref || "").trim();
  if (rel.startsWith("uploads/")) rel = "/" + rel;
  if (!rel.startsWith("/uploads/")) return [];
  const local = path.join(websiteRoot, "public", rel.replace(/^\//, ""));
  if (!fs.existsSync(local) || !IMAGE_EXT.test(local)) return [];
  const buf = fs.readFileSync(local);
  const ext = extFromPath(local);
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
  return [`${PREFIX_NEW}${hash}.${ext}`, `${PREFIX_LEGACY}${hash}.${ext}`];
}

function collectLiveKeys() {
  const keys = new Set();
  for (const full of listNoteMarkdown()) {
    const raw = fs.readFileSync(full, "utf8");
    for (const ref of collectRawRefs(raw)) {
      if (isCdnUrl(ref)) {
        const k = keyFromCdnUrl(ref);
        if (k) keys.add(k);
        continue;
      }
      for (const k of keysFromLocalUpload(ref)) keys.add(k);
    }
  }
  return keys;
}

async function listManagedRemoteKeys() {
  const [newer, legacy] = await Promise.all([
    listObjectKeys(PREFIX_NEW),
    listObjectKeys(PREFIX_LEGACY),
  ]);
  return [...newer, ...legacy].filter(isManagedKey);
}

export async function gcCosDecapImages({ quiet = false } = {}) {
  loadDotEnv();
  if (process.env.COS_GC_DECAP === "0" || process.env.COS_GC_DECAP === "false") {
    if (!quiet) console.log("gc-cos-decap: skipped (COS_GC_DECAP=0)");
    return { listed: 0, live: 0, deleted: 0, skipped: true };
  }
  if (!cosConfigured()) {
    if (!quiet) {
      console.warn("gc-cos-decap: COS env not set; skip");
    }
    return { listed: 0, live: 0, deleted: 0, skipped: true };
  }

  const live = collectLiveKeys();
  const remote = await listManagedRemoteKeys();
  const orphans = remote.filter((k) => !live.has(k));

  if (!quiet) {
    console.log(
      `gc-cos-decap: live ${live.size}, managed-remote ${remote.length}, orphan ${orphans.length}` +
        (dryRun ? " (dry-run)" : ""),
    );
    for (const k of orphans.slice(0, 20)) {
      console.log(`  - ${k}`);
    }
    if (orphans.length > 20) console.log(`  … ${orphans.length - 20} more`);
  }

  let deleted = 0;
  if (orphans.length && !dryRun) {
    deleted = await deleteObjects(orphans);
  } else if (orphans.length && dryRun) {
    deleted = orphans.length;
  }

  if (!quiet) {
    console.log(
      `gc-cos-decap: ${dryRun ? "would delete" : "deleted"} ${deleted}`,
    );
  }
  return {
    listed: remote.length,
    live: live.size,
    deleted,
    skipped: false,
    dryRun,
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await gcCosDecapImages();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
