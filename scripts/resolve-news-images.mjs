/**
 * Resolve og:image for news markdown items.
 * 优先下载到 website/public/news/（本地化），避免外链被防盗链/网络限制。
 * 拉取失败、或判定为站标/Google News 默认 logo → 不插图（删掉已有坏图），
 * 不再回退展示外链 logo。
 *
 * Usage:
 *   node scripts/resolve-news-images.mjs
 *   node scripts/resolve-news-images.mjs --file=news/2026-07/ai-news-2026-07-26.md
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetch as undiciFetch, Headers, Request, Response } from "undici";

if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = undiciFetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

const fetch = globalThis.fetch.bind(globalThis);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const newsRoot = path.join(root, "news");
const publicNews = path.join(root, "website/public/news");
const BASE = "/penn-notes/";
// 本地图在 markdown 中写不带 base 的站内路径（/news/...），
// VitePress 构建时自动加 base 前缀，运行时 URL 为 /penn-notes/news/...
const NEWS_PUBLIC_BASE = "/news/";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** URL 层：站点默认 share / favicon / Google News 占位 logo，不当配图 */
const STRIP_IMAGE =
  /the_verge_social_share|global-social-marketing|github-logo-|apple-touch-icon|google-og-image|arxiv-logo-fb|chatgpt\/share-og|favicon\.ico|hellogithub\.com\/images\/logo|cropped-favicon-gradient|reuters-logo\.png|default_article_june|verge-placeholder|wp-content\/uploads\/.*logo|gstatic\.com\/.*gnews|\/news\/publisher|google\.com\/.*\/logo|news\.google\.com\/.*/i;

/**
 * 已知占位图本地 hash（sha1(url).slice(0,12)）。
 * 1613febb1fb7 = Google News 默认 300×300 logo，曾被大量写入日报。
 */
const BAD_LOCAL_HASHES = new Set(["1613febb1fb7"]);

function listNewsFiles(onlyFile) {
  if (onlyFile) {
    const full = path.isAbsolute(onlyFile) ? onlyFile : path.join(root, onlyFile);
    return fs.existsSync(full) ? [full] : [];
  }
  if (!fs.existsSync(newsRoot)) return [];
  const out = [];
  for (const month of fs.readdirSync(newsRoot)) {
    if (month.startsWith(".")) continue;
    const dir = path.join(newsRoot, month);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".md")) out.push(path.join(dir, f));
    }
  }
  return out.sort();
}

function extractOgImage(html) {
  const patterns = [
    /property=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image(?::secure_url)?["']/i,
    /name=["']twitter:image(?::src)?["']\s+content=["']([^"']+)["']/i,
    /"og:image"\s*:\s*"([^"]+)"/i,
    /"twitter:image"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/\\u002F/g, "/").replace(/&amp;/g, "&");
  }
  return null;
}

function githubRepoFromUrl(url) {
  const m = String(url).match(/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
  if (!m) return null;
  const repo = m[1].replace(/\/+$/, "").split("/").slice(0, 2).join("/");
  if (["trending", "periodical", "repository", "topics", "sponsors"].includes(repo.split("/")[1])) {
    return null;
  }
  return repo;
}

/** Best-effort width/height from PNG / JPEG / GIF / WebP buffer. */
function imageSize(buf) {
  if (!buf || buf.length < 24) return null;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // GIF
  if (buf.toString("ascii", 0, 3) === "GIF") {
    return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      const len = buf.readUInt16BE(i + 2);
      i += 2 + len;
    }
  }
  // WebP
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const fourcc = buf.toString("ascii", 12, 16);
    if (fourcc === "VP8 " && buf.length >= 30) {
      return {
        w: buf.readUInt16LE(26) & 0x3fff,
        h: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (fourcc === "VP8L" && buf.length >= 25) {
      const bits = buf.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (fourcc === "VP8X" && buf.length >= 30) {
      return {
        w: 1 + buf[24] + (buf[25] << 8) + (buf[26] << 16),
        h: 1 + buf[27] + (buf[28] << 8) + (buf[29] << 16),
      };
    }
  }
  return null;
}

/**
 * 站标 / 默认 share 图：URL 命中黑名单，或过小方图（Google News 默认 logo 为 300×300）。
 * 拉取失败或判定为 logo → 不当配图（正文不插图）。
 */
function isLogoOrPlaceholder(url, buf) {
  if (url && STRIP_IMAGE.test(url)) return true;
  if (url) {
    const base = path.basename(url.split("?")[0]);
    const hash = base.replace(/\.[a-z]+$/i, "");
    if (BAD_LOCAL_HASHES.has(hash)) return true;
  }
  if (!buf) return false;
  const size = imageSize(buf);
  if (!size) return false;
  // favicon / 极小图标
  if (Math.max(size.w, size.h) < 96) return true;
  // Google News 等默认方标：边长 ≤400 且体积很小
  if (size.w === size.h && size.w <= 400 && buf.length < 80_000) return true;
  return false;
}

/** 本地 /news/... 或外链是否应丢弃（不展示）。 */
function shouldDropImageRef(src) {
  if (!src) return true;
  if (STRIP_IMAGE.test(src)) return true;
  if (src.startsWith(NEWS_PUBLIC_BASE)) {
    const hash = path.basename(src).replace(/\.[a-z]+$/i, "");
    if (BAD_LOCAL_HASHES.has(hash)) return true;
    const full = path.join(publicNews, src.slice(NEWS_PUBLIC_BASE.length));
    // 文件不存在：Vite/Rollup 会把 markdown 里的绝对路径当 import 解析并让构建失败
    if (!fs.existsSync(full)) return true;
    try {
      const buf = fs.readFileSync(full);
      if (isLogoOrPlaceholder(src, buf)) return true;
    } catch {
      return true;
    }
  }
  return false;
}

/** 从条目 block 中删掉配图 markdown 行。 */
function stripImageFromBlock(block) {
  return block.replace(
    /^((?:<p class="news-entry-meta">[\s\S]*?<\/p>\n\n)?)!\[[^\]]*\]\([^)]+\)\n\n/m,
    "$1",
  );
}

async function headOk(url, cache) {
  if (!url?.startsWith("http")) return false;
  const key = `ok:${url}`;
  if (cache.has(key)) return cache.get(key);
  const opts = {
    headers: { "User-Agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  };
  try {
    let res = await fetch(url, { ...opts, method: "HEAD" });
    let ct = res.headers.get("content-type") || "";
    if (res.ok && ct.startsWith("image/")) {
      cache.set(key, true);
      return true;
    }
    res = await fetch(url, {
      ...opts,
      method: "GET",
      headers: { ...opts.headers, Range: "bytes=0-0" },
    });
    ct = res.headers.get("content-type") || "";
    const ok = res.ok && ct.startsWith("image/");
    cache.set(key, ok);
    return ok;
  } catch {
    cache.set(key, false);
    return false;
  }
}

async function downloadImage(url, month, cache) {
  const key = `dl:${url}`;
  if (cache.has(key)) return cache.get(key);
  if (isLogoOrPlaceholder(url, null)) {
    cache.set(key, null);
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      cache.set(key, null);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200 || buf.length > 2_500_000) {
      cache.set(key, null);
      return null;
    }
    // 下载成功但仍是站标 / 默认 logo → 丢弃，正文不插图
    if (isLogoOrPlaceholder(url, buf)) {
      cache.set(key, null);
      return null;
    }
    let ext = "jpg";
    if (ct.includes("png")) ext = "png";
    else if (ct.includes("webp")) ext = "webp";
    else if (ct.includes("gif")) ext = "gif";
    const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 12);
    const dir = path.join(publicNews, month);
    fs.mkdirSync(dir, { recursive: true });
    const file = `${hash}.${ext}`;
    fs.writeFileSync(path.join(dir, file), buf);
    const local = `${NEWS_PUBLIC_BASE}${month}/${file}`;
    cache.set(key, local);
    return local;
  } catch {
    cache.set(key, null);
    return null;
  }
}

async function resolveImage(sourceUrl, title, month, cache) {
  if (!sourceUrl) return null;

  const repo = githubRepoFromUrl(sourceUrl);
  if (repo) {
    const gh = `https://opengraph.githubassets.com/1/${repo}`;
    const local = await downloadImage(gh, month, cache);
    if (local) return local;
    if (await headOk(gh, cache)) return gh;
  }

  const cacheKey = `src:${sourceUrl}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  let image = null;
  try {
    const res = await fetch(sourceUrl, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const html = await res.text();
      image = extractOgImage(html);
      if (image && !image.startsWith("http")) {
        image = new URL(image, sourceUrl).href;
      }
    }
  } catch {
    /* network */
  }

  if (image && !STRIP_IMAGE.test(image) && !isLogoOrPlaceholder(image, null)) {
    const local = await downloadImage(image, month, cache);
    if (local) {
      cache.set(cacheKey, local);
      return local;
    }
    // 下载失败：不再回退外链占位图（避免正文出现 Google News / 站标 logo）
  }

  cache.set(cacheKey, null);
  return null;
}

function firstSourceUrl(sourceLine) {
  const md = sourceLine.match(/\]\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  const html = sourceLine.match(/href=["'](https?:\/\/[^"']+)["']/i);
  return html ? html[1] : null;
}

/**
 * Process one markdown file: insert ![配图](...) after ### title when missing.
 */
export async function resolveFileImages(filePath, cache = new Map()) {
  const rel = path.relative(root, filePath);
  const monthMatch = rel.match(/news\/(\d{4}-\d{2})\//);
  const month = monthMatch ? monthMatch[1] : "misc";
  let content = fs.readFileSync(filePath, "utf8");

  // Split by ### headings (items)
  const parts = content.split(/\n(?=### )/);
  if (parts.length < 2) return { file: rel, updated: 0 };

  let updated = 0;
  const out = [parts[0]];

  // concurrency pool
  const queue = [];
  for (let i = 1; i < parts.length; i++) {
    queue.push(i);
  }

  const results = new Map();
  const concurrency = 5;
  let idx = 0;

  async function worker() {
    while (idx < queue.length) {
      const i = queue[idx++];
      let block = parts[i];
      const titleLine = block.match(/^### ([^\n]+)/);
      const title = titleLine ? titleLine[1].trim() : "";
      // 已有配图：logo/坏图直接删掉；本地真图跳过；外链尝试本地化，失败则删掉（不展示）
      const imgLineMatch = block.match(
        /^((?:<p class="news-entry-meta">[\s\S]*?<\/p>\n\n)?)(!\[[^\]]*\]\(([^)]+)\)\n\n)/m,
      );
      if (imgLineMatch) {
        const existing = imgLineMatch[3] || "";
        if (shouldDropImageRef(existing)) {
          updated++;
          results.set(i, stripImageFromBlock(block));
          continue;
        }
        if (existing.startsWith(NEWS_PUBLIC_BASE)) {
          results.set(i, block);
          continue;
        }
        const local = await downloadImage(existing, month, cache);
        if (local) {
          const replaced = block.replace(
            imgLineMatch[2],
            `![配图](${local})\n\n`,
          );
          updated++;
          results.set(i, replaced);
        } else {
          // 外链拉不到或判定为 logo → 去掉配图，避免展示站标
          updated++;
          results.set(i, stripImageFromBlock(block));
        }
        continue;
      }
      const sourceLine =
        block.match(/<p class="news-entry-source">[\s\S]*?<\/p>/m)?.[0] ||
        block.match(/^\*\*来源：\*\*.+$/m)?.[0] ||
        block.match(/^- \*\*来源：\*\*.+$/m)?.[0] ||
        "";
      const url = firstSourceUrl(sourceLine);
      const image = await resolveImage(url, title, month, cache);
      if (!image) {
        results.set(i, block);
        continue;
      }
      updated++;
      // Insert image after title (+ optional date / meta line)
      let patched;
      if (
        /^### [^\n]+\n\n<p class="news-entry-meta">[\s\S]*?<\/p>\n\n/.test(block)
      ) {
        patched = block.replace(
          /^(### [^\n]+\n\n<p class="news-entry-meta">[\s\S]*?<\/p>\n\n)/,
          `$1![配图](${image})\n\n`,
        );
      } else if (/^### [^\n]+\n\n\d{4}-\d{2}-\d{2}\n\n/.test(block)) {
        patched = block.replace(
          /^(### [^\n]+\n\n\d{4}-\d{2}-\d{2}\n\n)/,
          `$1![配图](${image})\n\n`,
        );
      } else {
        patched = block.replace(
          /^(### [^\n]+)\n\n/,
          `$1\n\n![配图](${image})\n\n`,
        );
      }
      results.set(i, patched);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  for (let i = 1; i < parts.length; i++) {
    out.push(results.get(i) || parts[i]);
  }

  const next = out.join("\n");
  if (next !== content) {
    fs.writeFileSync(filePath, next, "utf8");
  }
  return { file: rel, updated };
}

export async function resolveNewsImages(opts = {}) {
  const files = listNewsFiles(opts.file);
  const cache = new Map();
  let total = 0;
  for (const f of files) {
    const r = await resolveFileImages(f, cache);
    total += r.updated;
    if (r.updated) console.log(`images: ${r.file} +${r.updated}`);
  }
  console.log(`resolve-news-images: updated ${total} item(s) across ${files.length} file(s)`);
  return total;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const fileArg = process.argv.find((a) => a.startsWith("--file="));
  await resolveNewsImages({ file: fileArg ? fileArg.slice(7) : undefined });
}
