#!/usr/bin/env node
/**
 * Build RSS 2.0 feed for notes → website/public/notes/feed.xml
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://lp-imagine.github.io/penn-notes";
const OUT = path.join(root, "website/public/notes/feed.xml");
const ITEMS_JSON = path.join(root, "website/.vitepress/notes-items.generated.json");

function siteUrl(p = "") {
  const clean = String(p).replace(/^\/+/, "");
  return clean ? `${SITE}/${clean}` : `${SITE}/`;
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(dateStr) {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return new Date().toUTCString();
  return new Date(Date.UTC(y, m - 1, d, 16, 0, 0)).toUTCString();
}

export function buildNotesFeedXml(items, opts = {}) {
  const limit = opts.limit ?? 80;
  const slice = items.slice(0, limit);
  const lastBuild = new Date().toUTCString();

  const channelItems = slice
    .map((item) => {
      const link = siteUrl(item.link || "");
      const desc = [
        item.sectionLabel ? `栏目：${item.sectionLabel}` : "",
        item.summary || "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc822(item.date)}</pubDate>
      <description>${escapeXml(desc)}</description>
      <category>${escapeXml(item.sectionLabel || item.section || "")}</category>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="../news/feed.xsl"?>
<rss version="2.0">
  <channel>
    <title>Penn Notes · 笔记更新</title>
    <link>${siteUrl()}</link>
    <description>Penn Notes 笔记更新订阅（JavaScript、CSS、工具与 AI Agent）</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <generator>Penn Notes notes feed</generator>
${channelItems}
  </channel>
</rss>
`;
}

export function writeNotesFeed(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = item.link || item.title;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const xml = buildNotesFeedXml(unique);
  fs.writeFileSync(OUT, xml, "utf8");
  return OUT;
}

function main() {
  let items = [];
  if (fs.existsSync(ITEMS_JSON)) {
    items = JSON.parse(fs.readFileSync(ITEMS_JSON, "utf8"));
  }
  const out = writeNotesFeed(items);
  console.log(`build-notes-feed: ${items.length} item(s) → ${path.relative(root, out)}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) main();
