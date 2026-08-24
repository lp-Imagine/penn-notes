#!/usr/bin/env node
/**
 * Validate ai-article synced Markdown across both legacy website/sync/ and
 * current website/<section>/ paths (any file with `source: ai-article`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const websiteRoot = path.join(root, "website");
const syncRoot = path.join(websiteRoot, "sync");
const NOTE_SECTIONS = ["web", "ui", "tech", "computer", "agent", "misc"];
const SECTIONS = new Set(NOTE_SECTIONS);
const REQUIRED = ["title", "date", "section", "source", "sourceId"];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("_") || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith(".md") && name !== "index.md") acc.push(full);
  }
  return acc;
}

function parseFm(raw) {
  if (!raw.startsWith("---")) return null;
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return null;
  const yaml = raw.slice(4, end);
  const fm = {};
  for (const line of yaml.split("\n")) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return fm;
}

function main() {
  if (!fs.existsSync(syncRoot)) {
    fs.mkdirSync(syncRoot, { recursive: true });
  }

  const candidates = [];

  for (const full of walk(syncRoot)) {
    candidates.push(full);
  }

  for (const section of NOTE_SECTIONS) {
    for (const full of walk(path.join(websiteRoot, section))) {
      const raw = fs.readFileSync(full, "utf8");
      if (/^source:\s*ai-article\s*$/m.test(raw)) {
        candidates.push(full);
      }
    }
  }

  const errors = [];
  const seen = new Map();

  for (const full of candidates) {
    const rel = path.relative(root, full);
    const raw = fs.readFileSync(full, "utf8");
    const fm = parseFm(raw);
    if (!fm) {
      errors.push(`${rel}: missing frontmatter`);
      continue;
    }
    for (const key of REQUIRED) {
      if (!fm[key]) errors.push(`${rel}: missing \`${key}\``);
    }
    if (fm.section && !SECTIONS.has(fm.section)) {
      errors.push(`${rel}: invalid section \`${fm.section}\``);
    }
    if (fm.source && fm.source !== "ai-article") {
      errors.push(`${rel}: source must be \`ai-article\``);
    }
    if (fm.draft === "true") continue;
    if (fm.sourceId) {
      if (seen.has(fm.sourceId)) {
        errors.push(
          `${rel}: duplicate sourceId \`${fm.sourceId}\` (also ${seen.get(fm.sourceId)})`,
        );
      } else {
        seen.set(fm.sourceId, rel);
      }
    }
  }

  if (errors.length) {
    console.error("ingest-sync failed:\n" + errors.map((e) => "  - " + e).join("\n"));
    process.exit(1);
  }

  console.log(`ingest-sync: ok (${candidates.length} file(s))`);
}

main();
