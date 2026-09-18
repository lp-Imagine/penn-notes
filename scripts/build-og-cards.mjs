#!/usr/bin/env node
/**
 * Generate OG share SVG cards from notes-items.generated.json
 * → website/public/og/cards/<sha1-16>.svg + default.svg
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const itemsFile = path.join(root, "website", ".vitepress", "notes-items.generated.json");
const ogDir = path.join(root, "website", "public", "og");
const cardsDir = path.join(ogDir, "cards");

/** @param {string} link e.g. /web/javascript/foo */
export function ogHashForLink(link) {
  const normalized = String(link || "")
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/\/+$/, "");
  const withSlash = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return crypto.createHash("sha1").update(withSlash).digest("hex").slice(0, 16);
}

/** @param {string} relativePath e.g. web/javascript/foo.md */
export function ogHashForRelativePath(relativePath) {
  let p = String(relativePath || "").replace(/\\/g, "/").replace(/\.md$/, "");
  if (p.endsWith("/index")) p = p.slice(0, -"/index".length);
  return ogHashForLink("/" + p.replace(/^\/+/, ""));
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(title, maxChars = 22, maxLines = 3) {
  const text = String(title || "Penn Notes").trim() || "Penn Notes";
  const lines = [];
  let rest = text;
  while (rest.length && lines.length < maxLines) {
    if (rest.length <= maxChars) {
      lines.push(rest);
      break;
    }
    let cut = maxChars;
    const slice = rest.slice(0, maxChars + 4);
    const space = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("，"), slice.lastIndexOf("。"));
    if (space > maxChars * 0.45) cut = space + 1;
    lines.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest.length && lines.length === maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.slice(0, Math.max(1, maxChars - 1)) + "…";
  }
  return lines;
}

function svgCard(title, brand = "Penn Notes") {
  const lines = wrapTitle(title);
  const titleTs = lines
    .map((line, i) => {
      const y = 280 + i * 64;
      return `  <text x="80" y="${y}" fill="#f4f7fb" font-size="52" font-family="Georgia, 'Noto Serif SC', 'Songti SC', serif" font-weight="700">${escapeXml(line)}</text>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a2332"/>
      <stop offset="100%" stop-color="#2c3e55"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="160" fill="#3d5a80" opacity="0.35"/>
  <circle cx="80" cy="560" r="120" fill="#5c7cfa" opacity="0.18"/>
  <text x="80" y="120" fill="#9db4ce" font-size="28" font-family="system-ui, -apple-system, sans-serif" font-weight="600" letter-spacing="0.04em">${escapeXml(brand)}</text>
${titleTs}
  <rect x="80" y="520" width="72" height="4" rx="2" fill="#7eb6ff"/>
</svg>
`;
}

function main() {
  fs.mkdirSync(cardsDir, { recursive: true });
  const defaultSvg = svgCard("技术笔记与每日发现", "Penn Notes");
  fs.writeFileSync(path.join(ogDir, "default.svg"), defaultSvg, "utf8");

  let items = [];
  if (fs.existsSync(itemsFile)) {
    try {
      items = JSON.parse(fs.readFileSync(itemsFile, "utf8"));
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];

  let n = 0;
  for (const it of items) {
    const link = it.link || "";
    if (!link) continue;
    const hash = ogHashForLink(link);
    const title = it.title || link;
    fs.writeFileSync(path.join(cardsDir, `${hash}.svg`), svgCard(title), "utf8");
    n += 1;
  }
  console.log(`build-og: ${n} card(s) + default.svg`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) main();
