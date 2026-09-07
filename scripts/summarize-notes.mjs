#!/usr/bin/env node
/**
 * 用 LLM 为笔记生成「文章速览」摘要，写入 website/data/note-summaries.json。
 * 按正文 hash 缓存：内容不变则跳过，页面运行时只读 JSON，不再调模型。
 *
 *   npm run summarize:notes
 *   npm run summarize:notes -- --limit=3
 *   npm run summarize:notes -- --force
 *   npm run summarize:notes -- --only-weak
 *   npm run summarize:notes -- --soft   # 无 Key / 单篇失败不阻断（prebuild/CI 默认）
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.join(root, "website");
const outFile = path.join(siteRoot, "data", "note-summaries.json");

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

const NOTE_SECTIONS = [
  "web",
  "ui",
  "engineering",
  "backend",
  "tech",
  "computer",
  "agent",
  "misc",
];

const LLM_BASE_URL = (
  process.env.LLM_BASE_URL || "https://api.deepseek.com/v1"
).replace(/\/$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";
const LLM_API_KEY = process.env.LLM_API_KEY || "";

function parseArgs(argv) {
  const out = {
    force: false,
    onlyWeak: false,
    limit: 0,
    dryRun: false,
    soft: false,
  };
  for (const a of argv) {
    if (a === "--force") out.force = true;
    else if (a === "--only-weak") out.onlyWeak = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--soft") out.soft = true;
    else if (a.startsWith("--limit=")) out.limit = Number(a.slice(8)) || 0;
  }
  // CI / prebuild：无 Key 时默认软跳过，不阻断构建
  if (process.env.CI === "true" || process.env.SUMMARIZE_NOTES_SOFT === "1") {
    out.soft = true;
  }
  return out;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith(".md") && name !== "index.md") acc.push(full);
  }
  return acc;
}

function parseFm(raw) {
  if (!raw.startsWith("---")) {
    return { title: "", summary: "", draft: false, yamlEnd: 0 };
  }
  const end = raw.indexOf("\n---", 3);
  if (end < 0) return { title: "", summary: "", draft: false, yamlEnd: 0 };
  const yaml = raw.slice(4, end);
  const get = (key) => {
    const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) return "";
    return m[1].trim().replace(/^["']|["']$/g, "");
  };
  return {
    title: get("title"),
    summary: get("summary"),
    draft: get("draft") === "true",
    summaryBar: get("summaryBar"),
    yamlEnd: end + 4,
  };
}

function stripMarkdown(body) {
  return String(body || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function contentHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** 套话 / 过短摘要，适合被 LLM 覆盖 */
function isWeakSummary(s) {
  const t = String(s || "").trim();
  if (t.length < 36) return true;
  if (/围绕[「"].+[」"].*干货/.test(t)) return true;
  if (/读完能带走可执行要点/.test(t)) return true;
  if (/一篇干货型稿/.test(t)) return true;
  return false;
}

function loadCache() {
  if (!fs.existsSync(outFile)) {
    return { version: 1, model: "", generatedAt: "", items: {} };
  }
  try {
    const data = JSON.parse(fs.readFileSync(outFile, "utf8"));
    if (!data.items || typeof data.items !== "object") data.items = {};
    return data;
  } catch {
    return { version: 1, model: "", generatedAt: "", items: {} };
  }
}

function collectNotes() {
  const items = [];
  for (const section of NOTE_SECTIONS) {
    for (const dir of [
      path.join(siteRoot, section),
      path.join(siteRoot, "sync", section),
    ]) {
      for (const full of walk(dir)) {
        const raw = fs.readFileSync(full, "utf8");
        const fm = parseFm(raw);
        if (fm.draft || fm.summaryBar === "false") continue;
        const body = raw.slice(fm.yamlEnd || 0);
        const plain = stripMarkdown(body).slice(0, 6000);
        if (plain.length < 80) continue;
        const rel = path.relative(siteRoot, full).replace(/\\/g, "/");
        const link = "/" + rel.replace(/\.md$/, "");
        items.push({
          link,
          title: fm.title || path.basename(full, ".md"),
          fmSummary: fm.summary,
          plain,
          hash: contentHash(plain),
        });
      }
    }
  }
  return items;
}

async function chat(system, user) {
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content || "").trim();
}

function cleanSummary(raw) {
  let s = String(raw || "")
    .replace(/^```[\s\S]*?```$/g, "")
    .replace(/^["「]|["」]$/g, "")
    .replace(/^摘要[:：]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("“") && s.endsWith("”"))
  ) {
    s = s.slice(1, -1).trim();
  }
  // 超长时按句号截断，避免整篇被判失败
  if (s.length > 160) {
    const cut = s.slice(0, 160);
    const idx = Math.max(
      cut.lastIndexOf("。"),
      cut.lastIndexOf("！"),
      cut.lastIndexOf("？"),
      cut.lastIndexOf(";"),
      cut.lastIndexOf("；"),
    );
    s = (idx >= 60 ? cut.slice(0, idx + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
  }
  return s;
}

async function summarizeOne(note) {
  const system = `你是 Penn Notes 的编辑助手。根据笔记正文写「文章速览」摘要。
硬性要求：
1. 只用中文，1 段，80～140 字。
2. 概括本文解决什么问题、关键结论或可带走的要点；不要清单体、不要标题。
3. 禁止编造正文未出现的 API/版本/数据。
4. 不要以「本文」「这篇文章」开头；不要套话（如「干货型稿」「读完能带走」）。
5. 只输出摘要正文，不要 markdown、不要引号包裹。`;

  const user = `标题：${note.title}\n\n正文：\n${note.plain}`;
  const out = cleanSummary(await chat(system, user));
  if (out.length < 40 || out.length > 200) {
    throw new Error(`bad length ${out.length}: ${out.slice(0, 60)}`);
  }
  if (isWeakSummary(out)) {
    throw new Error(`still weak: ${out.slice(0, 60)}`);
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cache = loadCache();
  const notes = collectNotes();
  let todo = [];

  for (const note of notes) {
    const prev = cache.items[note.link];
    if (!args.force && prev?.hash === note.hash && prev?.summary) {
      continue;
    }
    if (args.onlyWeak) {
      const existing = prev?.summary || note.fmSummary;
      if (existing && !isWeakSummary(existing) && prev?.hash === note.hash) {
        continue;
      }
    }
    todo.push(note);
  }

  if (args.limit > 0) todo = todo.slice(0, args.limit);

  console.log(
    `summarize-notes: ${notes.length} note(s), ${todo.length} to generate (model=${LLM_MODEL || "unset"})`,
  );

  if (args.dryRun) {
    for (const n of todo) console.log(`  would: ${n.link}`);
    return;
  }

  if (todo.length === 0) {
    console.log("summarize-notes: nothing to do (cache hit)");
    return;
  }

  if (!LLM_API_KEY) {
    const msg =
      "summarize-notes: 缺少 LLM_API_KEY，跳过生成（页面仍用已有 note-summaries.json）";
    if (args.soft) {
      console.warn(msg);
      return;
    }
    console.error(
      "summarize-notes: 缺少 LLM_API_KEY。在仓库根目录 .env 配置后重试，或加 --soft。",
    );
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  for (const note of todo) {
    process.stdout.write(`  → ${note.link} ... `);
    try {
      const summary = await summarizeOne(note);
      cache.items[note.link] = {
        summary,
        hash: note.hash,
        title: note.title,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      ok += 1;
      console.log(`ok (${summary.length}字)`);
      // 轻限速，避免打爆 API
      await sleep(400);
    } catch (err) {
      fail += 1;
      console.log(`FAIL ${err.message || err}`);
    }
  }

  cache.version = 1;
  cache.model = LLM_MODEL;
  cache.generatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(cache, null, 2) + "\n", "utf8");
  console.log(
    `summarize-notes: wrote ${outFile} (ok=${ok}, fail=${fail}, cached=${Object.keys(cache.items).length})`,
  );
  if (fail > 0 && ok === 0 && !args.soft) process.exit(1);
  if (fail > 0 && args.soft) {
    console.warn(`summarize-notes: ${fail} failed (soft, continue build)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
