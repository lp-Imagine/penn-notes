#!/usr/bin/env node
/**
 * Generate sitemap.xml from built VitePress HTML files (GitHub Pages).
 * Run after `vitepress build website`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "website", ".vitepress", "dist");
const SITE_URL = "https://penn-notes.draftly.cn";

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** loc：先 encodeURI，再把路径里残留的 & 编成 %26，最后做 XML 转义 */
function locFor(pathRel) {
  const encoded = encodeURI(pathRel).replace(/&/g, "%26");
  return escapeXml(`${SITE_URL}${encoded}`);
}

function main() {
  if (!fs.existsSync(dist)) {
    console.warn("build-sitemap: dist missing, skip");
    return;
  }

  const urls = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!name.endsWith(".html") || name === "404.html") continue;
      const rel = path
        .relative(dist, p)
        .replace(/\.html$/, "")
        .replace(/\/index$/, "");
      urls.push(rel === "index" ? "/" : `/${rel}`);
    }
  };
  walk(dist);
  urls.sort();

  const items = urls
    .map((p) => {
      const filePath = path.join(dist, p === "/" ? "index.html" : `${p}.html`);
      let lastmod = "";
      try {
        lastmod = new Date(fs.statSync(filePath).mtime).toISOString().slice(0, 10);
      } catch {
        // ignore
      }
      return (
        "  <url>\n" +
        `    <loc>${locFor(p)}</loc>` +
        (lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "") +
        "\n  </url>"
      );
    })
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n` +
    `</urlset>\n`;
  fs.writeFileSync(path.join(dist, "sitemap.xml"), xml);
  console.log(`build-sitemap: ${urls.length} urls -> sitemap.xml`);
}

main();
