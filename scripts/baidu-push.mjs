#!/usr/bin/env node
/**
 * 向百度搜索资源平台「普通收录」推送 URL。
 *
 * 用法：
 *   export BAIDU_PUSH_TOKEN=你的token
 *   npm run baidu:push
 *   npm run baidu:push -- --dry-run
 *   npm run baidu:push -- --mode=daily --limit=30
 *   npm run baidu:push -- --soft          # CI：失败不退出非 0
 *
 * 环境变量：
 *   BAIDU_PUSH_TOKEN  必填（站长平台 → 资源提交 → API 提交）
 *   BAIDU_SITE        可选，默认 https://penn-notes.draftly.cn
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = (process.env.BAIDU_SITE || "https://penn-notes.draftly.cn").replace(
  /\/$/,
  "",
);
const TOKEN = process.env.BAIDU_PUSH_TOKEN || "";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const soft = args.includes("--soft");
const modeArg = args.find((a) => a.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : "site";
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg
  ? Number(limitArg.split("=")[1])
  : mode === "daily"
    ? 30
    : 40;

function fail(msg, code = 1) {
  console.error(msg);
  if (soft) {
    console.warn("baidu-push: --soft，忽略错误继续");
    process.exit(0);
  }
  process.exit(code);
}

function siteUrl(p = "") {
  const clean = String(p).replace(/^\/+/, "");
  return clean ? `${SITE}/${clean}` : `${SITE}/`;
}

function unique(urls) {
  return [...new Set(urls.filter(Boolean))];
}

function loadRecentNoteLinks(max = 12) {
  const p = path.join(root, "website/.vitepress/notes-items.generated.json");
  try {
    const items = JSON.parse(fs.readFileSync(p, "utf8"));
    if (!Array.isArray(items)) return [];
    return items
      .slice(0, max)
      .map((it) => siteUrl(String(it.link || "").replace(/^\//, "")));
  } catch {
    return [];
  }
}

function loadRecentDigestLinks(max = 10) {
  const newsRoot = path.join(root, "news");
  if (!fs.existsSync(newsRoot)) return [];
  const months = fs
    .readdirSync(newsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}$/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse();

  const out = [];
  for (const month of months) {
    const dir = path.join(newsRoot, month);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    for (const file of files) {
      out.push(siteUrl(`news/${month}/${file.replace(/\.md$/, "")}`));
      if (out.length >= max) return out;
    }
  }
  return out;
}

function coreUrls() {
  return [
    siteUrl("/"),
    siteUrl("news/"),
    siteUrl("tags/"),
    siteUrl("archive/"),
    siteUrl("about/"),
    siteUrl("web/"),
    siteUrl("ui/"),
    siteUrl("tech/"),
    siteUrl("agent/"),
    siteUrl("computer/"),
    siteUrl("misc/"),
  ];
}

function collectUrls() {
  if (mode === "daily") {
    // 日报后：首页/栏目 + 最新日报优先，再补近期笔记
    return unique([
      ...coreUrls(),
      ...loadRecentDigestLinks(5),
      ...loadRecentNoteLinks(8),
    ]).slice(0, Math.max(1, limit));
  }
  // site：常规部署后推首页/栏目/最近内容
  return unique([
    ...coreUrls(),
    ...loadRecentDigestLinks(10),
    ...loadRecentNoteLinks(12),
  ]).slice(0, Math.max(1, limit));
}

async function push(urls) {
  const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(SITE)}&token=${encodeURIComponent(TOKEN)}`;
  const body = urls.join("\n");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}

async function main() {
  if (!TOKEN) {
    if (soft) {
      console.warn("baidu-push: 未配置 BAIDU_PUSH_TOKEN，跳过");
      return;
    }
    fail(
      "缺少 BAIDU_PUSH_TOKEN。\n" +
        "在百度站长平台 → 资源提交 → API 提交 复制 token，然后：\n" +
        "  export BAIDU_PUSH_TOKEN=xxxx\n" +
        "  npm run baidu:push",
    );
  }

  const urls = collectUrls();
  console.log(`baidu-push: mode=${mode}, ${urls.length} url(s) → ${SITE}`);
  for (const u of urls) console.log(`  ${u}`);

  if (dryRun) {
    console.log("baidu-push: dry-run，未实际推送");
    return;
  }

  const { ok, status, text, json } = await push(urls);
  if (json) {
    console.log("baidu-push: response", json);
    if (json.error) {
      fail(`baidu-push: failed (${json.error}) ${json.message || ""}`);
    }
    console.log(
      `baidu-push: success=${json.success ?? 0}, remain=${json.remain ?? "?"}`,
    );
    return;
  }

  if (!ok) {
    fail(`baidu-push: HTTP ${status}\n${text}`);
  }
  console.log(text);
}

main().catch((err) => {
  fail(`baidu-push: ${err?.stack || err}`);
});
