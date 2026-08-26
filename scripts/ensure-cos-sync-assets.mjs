/**
 * Upload website/public/sync/** to COS and rewrite /sync/ refs in markdown.
 * Fail hard when COS is configured but upload fails (cover is a hard dependency).
 *
 * Usage: node scripts/ensure-cos-sync-assets.mjs
 * If COS env missing: skip with warning (local dev without Secrets).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cosConfigured,
  loadDotEnv,
  uploadFile,
  repoRoot,
} from "./cos-upload.mjs";
import { rewriteLocalImagePaths } from "./cos-rewrite.mjs";

const root = repoRoot;
const publicSync = path.join(root, "website/public/sync");
const websiteRoot = path.join(root, "website");
const NOTE_SECTIONS = ["web", "ui", "tech", "computer", "agent", "misc"];
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

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

function walkMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkMd(full, acc);
    else if (name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

export async function ensureCosSyncAssets({ quiet = false } = {}) {
  loadDotEnv();
  if (!cosConfigured()) {
    if (!quiet) {
      console.warn(
        "ensure-cos-sync-assets: COS env not set; skip (local /sync/ paths kept)",
      );
    }
    return { uploaded: 0, rewritten: 0, skipped: true };
  }

  let uploaded = 0;
  const images = walkFiles(publicSync).filter((f) => IMAGE_EXT.test(f));
  for (const full of images) {
    const key = path.relative(path.join(root, "website/public"), full).split(path.sep).join("/");
    try {
      const url = await uploadFile(full, key);
      uploaded++;
      if (!quiet) console.log(`sync upload: ${key} → ${url}`);
    } catch (err) {
      console.error(`sync upload FAILED: ${key}: ${err.message || err}`);
      throw err;
    }
  }

  const mdFiles = [];
  for (const section of NOTE_SECTIONS) {
    walkMd(path.join(websiteRoot, section), mdFiles);
  }
  walkMd(path.join(websiteRoot, "sync"), mdFiles);

  let rewritten = 0;
  for (const full of mdFiles) {
    const raw = fs.readFileSync(full, "utf8");
    if (!raw.includes("/sync/")) continue;
    const { text, count } = rewriteLocalImagePaths(raw);
    if (count && text !== raw) {
      fs.writeFileSync(full, text, "utf8");
      rewritten += count;
      if (!quiet) {
        console.log(`sync rewrite: ${path.relative(root, full)} (+${count})`);
      }
    }
  }

  if (!quiet) {
    console.log(
      `ensure-cos-sync-assets: uploaded ${uploaded}, rewrote ${rewritten} ref(s)`,
    );
  }
  return { uploaded, rewritten, skipped: false };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    await ensureCosSyncAssets();
  } catch {
    process.exit(1);
  }
}
