#!/usr/bin/env node
/**
 * Lightweight integration tests for build scripts.
 * Run with: node scripts/test-scripts.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8", timeout: 30000 });
}

// ── build-home ──
console.log("\nbuild-home:");

test("generates sidebar.generated.mjs", () => {
  run("node scripts/build-home.mjs");
  const f = path.join(root, "website/.vitepress/sidebar.generated.mjs");
  assert.ok(fs.existsSync(f), "sidebar.generated.mjs should exist");
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("export default"), "should export sidebar config");
});

test("generates homepage index.md", () => {
  const f = path.join(root, "website/index.md");
  assert.ok(fs.existsSync(f), "website/index.md should exist");
  const content = fs.readFileSync(f, "utf8");
  assert.ok(content.includes("home-wrap"), "should contain home-wrap class");
});

test("generates section index pages", () => {
  for (const section of ["web", "ui", "tech", "agent"]) {
    const f = path.join(root, `website/${section}/index.md`);
    assert.ok(fs.existsSync(f), `${section}/index.md should exist`);
    const content = fs.readFileSync(f, "utf8");
    assert.ok(content.includes("section-page"), `${section} should contain section-page class`);
  }
});

// ── build-discover ──
console.log("\nbuild-discover:");

test("generates notes-items.generated.json", () => {
  run("node scripts/build-discover.mjs");
  const f = path.join(root, "website/.vitepress/notes-items.generated.json");
  assert.ok(fs.existsSync(f), "notes-items.generated.json should exist");
  const items = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.ok(Array.isArray(items), "should be an array");
  assert.ok(items.length > 0, "should have at least 1 note");
  const first = items[0];
  assert.ok(first.title, "note should have a title");
  assert.ok(first.link, "note should have a link");
});

test("generates tags.generated.json", () => {
  const f = path.join(root, "website/.vitepress/tags.generated.json");
  assert.ok(fs.existsSync(f), "tags.generated.json should exist");
  const tags = JSON.parse(fs.readFileSync(f, "utf8"));
  assert.ok(Array.isArray(tags), "should be an array");
  assert.ok(tags.length > 0, "should have at least 1 tag");
  const first = tags[0];
  assert.ok(first.name || first.tag, "tag entry should have a name/tag");
  assert.ok(typeof first.count === "number", "tag entry should have a count");
});

test("no null tags in generated data", () => {
  const f = path.join(root, "website/.vitepress/tags.generated.json");
  const tags = JSON.parse(fs.readFileSync(f, "utf8"));
  const key = tags[0]?.name !== undefined ? "name" : "tag";
  const nullTag = tags.find((t) => !t[key] || t[key] === "null");
  assert.ok(!nullTag, "should not contain null or empty tags");
});

// ── build-news-feed ──
console.log("\nbuild-news-feed:");

test("generates news feed.xml", () => {
  run("node scripts/build-news-feed.mjs");
  const f = path.join(root, "website/public/news/feed.xml");
  assert.ok(fs.existsSync(f), "news/feed.xml should exist");
  const xml = fs.readFileSync(f, "utf8");
  assert.ok(xml.includes("<rss"), "should be valid RSS");
  assert.ok(xml.includes("<channel>"), "should have a channel");
});

test("news feed items have unique guids", () => {
  const f = path.join(root, "website/public/news/feed.xml");
  const xml = fs.readFileSync(f, "utf8");
  const guids = [...xml.matchAll(/<guid[^>]*>([^<]+)<\/guid>/g)].map((m) => m[1]);
  const unique = new Set(guids);
  assert.equal(guids.length, unique.size, `all ${guids.length} guids should be unique`);
});

// ── build-notes-feed ──
console.log("\nbuild-notes-feed:");

test("generates notes feed.xml", () => {
  run("node scripts/build-notes-feed.mjs");
  const f = path.join(root, "website/public/notes/feed.xml");
  assert.ok(fs.existsSync(f), "notes/feed.xml should exist");
  const xml = fs.readFileSync(f, "utf8");
  assert.ok(xml.includes("<rss"), "should be valid RSS");
  assert.ok(xml.includes("Penn Notes"), "should reference Penn Notes");
});

// ── ingest-sync ──
console.log("\ningest-sync:");

test("validates synced files without errors", () => {
  const output = run("node scripts/ingest-sync.mjs");
  assert.ok(output.includes("ingest-sync: ok"), "should pass validation");
});

// ── feed-health-summary ──
console.log("\nfeed-health-summary:");

test("prints summary without crashing", () => {
  const output = run("node scripts/feed-health-summary.mjs");
  assert.ok(
    output.includes("Feed Health Summary") || output.includes("no state files"),
    "should print summary or skip message",
  );
});

// ── slug / path sanity ──
console.log("\nslug sanity:");

test("sidebar items have valid links (no undefined/null)", () => {
  const f = path.join(root, "website/.vitepress/sidebar.generated.mjs");
  const content = fs.readFileSync(f, "utf8");
  assert.ok(!content.includes("undefined"), "should not contain 'undefined'");
  assert.ok(!content.includes(": null"), "should not contain null links");
});

// ── Summary ──
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
