#!/usr/bin/env node
/**
 * Generate /collect/ and /books/ from website/data/*.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pennBase } from "./penn-base.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const dataDir = path.join(siteRoot, "data");
const BASE = pennBase();

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

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function starsHtml(n) {
  const filled = Math.max(0, Math.min(5, Number(n) || 0));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

const STATUS_LABEL = {
  done: "已读",
  reading: "在读",
  plan: "计划中",
};

const BOOK_STATUS = new Set(["done", "reading", "plan"]);

function buildCollect(data) {
  const totalLinks = data.groups.reduce((n, g) => n + g.links.length, 0);
  const groupsHtml = data.groups
    .map((g) => {
      const cards = g.links
        .map(
          (item) =>
            `      <a class="collect-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><span class="collect-card-title">${escapeHtml(item.title)}</span><span class="collect-card-foot"><span class="collect-card-domain">${escapeHtml(item.domain)}</span><span class="collect-card-go" aria-hidden="true">↗</span></span></a>`,
        )
        .join("\n");
      return `  <section class="collect-group">
    <div class="collect-group-head">
      <h2 class="collect-group-title">${escapeHtml(g.title)}</h2>
      <span class="collect-group-count">${g.links.length} 篇</span>
    </div>
    <div class="collect-link-grid">
${cards}
    </div>
  </section>`;
    })
    .join("\n\n");

  return `---
title: ${data.title}
description: ${data.description}
outline: false
sidebar: false
aside: false
prev: false
next: false
---

<div class="section-page collect-page">
  <header class="section-hero">
    <p class="section-kicker">Reading List</p>
    <h1 class="section-title">${escapeHtml(data.title)}</h1>
    <p class="section-lead">${escapeHtml(data.lead)}</p>
    <p class="section-count">共 ${totalLinks} 篇外链 · ${data.groups.length} 个分类</p>
    <div class="collect-hero-actions">
      <a class="collect-hero-btn collect-hero-btn--primary" href="${link("/archive/")}">浏览本站文章</a>
      <a class="collect-hero-btn" href="${link("/about/")}">关于 &amp; 反馈</a>
    </div>
  </header>

  <div class="collect-index">

${groupsHtml}

  </div>
</div>
`;
}

function buildBooks(data) {
  const counts = { done: 0, reading: 0, plan: 0 };
  for (const b of data.books) {
    if (counts[b.status] != null) counts[b.status] += 1;
  }
  const cards = data.books
    .map((b) => {
      const status = BOOK_STATUS.has(b.status) ? b.status : "reading";
      const statusClass = status === "plan" ? " book-status--plan" : "";
      const label = STATUS_LABEL[status] || status;
      const stars = starsHtml(b.stars);
      const alt = escapeHtml(b.coverAlt || `${b.title}封面`);
      return `    <article class="book-card" data-status="${escapeHtml(status)}"><div class="book-card-head"><a class="book-container" href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer"><div class="book"><img src="${escapeHtml(b.cover)}" alt="${alt}" loading="lazy" /></div></a><div class="book-meta"><h2 class="book-title"><a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(b.title)}</a></h2><p class="book-author">${escapeHtml(b.author)}</p><p class="book-detail">出版：${escapeHtml(b.published)}</p><span class="book-status${statusClass}">${escapeHtml(label)}<span class="book-stars" aria-label="推荐指数 ${b.stars} 星">${stars}</span></span></div></div><p class="book-desc">${escapeHtml(b.desc)}</p></article>`;
    })
    .join("\n");

  return `---
title: ${data.title}
description: ${data.description}
outline: false
sidebar: false
aside: false
prev: false
next: false
---

<div class="section-page books-page">
  <header class="section-hero">
    <p class="section-kicker">Bookshelf</p>
    <h1 class="section-title">${escapeHtml(data.title)}</h1>
    <p class="section-lead">${escapeHtml(data.lead)}</p>
    <p class="section-count" data-books-count>共 ${data.books.length} 本 · ${counts.done} 本已读 · ${counts.reading} 本在读 · ${counts.plan} 本计划中</p>
    <div class="books-hero-actions">
      <a class="books-hero-btn books-hero-btn--primary" href="${link("/collect/")}">外链收藏</a>
      <a class="books-hero-btn" href="${link("/recent/")}">近况</a>
    </div>
  </header>
  <div class="books-filter" role="list" aria-label="按阅读状态筛选" data-total="${data.books.length}" data-done="${counts.done}" data-reading="${counts.reading}" data-plan="${counts.plan}">
    <button type="button" class="books-filter-chip is-active" data-status="" role="listitem">全部<span class="books-filter-count">${data.books.length}</span></button>
    <button type="button" class="books-filter-chip" data-status="done" role="listitem">已读<span class="books-filter-count">${counts.done}</span></button>
    <button type="button" class="books-filter-chip" data-status="reading" role="listitem">在读<span class="books-filter-count">${counts.reading}</span></button>
    <button type="button" class="books-filter-chip" data-status="plan" role="listitem">计划中<span class="books-filter-count">${counts.plan}</span></button>
  </div>
  <div class="books-grid">
${cards}
  </div>
  <p class="books-note">说明：书单从旧博客迁移并持续更新；想交流某本书欢迎 <a href="${link("/about/")}">留言</a>。</p>
</div>
`;
}

function main() {
  const collect = readJson("collect.json");
  const books = readJson("books.json");
  fs.mkdirSync(path.join(siteRoot, "collect"), { recursive: true });
  fs.mkdirSync(path.join(siteRoot, "books"), { recursive: true });
  fs.writeFileSync(
    path.join(siteRoot, "collect", "index.md"),
    buildCollect(collect),
    "utf8",
  );
  fs.writeFileSync(
    path.join(siteRoot, "books", "index.md"),
    buildBooks(books),
    "utf8",
  );
  const nLinks = collect.groups.reduce((n, g) => n + g.links.length, 0);
  console.log(
    `build-lists: collect ${nLinks} link(s), books ${books.books.length} book(s)`,
  );
}

main();
