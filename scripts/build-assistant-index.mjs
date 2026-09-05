#!/usr/bin/env node
/**
 * Build lightweight retrieval index for the site assistant (chunked RAG).
 * Writes website/public/assistant/index.json (deployed with the site).
 *
 * Notes → title / summary / body chunks
 * News → one summary row each (no long-body split)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const outPath = path.join(siteRoot, "public", "assistant", "index.json");
const vpDir = path.join(siteRoot, ".vitepress");

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

const BODY_CHUNK_SIZE = 500;
const BODY_CHUNK_OVERLAP = 80;
const BODY_CHUNK_MAX = 8;

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
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFm(raw) {
  if (!raw.startsWith("---")) {
    return { title: "", date: "", draft: false, summary: "", tags: [] };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) {
    return { title: "", date: "", draft: false, summary: "", tags: [] };
  }
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
    summary: get("summary"),
    tags: parseTags(yaml),
  };
}

function bodyTextFull(raw) {
  const body = raw.replace(/^---[\s\S]*?---\n*/, "");
  return normalizeText(body);
}

/** Split plain text into overlapping chunks (by Unicode code points). */
function chunkText(text, size = BODY_CHUNK_SIZE, overlap = BODY_CHUNK_OVERLAP, max = BODY_CHUNK_MAX) {
  const chars = Array.from(String(text || ""));
  if (!chars.length) return [];
  if (chars.length <= size) return [chars.join("")];
  const out = [];
  let start = 0;
  while (start < chars.length && out.length < max) {
    const end = Math.min(chars.length, start + size);
    out.push(chars.slice(start, end).join(""));
    if (end >= chars.length) break;
    start = Math.max(0, end - overlap);
  }
  return out;
}

function baseMeta({ parentId, kind, title, link, section, sectionLabel, tags, date, summary }) {
  return {
    parentId,
    kind,
    title,
    link,
    section,
    sectionLabel,
    tags,
    date,
    summary: summary || "",
  };
}

function collectNotes() {
  const items = [];
  for (const section of NOTE_SECTIONS) {
    const dirs = [
      path.join(siteRoot, section),
      path.join(siteRoot, "sync", section),
    ];
    for (const dir of dirs) {
      for (const full of walk(dir)) {
        const raw = fs.readFileSync(full, "utf8");
        const fm = parseFm(raw);
        if (fm.draft) continue;
        const rel = path.relative(siteRoot, full).replace(/\\/g, "/");
        const link = "/" + rel.replace(/\.md$/, "");
        const title = fm.title || path.basename(full, ".md");
        const summary = normalizeText(fm.summary);
        const parentId = `note:${link}`;
        const meta = baseMeta({
          parentId,
          kind: "note",
          title,
          link,
          section,
          sectionLabel: SECTION_LABELS[section] || section,
          tags: fm.tags,
          date: fm.date || "",
          summary,
        });

        items.push({
          ...meta,
          id: `${parentId}#title`,
          chunkKind: "title",
          text: title,
        });

        if (summary) {
          items.push({
            ...meta,
            id: `${parentId}#summary`,
            chunkKind: "summary",
            text: summary,
          });
        }

        const body = bodyTextFull(raw);
        const parts = chunkText(body);
        parts.forEach((part, i) => {
          items.push({
            ...meta,
            id: `${parentId}#body-${i}`,
            chunkKind: "body",
            text: part,
          });
        });
      }
    }
  }
  return items;
}

function collectNews() {
  const p = path.join(vpDir, "news-items.generated.json");
  if (!fs.existsSync(p)) return [];
  try {
    const rows = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!Array.isArray(rows)) return [];
    return rows
      .slice(0, 120)
      .map((it, i) => {
        const rawLink = it.link || it.digestLink || "";
        const link = String(rawLink).startsWith("/")
          ? String(rawLink)
          : `/${String(rawLink).replace(/^\//, "")}`;
        if (!link || link === "/") return null;
        const summary = normalizeText(it.summary || "");
        const title = it.title || "AI 动态";
        const parentId = `news:${link}:${i}`;
        return {
          id: `${parentId}#summary`,
          parentId,
          kind: "news",
          chunkKind: "summary",
          title,
          link,
          section: "news",
          sectionLabel: it.section || "AI 动态",
          tags: it.sourceName ? [String(it.sourceName)] : [],
          date: it.itemDate || it.digestDate || it.date || "",
          summary,
          text: summary || title,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const notes = collectNotes();
  const news = collectNews();
  const items = [...notes, ...news];
  const noteParents = new Set(
    notes.filter((c) => c.chunkKind === "title").map((c) => c.parentId),
  );
  const payload = {
    generatedAt: new Date().toISOString(),
    site: "https://penn-notes.draftly.cn",
    version: 2,
    count: items.length,
    noteCount: noteParents.size,
    newsCount: news.length,
    items,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload) + "\n", "utf8");
  console.log(
    `build-assistant-index: ${noteParents.size} note(s) → ${notes.length} chunk(s), ${news.length} news → ${path.relative(root, outPath)}`,
  );
}

main();
