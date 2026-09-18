#!/usr/bin/env node
/**
 * Scan website/scraps/*.md → scraps-items.generated.json + scraps/index.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pennBase } from "./penn-base.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const scrapsDir = path.join(siteRoot, "scraps");
const outJson = path.join(siteRoot, ".vitepress", "scraps-items.generated.json");
const BASE = pennBase();

function link(p) {
  return BASE + String(p).replace(/^\/+/, "");
}

function parseTags(yaml) {
  const tags = [];
  const block = yaml.match(/^tags:\s*\n((?:[ \t]+-\s+.+\n?)+)/m);
  if (block) {
    for (const line of block[1].split("\n")) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (!m) continue;
      const t = m[1].trim().replace(/^["']|["']$/g, "");
      if (t) tags.push(t);
    }
    return tags;
  }
  const inline = yaml.match(/^tags:\s*\[(.+)\]\s*$/m);
  if (inline) {
    for (const part of inline[1].split(",")) {
      const t = part.trim().replace(/^["']|["']$/g, "");
      if (t) tags.push(t);
    }
  }
  return tags;
}

function normalizeText(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFromBody(raw) {
  const body = raw.replace(/^---[\s\S]*?---\n*/, "");
  const blocks = body
    .split(/\n\s*\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith("#"));
  for (const block of blocks) {
    const text = normalizeText(block);
    if (!text) continue;
    return text.slice(0, 200);
  }
  return "";
}

function parseFm(raw) {
  if (!raw.startsWith("---")) {
    return { title: "", date: "", tags: [], draft: false };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { title: "", date: "", tags: [], draft: false };
  const yaml = raw.slice(4, end);
  const title = (yaml.match(/^title:\s*(.+)$/m)?.[1] || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  const date = (yaml.match(/^date:\s*(.+)$/m)?.[1] || "").trim().replace(/^["']|["']$/g, "");
  const draft = /^draft:\s*true\s*$/m.test(yaml);
  return { title, date, tags: parseTags(yaml), draft };
}

function scan() {
  if (!fs.existsSync(scrapsDir)) fs.mkdirSync(scrapsDir, { recursive: true });
  const files = fs
    .readdirSync(scrapsDir)
    .filter((n) => n.endsWith(".md") && n !== "index.md")
    .sort();
  const items = [];
  for (const name of files) {
    const full = path.join(scrapsDir, name);
    const raw = fs.readFileSync(full, "utf8");
    const fm = parseFm(raw);
    if (fm.draft) continue;
    const slug = name.replace(/\.md$/, "");
    const href = `/scraps/${slug}`;
    items.push({
      title: fm.title || slug,
      date: fm.date || "",
      tags: fm.tags,
      link: href,
      excerpt: excerptFromBody(raw),
    });
  }
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return items;
}

function buildIndex(items) {
  return `---
title: 短笔记
description: 独立于长文的碎片记录
outline: false
sidebar: false
aside: false
prev: false
next: false
---

<div class="section-page scraps-page">
  <header class="section-hero">
    <p class="section-kicker" data-i18n="pageHero.scrapsKicker">Scraps</p>
    <h1 class="section-title" data-i18n="pageHero.scrapsTitle">短笔记</h1>
    <p class="section-lead" data-i18n="pageHero.scrapsLead">独立于长文的碎片记录，随时记下想法</p>
    <p class="section-count" data-i18n="common.articleCount" data-i18n-args="${items.length}">${items.length} 篇</p>
    <div class="scraps-hero-actions">
      <a class="scraps-hero-btn scraps-hero-btn--primary" href="${link("/admin/")}" target="_blank" rel="noopener noreferrer" data-i18n="nav.writeNotes">写笔记</a>
      <a class="scraps-hero-btn" href="${link("/archive/")}" data-i18n="collect.browseNotes">浏览本站文章</a>
    </div>
  </header>

  <ScrapsBrowse />
</div>
`;
}

function main() {
  const items = scan();
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(items, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(scrapsDir, "index.md"), buildIndex(items), "utf8");
  console.log(`build-scraps: ${items.length} scrap(s)`);
}

main();
