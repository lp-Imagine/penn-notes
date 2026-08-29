#!/usr/bin/env node
/**
 * Scan website Markdown → regenerate sidebar + homepage + section indexes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pennBase } from "./penn-base.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const BASE = pennBase();

const SECTIONS = [
  {
    id: "web",
    title: "JS & 框架",
    nav: "JS & 框架",
    desc: "JavaScript 基础、Vue / React、UI 组件实践",
    link: "/web/",
  },
  {
    id: "ui",
    title: "样式",
    nav: "样式",
    desc: "HTML、CSS、布局与动效",
    link: "/ui/",
  },
  {
    id: "engineering",
    title: "工程化",
    nav: "工程化",
    desc: "Git、npm、配置与开发工具链",
    link: "/engineering/",
  },
  {
    id: "backend",
    title: "后端",
    nav: "后端",
    desc: "Node.js、数据库与服务端实践",
    link: "/backend/",
  },
  {
    id: "tech",
    title: "工具备忘",
    nav: "工具",
    desc: "常用文档、GitHub 技巧与资源收藏",
    link: "/tech/",
  },
  {
    id: "computer",
    title: "浏览器",
    nav: "浏览器",
    desc: "浏览器渲染与 Chrome 扩展",
    link: "/computer/",
  },
  {
    id: "agent",
    title: "AI Agent",
    nav: "AI Agent",
    desc: "Agent 实战、工作流、提示词与工具链",
    link: "/agent/",
  },
  {
    id: "misc",
    title: "杂项",
    nav: "杂项",
    desc: "职场、生活、方法论与其它不成体系的随笔",
    link: "/misc/",
  },
];

/** Sidebar group display order + labels (folder name → 文案) */
const GROUP_META = {
  javascript: { label: "JavaScript", order: 10 },
  vue: { label: "Vue", order: 20 },
  react: { label: "React", order: 30 },
  "ui-lib": { label: "UI 组件", order: 40 },
  html: { label: "HTML", order: 10 },
  css: { label: "CSS", order: 20 },
  docs: { label: "常用文档", order: 10 },
  github: { label: "GitHub", order: 20 },
  nodejs: { label: "Node.js", order: 30 },
  mysql: { label: "MySQL", order: 20 },
  git: { label: "Git", order: 10 },
  npm: { label: "npm", order: 20 },
  toolchain: { label: "工具链", order: 30 },
  bookmarks: { label: "资源收藏", order: 40 },
  more: { label: "其它", order: 50 },
  browser: { label: "浏览器", order: 10 },
  practice: { label: "实战", order: 10 },
  workflow: { label: "工作流", order: 20 },
  prompts: { label: "提示词", order: 30 },
  tools: { label: "工具链", order: 40 },
  essays: { label: "随笔", order: 10 },
  career: { label: "职场", order: 20 },
  life: { label: "生活", order: 30 },
  method: { label: "方法论", order: 40 },
  framework: { label: "框架", order: 25 },
  misc: { label: "其它", order: 99 },
};

function link(p) {
  return BASE + String(p).replace(/^\/+/, "");
}

/**
 * 公共资源路径（website/public 下）。
 * 必须写成 /sync/... 这种「不含 base」的根路径：Vite 构建时会按 base 改写；
 * 若写成 /penn-notes/sync/...，Rollup 会当成模块解析并失败。
 */
function publicAssetSrc(p) {
  if (!p) return "";
  if (/^https?:\/\//.test(p)) return p;
  let s = String(p).trim();
  // 兼容误带 base 前缀的历史值
  s = s.replace(/^\/penn-notes(?=\/)/, "");
  if (!s.startsWith("/")) s = `/${s}`;
  return s;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith(".md") && name !== "index.md") acc.push(full);
  }
  return acc;
}

function parseFm(raw) {
  if (!raw.startsWith("---")) return { title: "", date: "", draft: false, group: "", cover: "" };
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { title: "", date: "", draft: false, group: "", cover: "" };
  const yaml = raw.slice(4, end);
  const get = (key) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) return "";
    return m[1].trim().replace(/^["']|["']$/g, "");
  };
  return {
    title: get("title"),
    date: get("date").slice(0, 10),
    draft: get("draft") === "true",
    sourceId: get("sourceId"),
    group: get("group"),
    cover: get("cover"),
  };
}

function collectSection(sectionId) {
  const dir = path.join(siteRoot, sectionId);
  const syncDir = path.join(siteRoot, "sync", sectionId);
  const files = [...walk(dir), ...walk(syncDir)];
  const items = [];
  for (const full of files) {
    const raw = fs.readFileSync(full, "utf8");
    const fm = parseFm(raw);
    if (fm.draft) continue;
    const rel = path.relative(siteRoot, full).replace(/\\/g, "/");
    const urlPath = "/" + rel.replace(/\.md$/, "");
    items.push({
      title: fm.title || path.basename(full, ".md"),
      date: fm.date || "1970-01-01",
      link: urlPath,
      rel,
      group: fm.group || "",
      cover: fm.cover || "",
      section: sectionId,
    });
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return items;
}

const GROUP_LABELS = {
  javascript: "JavaScript",
  "ui-lib": "UI 组件库",
  vue: "Vue",
  react: "React",
  html: "HTML",
  css: "CSS",
  docs: "技术文档",
  github: "GitHub",
  nodejs: "Node.js",
  bookmarks: "收藏夹",
  more: "更多",
  browser: "浏览器",
  essays: "随笔",
  framework: "框架扩展",
  web: "前端",
  ui: "页面",
  tech: "工具",
  engineering: "工程化",
  backend: "后端",
  computer: "计算机",
  agent: "AI Agent",
  git: "Git",
  npm: "npm",
  toolchain: "工具链",
  mysql: "MySQL",
  practice: "实战",
  workflow: "工作流",
  prompts: "提示词",
  tools: "工具链",
  misc: "杂项",
  career: "职场",
  life: "生活",
  method: "方法论",
};

function labelGroup(key) {
  if (GROUP_LABELS[key]) return GROUP_LABELS[key];
  if (key === "来自 Draftly") return "Draftly 同步";
  return key;
}

function groupSidebar(items, sectionId) {
  const groups = new Map();
  for (const item of items) {
    const parts = item.rel.split("/");
    let groupKey = "misc";
    if (parts[0] === "sync") {
      // sync/<section>/<group>/<file>.md 或 sync/<section>/<file>.md
      if (parts.length >= 4) groupKey = parts[2];
      else if (item.group) groupKey = item.group;
      else groupKey = "misc";
    } else if (parts.length >= 3) {
      groupKey = parts[1];
    } else if (parts.length === 2) {
      groupKey = sectionId;
    }

    const meta = GROUP_META[groupKey] || {
      label: GROUP_LABELS[groupKey] || groupKey,
      order: 80,
    };
    const label = meta.label;
    if (!groups.has(label)) {
      groups.set(label, { order: meta.order, items: [] });
    }
    groups.get(label).items.push({ text: item.title, link: item.link });
  }

  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0], "zh"))
    .map(([text, group]) => ({
      text,
      collapsed: true,
      items: group.items,
    }));
}

function writeSectionIndex(section, items) {
  const groups = groupSidebar(items, section.id);
  const n = items.length;

  const groupBlocks =
    groups.length === 0
      ? `<p class="home-empty">暂无文章</p>`
      : groups
          .map((g) => {
            const cards = g.items
              .map((item) => {
                const meta = items.find((x) => x.link === item.link);
                const date = meta?.date || "";
                const cover = meta?.cover || "";
                // 注意：VitePress md 里 <a> 不能包 <div>，且标签间不能空行，否则会报 missing end tag
                const media = cover
                  ? `<span class="section-card-media"><img class="section-card-thumb" src="${escapeHtml(publicAssetSrc(cover))}" alt="" loading="lazy" /></span>`
                  : "";
                const cardClass = cover
                  ? "section-card section-card--media"
                  : "section-card section-card--text";
                const toneAttr = cover
                  ? ""
                  : ` data-tone="${escapeHtml(g.text)}"`;
                return `    <a class="${cardClass}"${toneAttr} href="${link(item.link)}">${media}<span class="section-card-body"><span class="section-card-title">${escapeHtml(item.text)}</span><span class="section-card-meta"><time datetime="${date}">${date}</time><span>阅读全文</span></span></span></a>`;
              })
              .join("\n");
            return `  <section class="section-group">
    <div class="section-group-head">
      <h2 class="section-group-title">${escapeHtml(g.text)}</h2>
      <p class="section-group-desc">${g.items.length} 篇文章</p>
    </div>
    <div class="section-card-grid">
${cards}
    </div>
  </section>`;
          })
          .join("\n");

  const content = `---
title: ${section.title}
description: ${section.desc}
outline: false
sidebar: false
aside: false
---

<div class="section-page">
  <header class="section-hero">
    <p class="section-kicker">栏目</p>
    <h1 class="section-title">${section.title}</h1>
    <p class="section-lead">${section.desc}</p>
    <p class="section-count">共 ${n} 篇文章</p>
  </header>

  <div class="section-index">
${groupBlocks}
  </div>
</div>
`;

  fs.mkdirSync(path.join(siteRoot, section.id), { recursive: true });
  fs.writeFileSync(path.join(siteRoot, section.id, "index.md"), content, "utf8");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHome(allBySection) {
  const recent = Object.values(allBySection)
    .flat()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  const total = Object.values(allBySection).reduce((n, a) => n + a.length, 0);

  // 栏目入口：紧凑网格，放在 hero 后便于跳转
  const pillars = SECTIONS.map((s, i) => {
    const items = allBySection[s.id] || [];
    const n = items.length;
    const groups = groupSidebar(items, s.id)
      .slice(0, 3)
      .map((g) => g.text)
      .join("、");
    const desc =
      groups && groups !== s.title && groups !== s.nav ? groups : s.desc;
    const idx = String(i + 1).padStart(2, "0");
    return `  <a class="home-pillar home-pillar--${escapeHtml(s.id)}" href="${link(s.link)}"><span class="home-pillar-index" aria-hidden="true">${idx}</span><span class="home-pillar-main"><span class="home-pillar-title">${escapeHtml(s.title)}</span><span class="home-pillar-desc">${escapeHtml(desc)}</span></span><span class="home-pillar-foot"><span class="home-pillar-meta">${n} 篇</span><span class="home-pillar-go" aria-hidden="true">→</span></span></a>`;
  }).join("\n");

  const noteItems =
    recent.length === 0
      ? `<p class="home-empty">暂无文章</p>`
      : `<div class="home-note-list">
${recent
  .map((r) => {
    const thumb = r.cover
      ? `<img class="home-note-thumb" src="${escapeHtml(publicAssetSrc(r.cover))}" alt="" loading="lazy" />`
      : `<span class="home-note-thumb home-note-thumb--empty" aria-hidden="true"></span>`;
    return `  <a class="home-note" href="${link(r.link)}">${thumb}<span class="home-note-body"><time datetime="${r.date}">${r.date}</time><span class="home-note-title">${escapeHtml(r.title)}</span></span></a>`;
  })
  .join("\n")}
</div>`;

  const newsHeadlines = loadRecentNewsHeadlines(6);
  const aiNewsItems =
    newsHeadlines.length === 0
      ? `<p class="home-empty news-home-empty">AI 动态每天 7:00 左右更新 · <a href="${link("/news/")}">前往栏目</a></p>`
      : `<div class="section-card-grid home-news-grid">
${newsHeadlines
  .map((r) => {
    const media = r.image
      ? `<span class="section-card-media"><img class="section-card-thumb" src="${escapeHtml(publicAssetSrc(r.image))}" alt="" loading="lazy" /></span>`
      : "";
    const tags = [
      r.section
        ? `<span class="news-section-tag">${escapeHtml(r.section)}</span>`
        : "",
      r.sourceName
        ? `<span class="news-source-tag">${escapeHtml(r.sourceName)}</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const tagsRow = tags
      ? `<span class="news-item-tags">${tags}</span>`
      : "";
    const summary = r.summary
      ? `<span class="news-item-summary">${escapeHtml(r.summary)}</span>`
      : "";
    const tone = escapeHtml(r.section || "动态");
    const cardClass = r.image
      ? "section-card section-card--media"
      : "section-card section-card--text";
    const toneAttr = r.image ? "" : ` data-tone="${tone}"`;
    return `  <a class="${cardClass}"${toneAttr} href="${link(r.link)}">${media}<span class="section-card-body">${tagsRow}<span class="section-card-title">${escapeHtml(r.title)}</span>${summary}<span class="section-card-meta"><time datetime="${r.date}">${r.date}</time><span>阅读全文</span></span></span></a>`;
  })
  .join("\n")}
</div>`;

  const latestHref = recent[0] ? link(recent[0].link) : link("/web/");
  const notesMoreHref = link("/archive/");

  return `---
layout: home
---

<div class="home-wrap">
  <section class="home-hero">
    <h1 class="home-headline">Penn Notes</h1>
    <HomeTypewriter text="认真生活，随便折腾" />
    <p class="home-sub">积跬步以至千里 · 共 ${total} 篇文章</p>
    <div class="home-actions">
      <a class="home-btn home-btn--primary" href="${latestHref}">阅读最新文章</a>
      <a class="home-btn home-btn--text" href="${link("/news/")}">今日 AI 动态</a>
    </div>
  </section>

  <section class="home-section home-section--pillars" aria-label="浏览栏目">
    <div class="home-pillars">
${pillars}
    </div>
  </section>

  <section class="home-section">
    <div class="home-section-head">
      <h2>最新文章</h2>
      <a class="home-more" href="${notesMoreHref}">查看更多</a>
    </div>
${noteItems}</section>

  <section class="home-section">
    <div class="home-section-head">
      <h2>最新动态</h2>
      <a class="home-more" href="${link("/news/")}">全部动态</a>
    </div>
${aiNewsItems}</section>
</div>
`;
}

function loadRecentAiNews() {
  const p = path.join(siteRoot, ".vitepress", "news-recent.generated.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return [];
  }
}

/** 首页动态：用条目真实标题，比「AI 动态 · 日期」更可读 */
function loadRecentNewsHeadlines(limit = 6) {
  const p = path.join(siteRoot, ".vitepress", "news-items.generated.json");
  try {
    const items = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!Array.isArray(items) || !items.length) return loadRecentAiNews();
    return items.slice(0, limit).map((it) => ({
      title: it.title || "AI 动态",
      date: it.itemDate || it.digestDate || "",
      link: it.digestLink || "/news/",
      section: it.section || "",
      sourceName: it.sourceName || "",
      image: it.image || "",
      summary: it.summary || "",
    }));
  } catch {
    return loadRecentAiNews();
  }
}

function main() {
  const allBySection = {};
  const sidebar = {};

  for (const section of SECTIONS) {
    const items = collectSection(section.id);
    allBySection[section.id] = items;
    writeSectionIndex(section, items);
    const groups = groupSidebar(items, section.id);
    sidebar[`/${section.id}/`] = groups;
    // 旧 sync 路径文章也能挂上同栏目侧栏
    sidebar[`/sync/${section.id}/`] = groups;
  }

  // Draftly 稿：扫描 website/*/ 下带 source: ai-article 的已由 collectSection 覆盖；
  // 另扫 sync/ 兼容旧路径（collectSection 已含 sync/<section>）

  fs.writeFileSync(
    path.join(siteRoot, ".vitepress", "sidebar.generated.mjs"),
    `// Auto-generated by scripts/build-home.mjs — do not edit\nexport default ${JSON.stringify(sidebar, null, 2)}\n`,
    "utf8",
  );

  fs.writeFileSync(
    path.join(siteRoot, "index.md"),
    buildHome(allBySection),
    "utf8",
  );

  const total = Object.values(allBySection).reduce((n, a) => n + a.length, 0);
  console.log(`build-home: ${total} articles, sidebar keys: ${Object.keys(sidebar).join(", ")}`);
}

main();
