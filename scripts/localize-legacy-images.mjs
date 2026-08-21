#!/usr/bin/env node
/**
 * Download jsDelivr (and similar) article images into website/public/img/legacy/
 * and rewrite Markdown references to local /img/legacy/... paths.
 *
 * Usage: node scripts/localize-legacy-images.mjs
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetch as undiciFetch, Headers, Request, Response } from "undici";

if (typeof globalThis.fetch !== "function") {
  globalThis.fetch = undiciFetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

const fetch = globalThis.fetch.bind(globalThis);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const outDir = path.join(siteRoot, "public", "img", "legacy");
const CDN_RE = /https:\/\/cdn\.jsdelivr\.net\/[^\s)"']+/g;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

function extFromUrl(url, contentType) {
  const u = url.split("?")[0];
  const m = u.match(/\.(png|jpe?g|gif|webp|svg)$/i);
  if (m) return "." + m[1].toLowerCase().replace("jpeg", "jpg");
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  if (contentType?.includes("svg")) return ".svg";
  return ".jpg";
}

async function download(url) {
  const clean = url.split("#")[0].split("?")[0];
  const res = await fetch(clean, {
    headers: { "user-agent": UA, accept: "image/*,*/*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = extFromUrl(clean, res.headers.get("content-type") || "");
  const hash = crypto.createHash("sha1").update(clean).digest("hex").slice(0, 12);
  const base = path
    .basename(clean)
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/^\.+/, "");
  let finalName = `${hash}-${base || "img"}`;
  if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(finalName)) finalName += ext;
  const dest = path.join(outDir, finalName);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, buf);
  return `/img/legacy/${finalName}`;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const files = walk(siteRoot).filter(
    (f) => !f.includes(`${path.sep}.vitepress${path.sep}`),
  );
  const cache = new Map();
  let rewritten = 0;
  let downloaded = 0;

  for (const file of files) {
    let raw = fs.readFileSync(file, "utf8");
    const urls = [...new Set(raw.match(CDN_RE) || [])];
    if (!urls.length) continue;
    let next = raw;
    for (const url of urls) {
      let local = cache.get(url);
      if (!local) {
        try {
          local = await download(url);
          downloaded++;
          console.log("ok", url, "->", local);
        } catch (err) {
          console.warn("fail", url, String(err.message || err));
          continue;
        }
        cache.set(url, local);
      }
      next = next.split(url).join(local);
    }
    if (next !== raw) {
      fs.writeFileSync(file, next);
      rewritten++;
      console.log("rewrote", path.relative(root, file));
    }
  }
  console.log(
    `localize-legacy-images: ${downloaded} downloads, ${rewritten} files rewritten`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
