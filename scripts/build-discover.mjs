#!/usr/bin/env node
/**
 * Scan note Markdown → notes-items + tags index for /tags/ and /archive/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const outDir = path.join(siteRoot, ".vitepress");

const NOTE_SECTIONS = ["web", "ui", "engineering", "backend", "tech", "computer", "agent", "misc"];

/** Noise tags that should never appear in /tags/ (error tokens, bare fragments). */
const TAG_DENYLIST = new Set(["terminated", "code"]);

const SECTION_LABELS = {
  web: "JS & 框架",
  ui: "样式",
  engineering: "工程化",
  backend: "后端",
  tech: "工具备忘",
  computer: "浏览器",
  agent: "AI Agent",
  misc: "杂项",
};

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

function keepTag(t) {
  if (!t || t === "null" || t === "undefined") return false;
  if (TAG_DENYLIST.has(t.toLowerCase())) return false;
  return true;
}

function parseTags(yaml) {
  const tags = [];
  const block = yaml.match(/^tags:\s*\n((?:[ \t]+-\s+.+\n?)+)/m);
  if (block) {
    for (const line of block[1].split("\n")) {
      const m = line.match(/^\s+-\s+(.+)$/);
      if (!m) continue;
      const t = m[1].trim().replace(/^["']|["']$/g, "");
      if (keepTag(t)) tags.push(t);
    }
    return tags;
  }
  const inline = yaml.match(/^tags:\s*\[(.+)\]\s*$/m);
  if (inline) {
    for (const part of inline[1].split(",")) {
      const t = part.trim().replace(/^["']|["']$/g, "");
      if (keepTag(t)) tags.push(t);
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

function summaryFromBody(raw) {
  const body = raw.replace(/^---[\s\S]*?---\n*/, "");
  const blocks = body
    .split(/\n\s*\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith("#"))
    .filter((x) => !/^<p class="article-meta">/.test(x));
  for (const block of blocks) {
    const text = normalizeText(block);
    if (!text) continue;
    if (text.length < 18) continue;
    return text.slice(0, 160);
  }
  return "";
}

function parseFm(raw) {
  if (!raw.startsWith("---")) {
    return {
      title: "",
      date: "",
      draft: false,
      group: "",
      cover: "",
      summary: "",
      tags: [],
      series: "",
      seriesOrder: 0,
    };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) {
    return {
      title: "",
      date: "",
      draft: false,
      group: "",
      cover: "",
      summary: "",
      tags: [],
      series: "",
      seriesOrder: 0,
    };
  }
  const yaml = raw.slice(4, end);
  const get = (key) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) return "";
    return m[1].trim().replace(/^["']|["']$/g, "");
  };
  const orderRaw = get("seriesOrder");
  return {
    title: get("title"),
    date: get("date").slice(0, 10),
    draft: get("draft") === "true",
    group: get("group"),
    cover: get("cover"),
    summary: get("summary"),
    tags: parseTags(yaml),
    series: get("series"),
    seriesOrder: orderRaw ? Number.parseInt(orderRaw, 10) || 0 : 0,
  };
}

function collectNotes() {
  const items = [];
  for (const section of NOTE_SECTIONS) {
    const dir = path.join(siteRoot, section);
    const syncDir = path.join(siteRoot, "sync", section);
    for (const full of [...walk(dir), ...walk(syncDir)]) {
      const raw = fs.readFileSync(full, "utf8");
      const fm = parseFm(raw);
      if (fm.draft) continue;
      const rel = path.relative(siteRoot, full).replace(/\\/g, "/");
      items.push({
        title: fm.title || path.basename(full, ".md"),
        date: fm.date || "1970-01-01",
        link: "/" + rel.replace(/\.md$/, ""),
        section,
        sectionLabel: SECTION_LABELS[section] || section,
        group: fm.group || "",
        cover: fm.cover || "",
        summary: normalizeText(fm.summary) || summaryFromBody(raw),
        tags: fm.tags,
        series: fm.series || "",
        seriesOrder: fm.seriesOrder,
      });
    }
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return items;
}

function buildTagsIndex(notes) {
  const map = new Map();
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!map.has(tag)) map.set(tag, 0);
      map.set(tag, map.get(tag) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh"));
}

function main() {
  const notes = collectNotes();
  const tags = buildTagsIndex(notes);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "notes-items.generated.json"),
    JSON.stringify(notes, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "tags.generated.json"),
    JSON.stringify(tags, null, 2) + "\n",
    "utf8",
  );
  console.log(
    `build-discover: ${notes.length} note(s), ${tags.length} tag(s)`,
  );
}

main();
