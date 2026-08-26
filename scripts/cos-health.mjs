/**
 * Smoke-check a few CDN object URLs (news / sync / legacy).
 * Usage: node scripts/cos-health.mjs [path...]
 */
import {
  cosConfigured,
  cdnUrl,
  requireCosConfig,
  loadDotEnv,
} from "./cos-upload.mjs";

loadDotEnv();

const defaults = [
  "test.png",
  "news/2026-07",
  "sync",
  "img/legacy",
];

async function headOk(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const get = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    return { ok: get.ok, status: get.status };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function main() {
  if (!cosConfigured()) {
    requireCosConfig();
  }
  const args = process.argv.slice(2);
  const keys = args.length ? args : [cdnUrl("test.png")];

  // If args look like keys, expand; if full URL, use as-is
  const urls = keys.map((k) =>
    /^https?:\/\//i.test(k) ? k : cdnUrl(k.replace(/^\/+/, "")),
  );

  // Always probe test.png when using defaults path
  if (!args.length) {
    urls.length = 0;
    urls.push(cdnUrl("test.png"));
  }

  let failed = 0;
  for (const url of urls) {
    const r = await headOk(url);
    if (r.ok) {
      console.log(`ok  ${r.status}  ${url}`);
    } else {
      failed++;
      console.error(`FAIL ${r.status}  ${url}${r.error ? ` (${r.error})` : ""}`);
    }
  }

  // Hint for empty migrate targets
  if (!args.length) {
    console.log(
      `(tip: pass object keys e.g. news/2026-08/abc.jpg — defaults only check test.png)`,
    );
  }

  if (failed) process.exit(1);
}

await main();
