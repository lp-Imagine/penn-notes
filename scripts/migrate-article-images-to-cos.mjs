/**
 * One-shot: upload article images to COS and rewrite markdown refs.
 *
 * Uploads:
 *   website/public/news (images)
 *   website/public/sync
 *   website/public/img/legacy
 *
 * Rewrites /news/, /sync/, /img/legacy/ to COS_CDN_BASE absolute URLs
 * in news and website markdown (skips node_modules / .vitepress/dist).
 *
 * Usage:
 *   node scripts/migrate-article-images-to-cos.mjs
 *   node scripts/migrate-article-images-to-cos.mjs --dry-run
 *   node scripts/migrate-article-images-to-cos.mjs --rewrite-only
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadDotEnv,
  requireCosConfig,
  uploadFile,
  repoRoot,
} from "./cos-upload.mjs";
import { rewriteLocalImagePaths } from "./cos-rewrite.mjs";

const root = repoRoot;
const dryRun = process.argv.includes("--dry-run");
const rewriteOnly = process.argv.includes("--rewrite-only");
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

const UPLOAD_ROOTS = [
  path.join(root, "website/public/news"),
  path.join(root, "website/public/sync"),
  path.join(root, "website/public/img/legacy"),
];

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

function walkMd(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "cache") continue;
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkMd(full, acc);
    else if (name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

async function uploadTree(absRoot) {
  const publicRoot = path.join(root, "website/public");
  const files = walkFiles(absRoot).filter((f) => IMAGE_EXT.test(f));
  // Skip feed-related non-images already filtered
  let ok = 0;
  let fail = 0;
  for (const full of files) {
    const key = path.relative(publicRoot, full).split(path.sep).join("/");
    if (dryRun) {
      console.log(`[dry-run] upload ${key}`);
      ok++;
      continue;
    }
    try {
      const url = await uploadFile(full, key);
      ok++;
      if (ok % 20 === 0) console.log(`uploaded ${ok}/${files.length}…`);
      else if (process.env.COS_MIGRATE_VERBOSE) {
        console.log(`ok ${key} → ${url}`);
      }
    } catch (err) {
      fail++;
      console.error(`FAIL ${key}: ${err.message || err}`);
    }
  }
  return { total: files.length, ok, fail };
}

function rewriteAllMd() {
  const files = [
    ...walkMd(path.join(root, "news")),
    ...walkMd(path.join(root, "website")),
  ];
  let filesTouched = 0;
  let refs = 0;
  for (const full of files) {
    const raw = fs.readFileSync(full, "utf8");
    if (
      !raw.includes("/news/") &&
      !raw.includes("/sync/") &&
      !raw.includes("/img/legacy/")
    ) {
      continue;
    }
    const { text, count } = rewriteLocalImagePaths(raw);
    if (!count || text === raw) continue;
    refs += count;
    filesTouched++;
    const rel = path.relative(root, full);
    if (dryRun) {
      console.log(`[dry-run] rewrite ${rel} (+${count})`);
    } else {
      fs.writeFileSync(full, text, "utf8");
      console.log(`rewrite ${rel} (+${count})`);
    }
  }
  return { filesTouched, refs };
}

async function main() {
  loadDotEnv();
  requireCosConfig();

  console.log(
    `migrate-article-images-to-cos: dryRun=${dryRun} rewriteOnly=${rewriteOnly}`,
  );

  let uploadStats = { total: 0, ok: 0, fail: 0 };
  if (!rewriteOnly) {
    for (const dir of UPLOAD_ROOTS) {
      console.log(`\n== upload ${path.relative(root, dir)} ==`);
      const s = await uploadTree(dir);
      uploadStats.total += s.total;
      uploadStats.ok += s.ok;
      uploadStats.fail += s.fail;
      console.log(`  files=${s.total} ok=${s.ok} fail=${s.fail}`);
    }
  }

  console.log("\n== rewrite markdown ==");
  const rw = rewriteAllMd();
  console.log(`  files=${rw.filesTouched} refs=${rw.refs}`);

  console.log("\n== summary ==");
  console.log(
    `upload: ${uploadStats.ok}/${uploadStats.total} (fail ${uploadStats.fail})`,
  );
  console.log(`rewrite: ${rw.filesTouched} file(s), ${rw.refs} ref(s)`);

  if (uploadStats.fail) {
    console.error(
      "Some uploads failed — local paths for those files were still rewritten if present in md; re-run after fixing.",
    );
    process.exit(1);
  }
}

await main();
