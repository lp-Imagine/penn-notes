#!/usr/bin/env node
/**
 * 拉取友链 RSS/Atom，生成 website/.vitepress/friends-moments.generated.json
 *
 *   node scripts/sync-friends-feed.mjs
 *   node scripts/sync-friends-feed.mjs --soft   # 失败不阻断（CI / prebuild）
 *
 * 规则：无 feed 字段跳过；每站最多 PER_FEED 条；全站取最近 TOTAL 条。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "rss-parser";
import { assertNodeVersion, fetch } from "./news/http.mjs";

assertNodeVersion(18);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const friendsPath = path.join(root, "website/data/friends.json");
const outPath = path.join(root, "website/.vitepress/friends-moments.generated.json");

const PER_FEED = 2;
const TOTAL = 36;
const soft = process.argv.includes("--soft");

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const parser = new Parser({
  timeout: 18000,
  headers: {
    "User-Agent": BROWSER_UA,
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
  },
});

function loadFriends() {
  const raw = JSON.parse(fs.readFileSync(friendsPath, "utf8"));
  if (!Array.isArray(raw)) throw new Error("friends.json must be an array");
  return raw;
}

function loadExisting() {
  try {
    return JSON.parse(fs.readFileSync(outPath, "utf8"));
  } catch {
    return null;
  }
}

function writeOut(payload) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function fetchFeedText(url) {
  let lastErr;
  for (const softAccept of [false, true]) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: softAccept
            ? "*/*"
            : "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(18000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!/<(rss|feed|rdf:RDF)\b/i.test(text)) {
        throw new Error("not RSS/Atom");
      }
      return text;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("feed fetch failed");
}

function itemDate(item) {
  const raw =
    item.isoDate ||
    item.pubDate ||
    item.published ||
    item.updated ||
    item.date ||
    "";
  const t = Date.parse(raw);
  return Number.isNaN(t) ? 0 : t;
}

function cleanText(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function pullFriend(friend) {
  const feedUrl = String(friend.feed || "").trim();
  if (!feedUrl) return { items: [], skipped: "no-feed" };

  const text = await fetchFeedText(feedUrl);
  const feed = await parser.parseString(text);
  const entries = Array.isArray(feed.items) ? feed.items : [];

  const items = entries
    .map((entry) => {
      const title = cleanText(entry.title);
      const link = String(entry.link || entry.guid || "").trim();
      const ts = itemDate(entry);
      if (!title || !link || !ts) return null;
      return {
        title,
        link,
        date: new Date(ts).toISOString(),
        friendName: friend.name,
        friendLink: friend.link,
        friendAvatar: friend.avatar || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, PER_FEED);

  return { items, skipped: null };
}

async function main() {
  const friends = loadFriends();
  const withFeed = friends.filter((f) => String(f.feed || "").trim());
  const withoutFeed = friends.length - withFeed.length;

  /** @type {Awaited<ReturnType<typeof pullFriend>>["items"]} */
  const collected = [];
  const errors = [];

  // 限制并发，避免把友链站点打爆
  const concurrency = 4;
  let cursor = 0;

  async function worker() {
    while (cursor < withFeed.length) {
      const i = cursor++;
      const friend = withFeed[i];
      try {
        const { items } = await pullFriend(friend);
        collected.push(...items);
        console.log(
          `  ✓ ${friend.name}: ${items.length} item(s)`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ name: friend.name, feed: friend.feed, error: msg });
        console.warn(`  ✗ ${friend.name}: ${msg}`);
      }
    }
  }

  console.log(
    `sync-friends-feed: ${withFeed.length} feed(s), skip ${withoutFeed} without feed`,
  );
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const items = collected
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, TOTAL);

  const payload = {
    generatedAt: new Date().toISOString(),
    total: items.length,
    perFeed: PER_FEED,
    limit: TOTAL,
    feedCount: withFeed.length,
    okCount: withFeed.length - errors.length,
    errorCount: errors.length,
    errors,
    items,
  };

  if (!items.length && errors.length) {
    const prev = loadExisting();
    if (prev?.items?.length) {
      console.warn(
        `sync-friends-feed: 本次无可用条目，保留上次 ${prev.items.length} 条`,
      );
      writeOut({
        ...prev,
        generatedAt: new Date().toISOString(),
        stale: true,
        errors,
      });
      return;
    }
    if (soft) {
      console.warn("sync-friends-feed: --soft，写出空列表");
      writeOut({ ...payload, soft: true });
      return;
    }
    throw new Error("sync-friends-feed: no items and no previous cache");
  }

  writeOut(payload);
  console.log(
    `sync-friends-feed: ${items.length} moment(s) → ${path.relative(root, outPath)} (${errors.length} feed error(s))`,
  );
}

main().catch((err) => {
  console.error(err);
  if (soft) {
    const prev = loadExisting();
    if (prev?.items) {
      writeOut({
        ...prev,
        generatedAt: new Date().toISOString(),
        stale: true,
        soft: true,
      });
      console.warn("sync-friends-feed: --soft，保留上次结果");
      process.exit(0);
    }
    writeOut({
      generatedAt: new Date().toISOString(),
      total: 0,
      items: [],
      soft: true,
      errors: [{ error: String(err?.message || err) }],
    });
    process.exit(0);
  }
  process.exit(1);
});
