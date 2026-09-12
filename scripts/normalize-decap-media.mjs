/**
 * 把 Decap 误存的图片归一到 website/public/uploads，
 * 并改写 cover / 正文引用为 /uploads/...。
 *
 * 两类误存：
 * 1) 嵌套 path 默认 media_folder:'' → 图在条目同目录（裸文件名）
 * 2) collection 误写 website/public/uploads（相对栏目）→ 图在
 *    <entry>/website/public/uploads/，而字段已是 /uploads/...（预览裂图）
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

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
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
  const preferred = path.join(uploadsDir, baseName);
  if (!fs.existsSync(preferred)) return baseName;
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

/** 在笔记目录树里找误存的上传图 */
function findLocalFile(mdFile, ref) {
  const dir = path.dirname(mdFile);
  const base = path.basename(String(ref).split("?")[0]);

  if (isEntryRelative(ref)) {
    const candidate = path.join(dir, ref);
    if (fs.existsSync(candidate)) return candidate;
  }

  if (isPublicUpload(ref)) {
    const inPublic = path.join(websiteRoot, "public", ref.replace(/^\//, ""));
    if (fs.existsSync(inPublic)) return inPublic;
  }

  const candidates = [
    path.join(dir, base),
    path.join(dir, "website", "public", "uploads", base),
    path.join(dir, "public", "uploads", base),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function collectImageRefs(raw) {
  const refs = new Set();
  const parts = splitFrontmatter(raw);
  if (parts) {
    const cover = fmGetCover(parts.fm);
    if (cover) refs.add(cover);
    raw = parts.fm + "\n" + parts.body;
  }
  for (const m of raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (m[1]) refs.add(m[1].trim());
  }
  for (const m of raw.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    if (m[1]) refs.add(m[1].trim());
  }
  return [...refs].filter(
    (src) => isEntryRelative(src) || isPublicUpload(src),
  );
}

function rewriteAll(raw, from, to) {
  if (!from || from === to) return raw;
  if (to.endsWith(from) && to.length > from.length) {
    const re = new RegExp(`(?<!\\/uploads\\/)${escapeRegExp(from)}`, "g");
    return raw.replace(re, to);
  }
  return raw.split(from).join(to);
}

function removeEmptyDirs(startDir, stopDir) {
  let dir = startDir;
  while (dir && dir.startsWith(stopDir) && dir !== stopDir) {
    if (!fs.existsSync(dir)) {
      dir = path.dirname(dir);
      continue;
    }
    if (fs.readdirSync(dir).length) break;
    if (!dryRun) fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

/** 扫掉栏目下误建的 website/public/uploads 树 */
function sweepMisplacedUploadTrees({ quiet = false } = {}) {
  let moved = 0;
  for (const section of NOTE_SECTIONS) {
    const sectionRoot = path.join(websiteRoot, section);
    for (const file of walkFiles(sectionRoot)) {
      const norm = file.split(path.sep).join("/");
      if (!norm.includes("/website/public/uploads/")) continue;
      if (!IMAGE_EXT.test(file)) continue;
      if (path.resolve(file).startsWith(path.resolve(uploadsDir) + path.sep)) {
        continue;
      }
      const pub = moveIntoUploads(file);
      if (pub) {
        moved++;
        if (!quiet) {
          console.log(
            `normalize-decap-media: sweep ${path.relative(root, file)} → ${pub}`,
          );
        }
        removeEmptyDirs(path.dirname(file), sectionRoot);
      }
    }
  }
  return moved;
}

export function normalizeDecapMedia({ quiet = false } = {}) {
  let files = 0;
  let moved = sweepMisplacedUploadTrees({ quiet });
  let rewritten = 0;

  for (const mdFile of listNoteMarkdown()) {
    let raw = fs.readFileSync(mdFile, "utf8");
    const parts = splitFrontmatter(raw);
    if (!parts) continue;

    const rewrites = new Map();
    const refs = collectImageRefs(raw);

    for (const ref of refs) {
      const local = findLocalFile(mdFile, ref);
      if (!local) {
        if (isEntryRelative(ref) && !quiet) {
          console.warn(
            `normalize-decap-media: missing ${path.relative(root, mdFile)} → ${ref}`,
          );
        }
        continue;
      }

      const alreadyInUploads =
        path.resolve(path.dirname(local)) === path.resolve(uploadsDir);

      if (alreadyInUploads) {
        const pub = `/uploads/${path.basename(local)}`;
        if (ref !== pub && isEntryRelative(ref)) rewrites.set(ref, pub);
        continue;
      }

      const pub = moveIntoUploads(local);
      if (!pub) continue;
      moved++;
      rewrites.set(ref, pub);
      if (isEntryRelative(ref) || path.basename(ref) !== path.basename(pub)) {
        rewrites.set(path.basename(local), pub);
      }
      removeEmptyDirs(path.dirname(local), path.dirname(mdFile));
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

    const coverNow = fmGetCover(splitFrontmatter(next)?.fm || "");
    if (coverNow && isEntryRelative(coverNow)) {
      const mapped = rewrites.get(coverNow) || rewrites.get(path.basename(coverNow));
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
