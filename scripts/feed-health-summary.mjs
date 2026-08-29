#!/usr/bin/env node
/**
 * Print a concise source health summary from news/.state/feed-health.json
 * and news/.state/last-run.json. Failures are de-duplicated across both files
 * (they describe the same fetch). Exits 1 when unique failures exceed threshold.
 *
 * Usage:  node scripts/feed-health-summary.mjs [--warn-threshold N]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateDir = path.join(root, "news", ".state");

const warnThreshold = (() => {
  const idx = process.argv.indexOf("--warn-threshold");
  return idx >= 0 ? Number(process.argv[idx + 1]) || 3 : 3;
})();

function readJson(name) {
  const p = path.join(stateDir, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/** Prefer named failures; fall back to max count (same run, never sum). */
function uniqueFailureCount(health, lastRun) {
  const byKey = new Map();
  for (const f of [...(health?.failures || []), ...(lastRun?.rss?.failures || [])]) {
    const key = String(f.id || f.name || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, f);
  }
  if (byKey.size > 0) return byKey.size;
  return Math.max(health?.failed || 0, lastRun?.rss?.failed || 0);
}

function main() {
  const health = readJson("feed-health.json");
  const lastRun = readJson("last-run.json");

  if (!health && !lastRun) {
    console.log("feed-health: no state files found — skipping.");
    return;
  }

  console.log("══════════════════════════════════════");
  console.log("  📡 Feed Health Summary");
  console.log("══════════════════════════════════════");

  if (lastRun) {
    const { at, date, candidates, editorial, rss, sections } = lastRun;
    console.log(`  Last run  : ${at}`);
    console.log(`  Date      : ${date}`);
    console.log(`  Candidates: ${candidates}  →  Editorial: ${editorial}`);
    if (rss) {
      console.log(`  RSS       : ${rss.ok} ok, ${rss.failed} failed`);
    }
    if (sections) {
      const parts = Object.entries(sections)
        .map(([k, v]) => `${k}(${v})`)
        .join("  ");
      console.log(`  Sections  : ${parts}`);
    }
    if (rss?.failures?.length) {
      console.log("  RSS failures:");
      for (const f of rss.failures) {
        console.log(`    ⚠  ${f.name}: ${f.error}`);
      }
    }
  }

  if (health) {
    const { ok, failed, failures } = health;
    console.log("──────────────────────────────────────");
    console.log(`  Feed sources: ${ok} ok, ${failed} failed`);
    if (failures?.length) {
      for (const f of failures) {
        console.log(`    ✗  ${f.name || f.id}: ${f.error}`);
      }
    }

    const zeroSources = (health.successes || []).filter((s) => s.items === 0);
    if (zeroSources.length) {
      console.log(`  Sources with 0 items: ${zeroSources.length}`);
    }
  }

  console.log("══════════════════════════════════════");

  // feed-health.json and last-run.json describe the same fetch; never sum both.
  const totalFailed = uniqueFailureCount(health, lastRun);
  if (totalFailed > warnThreshold) {
    console.error(
      `\n⚠ ${totalFailed} feed failures exceed threshold (${warnThreshold}). Check sources!`,
    );
    process.exit(1);
  }
}

main();
