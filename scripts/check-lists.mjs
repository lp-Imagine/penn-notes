#!/usr/bin/env node
/**
 * Validate website/data/collect.json + books.json.
 * Usage:
 *   node scripts/check-lists.mjs
 *   node scripts/check-lists.mjs --fetch   # HEAD/GET 探测外链（慢，需网络）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "website", "data");
const fetchLinks = process.argv.includes("--fetch");
const softFetch = process.argv.includes("--soft-fetch");

const BOOK_STATUS = new Set(["done", "reading", "plan"]);

function fail(msg) {
  console.error(`check-lists: ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`check-lists: warn ${msg}`);
}

function readJson(name) {
  const file = path.join(dataDir, name);
  if (!fs.existsSync(file)) {
    fail(`missing ${name}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    fail(`${name} JSON parse error: ${err.message}`);
    return null;
  }
}

function isHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function checkCollect(data) {
  if (!data || typeof data !== "object") return [];
  if (!Array.isArray(data.groups)) {
    fail("collect.json: groups must be an array");
    return [];
  }
  const urls = [];
  const seen = new Set();
  for (const [gi, g] of data.groups.entries()) {
    if (!g?.title) fail(`collect.json: groups[${gi}] missing title`);
    if (!Array.isArray(g.links)) {
      fail(`collect.json: groups[${gi}].links must be an array`);
      continue;
    }
    for (const [li, link] of g.links.entries()) {
      const loc = `groups[${gi}].links[${li}]`;
      if (!link?.title) fail(`collect.json: ${loc} missing title`);
      if (!link?.url || !isHttpUrl(link.url)) {
        fail(`collect.json: ${loc} bad url`);
      } else {
        urls.push({ kind: "collect", title: link.title, url: link.url });
        if (seen.has(link.url)) warn(`duplicate collect url ${link.url}`);
        seen.add(link.url);
      }
      if (!link?.domain) warn(`collect.json: ${loc} missing domain`);
    }
  }
  return urls;
}

function checkBooks(data) {
  if (!data || typeof data !== "object") return [];
  if (!Array.isArray(data.books)) {
    fail("books.json: books must be an array");
    return [];
  }
  const urls = [];
  const seen = new Set();
  for (const [i, b] of data.books.entries()) {
    const loc = `books[${i}]`;
    if (!b?.title) fail(`books.json: ${loc} missing title`);
    if (!b?.url || !isHttpUrl(b.url)) fail(`books.json: ${loc} bad url`);
    else {
      urls.push({ kind: "books", title: b.title, url: b.url });
      if (seen.has(b.url)) warn(`duplicate book url ${b.url}`);
      seen.add(b.url);
    }
    if (!b?.cover || !isHttpUrl(b.cover)) fail(`books.json: ${loc} bad cover`);
    if (!BOOK_STATUS.has(b?.status)) {
      fail(`books.json: ${loc} status must be done|reading|plan`);
    }
    const stars = Number(b?.stars);
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      fail(`books.json: ${loc} stars must be 1..5`);
    }
  }
  return urls;
}

async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent": "penn-notes-check-lists/1.0",
        accept: "*/*",
      },
    });
    // 部分站点拒 HEAD
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "user-agent": "penn-notes-check-lists/1.0",
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
    }
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: err?.name || String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const collect = readJson("collect.json");
  const books = readJson("books.json");
  const urls = [...checkCollect(collect), ...checkBooks(books)];

  if (process.exitCode) {
    console.error("check-lists: schema validation failed");
    process.exit(process.exitCode);
  }

  console.log(
    `check-lists: ok schema (collect ${urls.filter((u) => u.kind === "collect").length}, books ${urls.filter((u) => u.kind === "books").length})`,
  );

  if (!fetchLinks) return;

  let bad = 0;
  for (const item of urls) {
    const r = await probe(item.url);
    if (r.ok) {
      console.log(`  ✓ ${r.status} ${item.title}`);
      continue;
    }
    bad += 1;
    const detail = r.error ? r.error : `HTTP ${r.status}`;
    console.error(`  ✗ ${detail} ${item.title} → ${item.url}`);
  }

  if (bad > 0) {
    const msg = `check-lists: ${bad} link(s) failed`;
    if (softFetch) {
      warn(msg);
      return;
    }
    fail(msg);
    process.exit(1);
  }
  console.log("check-lists: all probed links ok");
}

main();
