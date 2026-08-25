#!/usr/bin/env node
/**
 * 向百度搜索资源平台「普通收录」推送 URL。
 *
 * 用法：
 *   export BAIDU_PUSH_TOKEN=你的token
 *   npm run baidu:push
 *   npm run baidu:push -- --dry-run
 *   npm run baidu:push -- --limit=20
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
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 40;

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

function collectUrls() {
  const core = [
    siteUrl("/"),
    siteUrl("news/"),
    siteUrl("tags/"),
    siteUrl("archive/"),
    siteUrl("about/"),
    siteUrl("web/"),
    siteUrl("ui/"),
    siteUrl("tech/"),
    siteUrl("agent/"),
  ];
  return unique([
    ...core,
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
    console.error(
      "缺少 BAIDU_PUSH_TOKEN。\n" +
        "在百度站长平台 → 资源提交 → API 提交 复制 token，然后：\n" +
        "  export BAIDU_PUSH_TOKEN=xxxx\n" +
        "  npm run baidu:push",
    );
    process.exit(1);
  }

  const urls = collectUrls();
  console.log(`baidu-push: ${urls.length} url(s) → ${SITE}`);
  for (const u of urls) console.log(`  ${u}`);

  if (dryRun) {
    console.log("baidu-push: dry-run，未实际推送");
    return;
  }

  const { ok, status, text, json } = await push(urls);
  if (json) {
    console.log("baidu-push: response", json);
    if (json.error) {
      console.error(`baidu-push: failed (${json.error}) ${json.message || ""}`);
      process.exit(1);
    }
    console.log(
      `baidu-push: success=${json.success ?? 0}, remain=${json.remain ?? "?"}`,
    );
    return;
  }

  if (!ok) {
    console.error(`baidu-push: HTTP ${status}\n${text}`);
    process.exit(1);
  }
  console.log(text);
}

main().catch((err) => {
  console.error("baidu-push:", err);
  process.exit(1);
});
