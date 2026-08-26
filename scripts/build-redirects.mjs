#!/usr/bin/env node
/**
 * Emit static HTML redirect pages for old VuePress permalinks (GitHub Pages).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pennRedirectPrefix } from "./penn-base.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = path.join(root, "scripts", "redirects.generated.json");
const dist = path.join(root, "website", ".vitepress", "dist");
const BASE = pennRedirectPrefix();

function main() {
  if (!fs.existsSync(mapPath)) {
    console.log("build-redirects: no redirects map, skip");
    return;
  }
  if (!fs.existsSync(dist)) {
    console.warn("build-redirects: dist missing, skip");
    return;
  }

  const redirects = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  let n = 0;
  let skipped = 0;
  for (const { from, to } of redirects) {
    const fromPath = String(from || "").replace(/\/$/, "");
    const toPath = String(to || "").replace(/\/$/, "") || "/";
    if (!fromPath || fromPath === "/") {
      skipped++;
      continue;
    }

    const outRel = fromPath.replace(/^\//, "");
    const toRel = toPath.replace(/^\//, "");
    // /about → /about/ would write dist/about/index.html and self-loop
    if (outRel === toRel) {
      console.warn(`build-redirects: skip self-overwrite ${from} → ${to}`);
      skipped++;
      continue;
    }

    const destFile = path.join(dist, outRel, "index.html");
    if (fs.existsSync(destFile)) {
      const existing = fs.readFileSync(destFile, "utf8");
      // VitePress already built a real page here — never clobber
      if (!existing.includes("<title>Redirecting")) {
        console.warn(
          `build-redirects: skip clobber existing page ${from} → ${to}`,
        );
        skipped++;
        continue;
      }
    }

    const target = `${BASE}${to.startsWith("/") ? to : `/${to}`}`.replace(
      /\/+/g,
      "/",
    );
    const href = target;
    const dir = path.join(dist, outRel);
    fs.mkdirSync(dir, { recursive: true });
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${href}" />
  <link rel="canonical" href="${href}" />
  <title>Redirecting…</title>
  <script>location.replace(${JSON.stringify(href)})</script>
</head>
<body>
  <p>Redirecting to <a href="${href}">${href}</a>…</p>
</body>
</html>
`;
    fs.writeFileSync(destFile, html, "utf8");
    n++;
  }
  console.log(
    `build-redirects: wrote ${n} redirect page(s)${skipped ? `, skipped ${skipped}` : ""}`,
  );
}

main();
