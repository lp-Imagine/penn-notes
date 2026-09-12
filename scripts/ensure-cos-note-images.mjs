/**
 * 笔记配图构建期收口：本地 /uploads|/sync 与外链 → COS，写回 cover / 正文。
 *
 * Usage:
 *   node scripts/ensure-cos-note-images.mjs
 *   node scripts/ensure-cos-note-images.mjs --dry-run
 *
 * COS 未配置时跳过（本地开发）；单张失败打警告并保留原地址，不阻断构建。
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetch as undiciFetch, Headers, Request, Response } from "undici";
import {
  cosConfigured,
  loadDotEnv,
  uploadBuffer,
  uploadFile,
  isCdnUrl,
  cosConfig,
  repoRoot,
} from "./cos-upload.mjs";

if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = undiciFetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

const fetch = globalThis.fetch.bind(globalThis);

const root = repoRoot;
const websiteRoot = path.join(root, "website");
const publicRoot = path.join(websiteRoot, "public");
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
const MAX_BYTES = 20_000_000; // Decap 手写大图（微信原图）常见 5–15MB
const MIN_BYTES = 200;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

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

/** 从一篇 md 抽出需收口的图片引用（cover + 正文） */
function collectImageRefs(raw) {
  const refs = new Set();

  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 3);
    if (end > 0) {
      const yaml = raw.slice(4, end);
      const m = yaml.match(/^cover:\s*(.+)$/m);
      if (m) {
        const v = m[1].trim().replace(/^["']|["']$/g, "");
        if (v) refs.add(v);
      }
    }
  }

  for (const m of raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (m[1]) refs.add(m[1].trim());
  }
  for (const m of raw.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    if (m[1]) refs.add(m[1].trim());
  }

  return [...refs].filter((u) => shouldConsider(u));
}

function shouldConsider(src) {
  if (!src || src.startsWith("data:")) return false;
  if (isCdnUrl(src)) return false;
  const base = cosConfig().cdnBase;
  if (base && src.startsWith(base + "/")) return false;
  if (src.startsWith("/uploads/") || src.startsWith("/sync/")) return true;
  if (src.startsWith("uploads/")) return true;
  if (/^https?:\/\//i.test(src) && IMAGE_EXT.test(src.split("?")[0])) return true;
  // 外链无扩展名但可能是图片 CDN：仍尝试（下载时校验 content-type）
  if (/^https?:\/\//i.test(src) && !/\.(svg|html?|xml|json|js|css)(\?|$)/i.test(src)) {
    return true;
  }
  return false;
}

function isBlockedHost(hostname) {
  const h = String(hostname || "")
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan")
  ) {
    return true;
  }
  if (h === "::1" || h === "https://example.com/user/juliet") return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./.test(h)) return true; // CGNAT
  return false;
}

function extFromContentType(ct, fallback = "jpg") {
  const t = String(ct || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("gif")) return "gif";
  if (t.includes("avif")) return "avif";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  return fallback;
}

function extFromPath(p, fallback = "jpg") {
  const ext = path.extname(String(p).split("?")[0]).toLowerCase().replace(".", "");
  if (["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return fallback;
}

function localPublicPath(src) {
  if (src.startsWith("uploads/")) src = `/${src}`;
  if (src.startsWith("/uploads/") || src.startsWith("/sync/")) {
    return path.join(publicRoot, src.replace(/^\/+/, ""));
  }
  return null;
}

async function downloadExternal(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/i.test(parsed.protocol)) return null;
  if (isBlockedHost(parsed.hostname)) {
    console.warn(`note-images: blocked host ${parsed.hostname}`);
    return null;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;

  // 简单防 SSRF：重定向后再次校验 host
  const finalHost = res.url ? new URL(res.url).hostname : parsed.hostname;
  if (isBlockedHost(finalHost)) {
    console.warn(`note-images: blocked redirect host ${finalHost}`);
    return null;
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) return null;
  return {
    buf,
    ext: extFromContentType(ct, extFromPath(url)),
    contentType: ct.split(";")[0].trim() || undefined,
  };
}

/**
 * @returns {Promise<string|null>} CDN URL or null
 */
async function resolveOne(src, cache) {
  if (cache.has(src)) return cache.get(src);

  if (isCdnUrl(src)) {
    cache.set(src, src);
    return src;
  }

  const local = localPublicPath(src);
  if (local) {
    if (!fs.existsSync(local)) {
      console.warn(`note-images: missing local file ${src}`);
      cache.set(src, null);
      return null;
    }
    try {
      const buf = fs.readFileSync(local);
      if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) {
        console.warn(`note-images: skip size ${src} (${buf.length} bytes)`);
        cache.set(src, null);
        return null;
      }
      const ext = extFromPath(local);
      const hash = crypto.createHash("sha1").update(buf).digest("hex").slice(0, 12);
      const key = `penn-notes/decap/${hash}.${ext}`;
      if (dryRun) {
        const url = `${cosConfig().cdnBase}/${key}`;
        cache.set(src, url);
        return url;
      }
      const url = await uploadFile(local, key);
      cache.set(src, url);
      return url;
    } catch (err) {
      console.warn(`note-images: local upload failed ${src}: ${err.message || err}`);
      cache.set(src, null);
      return null;
    }
  }

  if (/^https?:\/\//i.test(src)) {
    try {
      const got = await downloadExternal(src);
      if (!got) {
        cache.set(src, null);
        return null;
      }
      const hash = crypto.createHash("sha1").update(got.buf).digest("hex").slice(0, 12);
      const key = `penn-notes/decap/${hash}.${got.ext}`;
      if (dryRun) {
        const url = `${cosConfig().cdnBase}/${key}`;
        cache.set(src, url);
        return url;
      }
      const url = await uploadBuffer(key, got.buf, {
        contentType: got.contentType,
      });
      cache.set(src, url);
      return url;
    } catch (err) {
      console.warn(`note-images: remote upload failed ${src}: ${err.message || err}`);
      cache.set(src, null);
      return null;
    }
  }

  cache.set(src, null);
  return null;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyRewrites(raw, map) {
  let text = raw;
  let count = 0;
  // 长 URL 优先，避免短串误伤
  const entries = [...map.entries()]
    .filter(([, to]) => to)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [from, to] of entries) {
    if (from === to) continue;
    const re = new RegExp(escapeRegExp(from), "g");
    const next = text.replace(re, () => {
      count++;
      return to;
    });
    text = next;
  }
  return { text, count };
}

export async function ensureCosNoteImages({ quiet = false } = {}) {
  loadDotEnv();
  if (!cosConfigured()) {
    if (!quiet) {
      console.warn(
        "ensure-cos-note-images: COS env not set; skip (local/external refs kept)",
      );
    }
    return { files: 0, rewritten: 0, uploaded: 0, skipped: true };
  }

  const cache = new Map();
  let files = 0;
  let rewritten = 0;
  let uploaded = 0;

  for (const full of listNoteMarkdown()) {
    const raw = fs.readFileSync(full, "utf8");
    const refs = collectImageRefs(raw);
    if (!refs.length) continue;

    const map = new Map();
    for (const src of refs) {
      const cdn = await resolveOne(src, cache);
      if (cdn && cdn !== src) {
        map.set(src, cdn);
        uploaded++;
      }
    }
    if (!map.size) continue;

    const { text, count } = applyRewrites(raw, map);
    if (!count || text === raw) continue;

    files++;
    rewritten += count;
    const rel = path.relative(root, full);
    if (!quiet) {
      console.log(
        `note-images: ${rel} → ${count} ref(s)${dryRun ? " (dry-run)" : ""}`,
      );
    }
    if (!dryRun) fs.writeFileSync(full, text, "utf8");
  }

  if (!quiet) {
    console.log(
      `ensure-cos-note-images: files ${files}, rewrites ${rewritten}, resolves ${uploaded}${
        dryRun ? " (dry-run)" : ""
      }`,
    );
  }
  return { files, rewritten, uploaded, skipped: false, dryRun };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await ensureCosNoteImages();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
