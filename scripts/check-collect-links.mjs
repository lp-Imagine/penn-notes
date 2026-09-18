#!/usr/bin/env node
/**
 * Soft-check collect.json URLs → website/data/collect-status.json
 * Usage:
 *   node scripts/check-collect-links.mjs
 *   node scripts/check-collect-links.mjs --soft   # never fail CI
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "website", "data");
const soft = process.argv.includes("--soft");
const outFile = path.join(dataDir, "collect-status.json");

function readCollect() {
  const file = path.join(dataDir, "collect.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
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
        "user-agent": "penn-notes-check-collect/1.0",
        accept: "*/*",
      },
    });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "user-agent": "penn-notes-check-collect/1.0",
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
    }
    const code = res.status;
    const ok = code >= 200 && code < 400;
    return {
      status: ok ? "ok" : "dead",
      checkedAt: new Date().toISOString(),
      code,
    };
  } catch {
    return {
      status: "unknown",
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const collect = readCollect();
  const urls = [];
  for (const g of collect.groups || []) {
    for (const link of g.links || []) {
      if (link?.url) urls.push(link.url);
    }
  }
  const unique = [...new Set(urls)];
  const map = {};
  let dead = 0;
  let unknown = 0;
  for (const url of unique) {
    const r = await probe(url);
    map[url] = r;
    if (r.status === "dead") dead += 1;
    else if (r.status === "unknown") unknown += 1;
    const mark = r.status === "ok" ? "✓" : r.status === "dead" ? "✗" : "?";
    console.log(`  ${mark} ${r.code ?? "-"} ${url}`);
  }
  fs.writeFileSync(outFile, JSON.stringify(map, null, 2) + "\n", "utf8");
  console.log(
    `check-collect: wrote ${unique.length} url(s) → collect-status.json (dead ${dead}, unknown ${unknown})`,
  );
  if ((dead > 0 || unknown > 0) && !soft) {
    console.error("check-collect: some links failed (use --soft to ignore)");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  if (!soft) process.exit(1);
});
