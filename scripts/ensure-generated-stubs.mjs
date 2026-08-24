#!/usr/bin/env node
/**
 * Write minimal stubs for generated VitePress imports if missing.
 * Full content is produced by sync:news / build:home / build:discover / feed scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vp = path.join(root, "website", ".vitepress");
const publicNews = path.join(root, "website", "public", "news");
const publicNotes = path.join(root, "website", "public", "notes");

function writeIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

fs.mkdirSync(vp, { recursive: true });
fs.mkdirSync(publicNews, { recursive: true });
fs.mkdirSync(publicNotes, { recursive: true });

const stubs = [
  [
    path.join(vp, "sidebar.generated.mjs"),
    "// Auto-generated stub — run npm run build:home\nexport default {}\n",
  ],
  [
    path.join(vp, "sidebar.news.generated.mjs"),
    "// Auto-generated stub — run npm run sync:news\nexport default []\n",
  ],
  [path.join(vp, "news-items.generated.json"), "[]\n"],
  [path.join(vp, "news-recent.generated.json"), "[]\n"],
  [path.join(vp, "notes-items.generated.json"), "[]\n"],
  [path.join(vp, "tags.generated.json"), "{}\n"],
  [
    path.join(publicNews, "feed.xml"),
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Penn Notes AI</title></channel></rss>\n',
  ],
  [
    path.join(publicNotes, "feed.xml"),
    '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Penn Notes</title></channel></rss>\n',
  ],
];

let n = 0;
for (const [file, content] of stubs) {
  if (writeIfMissing(file, content)) n += 1;
}

if (n > 0) {
  console.log(`ensure-generated-stubs: wrote ${n} missing stub(s)`);
}
