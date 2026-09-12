/**
 * 把 Decap 误存到「笔记同目录」的图片归一到 website/public/uploads，
 * 并改写 cover / 正文引用为 /uploads/...。
 *
 * 根因：collection 使用 path: "{{group}}/{{slug}}" 时，Decap 默认把媒体
 * 存到条目旁（忽略仅写在全局的 media_folder）。构建前收口，避免 Vite
 * 把不存在的 /uploads/xxx 当模块解析而失败。
 *
 * Usage:
 *   node scripts/normalize-decap-media.mjs
 *   node scripts/normalize-decap-media.mjs --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const websiteRoot = path.join(root, "website");
const uploadsDir = path.join(websiteRoot, "public", "uploads");
const dryRun = process.argv.includes("--dry-run");

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
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

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
  return out;
}

function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  return {
    fm: raw.slice(4, end),
    body: raw.slice(end + 4),
    end,
  };
}

function fmGetCover(fm) {
  const m = fm.match(/^cover:\s*(.+)$/m);
  if (!m) return "";
  return m[1].trim().replace(/^["']|["']$/g, "");
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHttp(src) {
  return /^https?:\/\//i.test(src);
}

function isPublicUpload(src) {
  return src.startsWith("/uploads/");
}

/** 裸文件名或同目录相对路径（非 /、非 http） */
function isEntryRelative(src) {
  if (!src || isHttp(src) || src.startsWith("data:")) return false;
  if (src.startsWith("/")) return false;
  return IMAGE_EXT.test(src.split("?")[0]);
}

function uniqueDestName(baseName) {
  let name = baseName;
  let dest = path.join(uploadsDir, name);
  if (!fs.existsSync(dest)) return name;
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext);
  let i = 2;
  while (fs.existsSync(path.join(uploadsDir, `${stem}-${i}${ext}`))) i++;
  return `${stem}-${i}${ext}`;
}

/**
 * 把本地文件挪到 public/uploads，返回最终 /uploads/ 路径。
 * 若目标已存在同名且体积相同则删源文件；不同则换名。
 */
function moveIntoUploads(srcFile) {
  if (!fs.existsSync(srcFile)) return null;
  fs.mkdirSync(uploadsDir, { recursive: true });
  const baseName = path.basename(srcFile);
  const preferred = path.join(uploadsDir, baseName);

  if (path.resolve(srcFile) === path.resolve(preferred)) {
    return `/uploads/${baseName}`;
  }

  let destName = baseName;
  let dest = preferred;
  if (fs.existsSync(dest)) {
    const a = fs.statSync(srcFile).size;
    const b = fs.statSync(dest).size;
    if (a === b) {
      if (!dryRun) fs.unlinkSync(srcFile);
      return `/uploads/${baseName}`;
    }
    destName = uniqueDestName(baseName);
    dest = path.join(uploadsDir, destName);
  }

  if (!dryRun) {
    fs.renameSync(srcFile, dest);
  }
  return `/uploads/${destName}`;
}

function findLocalFile(mdFile, ref) {
  const dir = path.dirname(mdFile);
  if (isEntryRelative(ref)) {
    const candidate = path.join(dir, ref);
    if (fs.existsSync(candidate)) return candidate;
    return null;
  }
  if (isPublicUpload(ref)) {
    const inPublic = path.join(websiteRoot, "public", ref.replace(/^\//, ""));
    if (fs.existsSync(inPublic)) return inPublic;
    // 误写 /uploads/x 但文件其实在笔记旁
    const sibling = path.join(dir, path.basename(ref));
    if (fs.existsSync(sibling)) return sibling;
  }
  return null;
}

function collectBodyRelImages(body) {
  const refs = new Set();
  for (const m of body.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const src = (m[1] || "").trim();
    if (isEntryRelative(src)) refs.add(src);
  }
  for (const m of body.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    const src = (m[1] || "").trim();
    if (isEntryRelative(src)) refs.add(src);
  }
  return [...refs];
}

function rewriteAll(raw, from, to) {
  if (!from || from === to) return raw;
  // 避免把已是 /uploads/foo 的引用再写成 /uploads//uploads/foo
  if (to.endsWith(from) && to.length > from.length) {
    const re = new RegExp(`(?<!\\/uploads\\/)${escapeRegExp(from)}`, "g");
    return raw.replace(re, to);
  }
  return raw.split(from).join(to);
}

export function normalizeDecapMedia({ quiet = false } = {}) {
  let files = 0;
  let moved = 0;
  let rewritten = 0;

  for (const mdFile of listNoteMarkdown()) {
    let raw = fs.readFileSync(mdFile, "utf8");
    const parts = splitFrontmatter(raw);
    if (!parts) continue;

    const rewrites = new Map(); // from → /uploads/...
    const cover = fmGetCover(parts.fm);

    if (cover && (isEntryRelative(cover) || isPublicUpload(cover))) {
      const local = findLocalFile(mdFile, cover);
      if (local && path.dirname(local) !== uploadsDir) {
        const pub = moveIntoUploads(local);
        if (pub) {
          moved++;
          rewrites.set(cover, pub);
          if (path.basename(local) !== path.basename(pub)) {
            rewrites.set(path.basename(local), pub);
          }
        }
      } else if (cover && isEntryRelative(cover) && !local) {
        if (!quiet) {
          console.warn(
            `normalize-decap-media: cover missing beside entry: ${path.relative(root, mdFile)} → ${cover}`,
          );
        }
      }
    }

    for (const ref of collectBodyRelImages(parts.body)) {
      if (rewrites.has(ref)) continue;
      const local = findLocalFile(mdFile, ref);
      if (!local) continue;
      if (path.dirname(local) === uploadsDir) {
        rewrites.set(ref, `/uploads/${path.basename(local)}`);
        continue;
      }
      const pub = moveIntoUploads(local);
      if (pub) {
        moved++;
        rewrites.set(ref, pub);
      }
    }

    if (!rewrites.size) continue;

    let next = raw;
    const ordered = [...rewrites.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of ordered) {
      const after = rewriteAll(next, from, to);
      if (after !== next) {
        next = after;
        rewritten++;
      }
    }

    // cover 裸名：确保 frontmatter 写成 /uploads/...
    const coverNow = fmGetCover(splitFrontmatter(next)?.fm || "");
    if (coverNow && isEntryRelative(coverNow)) {
      const mapped = rewrites.get(coverNow);
      if (mapped) {
        next = next.replace(
          new RegExp(`^(cover:\\s*)${escapeRegExp(coverNow)}\\s*$`, "m"),
          `$1${mapped}`,
        );
      }
    }

    if (next !== raw) {
      files++;
      if (!dryRun) fs.writeFileSync(mdFile, next, "utf8");
      if (!quiet) {
        console.log(
          `normalize-decap-media: ${path.relative(root, mdFile)}` +
            (dryRun ? " (dry-run)" : ""),
        );
      }
    }
  }

  if (!quiet) {
    console.log(
      `normalize-decap-media: ${files} file(s), ${moved} moved, ${rewritten} rewrite(s)` +
        (dryRun ? " [dry-run]" : ""),
    );
  }
  return { files, moved, rewritten };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    normalizeDecapMedia();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
