/**
 * 回收 Decap 手写稿已不再引用的 COS 图（前缀 sync/decap/）。
 *
 * 删文章不会立刻调 COS；下次构建 ingest 时：
 *   1) 扫剩余笔记里的 CDN URL + 仍引用的本地 uploads（按内容 hash 推算 key）
 *   2) 列出 COS sync/decap/*
 *   3) 删除未被引用的对象
 *
 * 不碰 news/、sync/<sourceId>/ 等其它前缀（多文共享靠 content-hash，仍有引用则保留）。
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
const PREFIX = "sync/decap/";
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

function keyFromCdnUrl(url) {
  const base = cosConfig().cdnBase;
  if (!base || !url.startsWith(base + "/")) return null;
  const key = url.slice(base.length + 1).split("?")[0];
  return key.startsWith(PREFIX) ? key : null;
}

function keyFromLocalUpload(ref) {
  let rel = String(ref || "").trim();
  if (rel.startsWith("uploads/")) rel = "/" + rel;
  if (!rel.startsWith("/uploads/")) return null;
  const local = path.join(websiteRoot, "public", rel.replace(/^\//, ""));
  if (!fs.existsSync(local) || !IMAGE_EXT.test(local)) return null;
  const buf = fs.readFileSync(local);
  const ext = extFromPath(local);
  const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
  return `${PREFIX}${hash}.${ext}`;
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
      const fromLocal = keyFromLocalUpload(ref);
      if (fromLocal) keys.add(fromLocal);
    }
  }
  return keys;
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
  const remote = await listObjectKeys(PREFIX);
  const orphans = remote.filter((k) => !live.has(k));

  if (!quiet) {
    console.log(
      `gc-cos-decap: live ${live.size}, remote ${remote.length}, orphan ${orphans.length}` +
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
