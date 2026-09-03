#!/usr/bin/env node
/**
 * Copy news/ → website/news/, build index + news sidebar fragment.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDigestMarkdown } from "./news/parse-digest.mjs";
import { writeNewsFeed } from "./build-news-feed.mjs";
import { pennBase } from "./penn-base.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcNewsRoot = path.join(root, "news");
const websiteRoot = path.join(root, "website");
const newsRoot = path.join(websiteRoot, "news");
const vitepressDir = path.join(websiteRoot, ".vitepress");
const BASE = pennBase();

const MONTH_DIR_RE = /^\d{4}-\d{2}$/;

function link(p) {
  return BASE + String(p).replace(/^\/+/, "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function listMonthDirs() {
  if (!fs.existsSync(srcNewsRoot)) return [];
  return fs
    .readdirSync(srcNewsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && MONTH_DIR_RE.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();
}

function extractFirstImage(content) {
  const m = content.match(/!\[[^\]]*\]\((https?:\/\/[^)]+|\/[^)]+)\)/);
  return m ? m[1] : "";
}

function parseTitleFromContent(content, fallback) {
  const m = content.match(/^title:\s*(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function copyMonthNews(month) {
  const srcDir = path.join(srcNewsRoot, month);
  const destDir = path.join(newsRoot, month);
  fs.mkdirSync(destDir, { recursive: true });

  const files = fs
    .readdirSync(srcDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  const meta = [];
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    const content = fs.readFileSync(src, "utf8");
    fs.writeFileSync(dest, content, "utf8");
    const date =
      (file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || file.replace(/\.md$/, "");
    const slug = file.replace(/\.md$/, "");
    meta.push({
      file,
      date,
      slug,
      image: extractFirstImage(content),
      title: parseTitleFromContent(content, `AI 动态 · ${date}`),
    });
  }
  meta.sort((a, b) => (a.date < b.date ? 1 : -1));
  return meta;
}

function buildSidebar(months, monthFiles) {
  return {
    "/news/": months.map((month, index) => ({
      text: month,
      // 仅展开最新月份，历史月份默认折叠
      collapsed: index !== 0,
      items: monthFiles[month].map((item) => ({
        text: item.date,
        link: `/news/${month}/${item.slug}`,
      })),
    })),
  };
}

function buildNewsIndex(months, monthFiles, itemCount = 0) {
  let digestCount = 0;
  for (const month of months) {
    digestCount += monthFiles[month]?.length || 0;
  }

  const metaBits = [];
  if (itemCount > 0) metaBits.push(`${itemCount} 条动态`);
  if (digestCount > 0) metaBits.push(`${digestCount} 期日报`);
  metaBits.push("约 7:00 自动更新");

  const lines = [
    "---",
    "title: AI 动态",
    "description: 业界、产品、模型、开源与开发者工具 — 按日整理的 AI 要闻",
    "outline: false",
    "sidebar: false",
    "aside: false",
    "prev: false",
    "next: false",
    "---",
    "",
    '<div class="section-page news-page">',
    '  <header class="section-hero news-hero">',
    '    <p class="section-kicker">每日精选</p>',
    '    <h1 class="section-title">AI 动态</h1>',
    '    <p class="section-lead">业界、产品、模型、开源与开发者工具 — 按日整理，点进日报可读全文</p>',
    `    <p class="section-count news-hero-meta">${escapeHtml(metaBits.join(" · "))}</p>`,
    "  </header>",
    "",
    '  <nav class="news-page-jump" aria-label="页内导航">',
    '    <a class="news-page-jump-link" href="#digests">日报归档</a>',
    '    <a class="news-page-jump-link" href="#feed">动态流</a>',
    "  </nav>",
    "",
    "  <NewsDigestArchive />",
    "",
    '  <section id="feed" class="news-block news-feed-block">',
    '    <div class="news-block-head">',
    '      <h2 class="news-block-title">动态流</h2>',
    '      <p class="news-block-desc">单条要闻筛选浏览，向下滚动自动加载</p>',
    "    </div>",
    "    <NewsArchive />",
    "  </section>",
  ];

  lines.push("</div>");
  lines.push("");
  return lines.join("\n");
}

function collectAllNewsItems(months) {
  const all = [];
  for (const month of months) {
    const dir = path.join(srcNewsRoot, month);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      if (file === "index.md") continue;
      const slug = file.replace(/\.md$/, "");
      const date = (file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const items = parseDigestMarkdown(content, {
        date,
        month,
        slug,
        link: `/news/${month}/${slug}`,
      });
      all.push(...items);
    }
  }
  all.sort((a, b) => {
    if (a.itemDate !== b.itemDate) return a.itemDate < b.itemDate ? 1 : -1;
    return 0;
  });
  return all;
}

function extractHeadlines(content, limit = 3) {
  const titles = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^###\s+(.+)/);
    if (!m) continue;
    titles.push(m[1].trim());
    if (titles.length >= limit) break;
  }
  return titles;
}

function countHeadlines(content) {
  return (content.match(/^###\s+/gm) || []).length;
}

export function collectRecentNews(limit = 8) {
  const months = listMonthDirs();
  const recent = [];
  for (const month of months) {
    const dir = path.join(srcNewsRoot, month);
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const date = (file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || "";
      const slug = file.replace(/\.md$/, "");
      const headlines = extractHeadlines(content, 3);
      recent.push({
        date,
        title: `AI 动态 · ${date}`,
        link: `/news/${month}/${slug}`,
        image: extractFirstImage(content),
        count: countHeadlines(content),
        headlines,
      });
      if (recent.length >= limit) return recent;
    }
  }
  return recent;
}

function main() {
  fs.mkdirSync(vitepressDir, { recursive: true });

  if (fs.existsSync(newsRoot)) {
    fs.rmSync(newsRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(newsRoot, { recursive: true });

  const months = listMonthDirs();
  const monthFiles = {};
  for (const month of months) {
    monthFiles[month] = copyMonthNews(month);
  }

  const sidebarNews = buildSidebar(months, monthFiles);
  fs.writeFileSync(
    path.join(vitepressDir, "sidebar.news.generated.mjs"),
    `// Auto-generated by scripts/sync-news.mjs — do not edit\nexport default ${JSON.stringify(sidebarNews, null, 2)}\n`,
    "utf8",
  );

  // cache recent for build-home
  const recent = collectRecentNews(8);
  fs.writeFileSync(
    path.join(vitepressDir, "news-recent.generated.json"),
    JSON.stringify(recent, null, 2) + "\n",
    "utf8",
  );

  const allItems = collectAllNewsItems(months);
  fs.writeFileSync(
    path.join(vitepressDir, "news-items.generated.json"),
    JSON.stringify(allItems, null, 2) + "\n",
    "utf8",
  );

  const digestItems = [];
  for (const month of months) {
    for (const item of monthFiles[month] || []) {
      digestItems.push({
        month,
        date: item.date,
        slug: item.slug,
        title: item.title,
        image: item.image || "",
      });
    }
  }
  digestItems.sort((a, b) => (a.date < b.date ? 1 : -1));
  fs.writeFileSync(
    path.join(vitepressDir, "news-digests.generated.json"),
    JSON.stringify({ items: digestItems }, null, 2) + "\n",
    "utf8",
  );

  fs.writeFileSync(
    path.join(newsRoot, "index.md"),
    buildNewsIndex(months, monthFiles, allItems.length),
    "utf8",
  );

  writeNewsFeed(allItems);

  const total = months.reduce((n, m) => n + monthFiles[m].length, 0);
  console.log(
    `sync-news: ${total} digest(s), ${allItems.length} item(s) from ${months.length} month folder(s)`,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) main();
