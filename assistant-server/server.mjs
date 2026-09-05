#!/usr/bin/env node
/**
 * Penn Notes site assistant API (Baota / local).
 *
 * Env (也可写在仓库根目录 .env，已 gitignore)：
 *   LLM_API_KEY          required for chat
 *   LLM_BASE_URL         default https://api.deepseek.com/v1
 *   LLM_MODEL            default deepseek-chat
 *   ASSISTANT_PORT       default 8787
 *   ASSISTANT_INDEX_PATH path to index.json
 *   ASSISTANT_CORS_ORIGINS comma-separated origins (extra)
 *   ASSISTANT_RATE_MAX   requests per minute per IP (default 20)
 *   ASSISTANT_RATE_DAILY requests per day per IP (default 80, Asia/Shanghai)
 *   ASSISTANT_HOST       default 127.0.0.1
 *
 * 本地开发：npm run assistant:dev  （改代码自动重启）
 * 宝塔生产：npm run assistant:server + PM2/systemd
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDailyLimiter, createRateLimiter } from "./lib/rate-limit.mjs";
import {
  buildPageSummaryFromItems,
  buildReadingPath,
  buildSiteCatalog,
  docKey,
  findAllByPath,
  findByPath,
  formatSiteCatalogText,
  listNoteDocs,
  retrieve,
} from "./lib/retrieve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Load KEY=VALUE from .env without overriding existing process.env. */
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv(path.join(root, ".env"));

const PORT = Number(process.env.ASSISTANT_PORT || 8787);
const HOST = process.env.ASSISTANT_HOST || "127.0.0.1";
const LLM_BASE_URL = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(
  /\/$/,
  "",
);
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";
const LLM_API_KEY = process.env.LLM_API_KEY || "";
const RATE_MAX = Number(process.env.ASSISTANT_RATE_MAX || 20);
const RATE_DAILY = Number(process.env.ASSISTANT_RATE_DAILY || 80);

const DEFAULT_ORIGINS = [
  "https://penn-notes.draftly.cn",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
];

const EXTRA_ORIGINS = String(process.env.ASSISTANT_CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set([...DEFAULT_ORIGINS, ...EXTRA_ORIGINS]);

function resolveIndexPath() {
  if (process.env.ASSISTANT_INDEX_PATH) return process.env.ASSISTANT_INDEX_PATH;
  const candidates = [
    path.join(root, "website/public/assistant/index.json"),
    "/www/wwwroot/penn-notes/assistant/index.json",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

let indexCache = { mtimeMs: 0, data: { items: [] } };

function loadIndex() {
  const p = resolveIndexPath();
  try {
    const st = fs.statSync(p);
    if (st.mtimeMs === indexCache.mtimeMs && indexCache.data) return indexCache.data;
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    indexCache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch (err) {
    console.warn("assistant: index load failed:", err.message);
    return { items: [], error: err.message };
  }
}

const limiter = createRateLimiter({ windowMs: 60_000, max: RATE_MAX });
const dailyLimiter = createDailyLimiter({
  max: RATE_DAILY,
  timeZone: "Asia/Shanghai",
});

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function send(res, status, body, extraHeaders = {}) {
  const json = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(json);
}

function readBody(req, limit = 32_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function buildSystemPrompt({
  readingPath = false,
  siteOverview = false,
  compare = false,
  hasSelection = false,
} = {}) {
  if (readingPath) {
    return `你是「Penn Notes」站内导读助手。用户想要一条基于标签/栏目的阅读路径。

规则：
1. 只根据「候选文章」列表组织顺序，不要编造未列出的文章或外链。
2. 用简洁中文输出「建议阅读顺序」：编号列表；每项用书名号《标题》，后跟一句为什么先看 / 衔接什么。
3. 开头可用 1 句说明路径主题（对应匹配标签）。
4. 不要写「相关链接」小节；不要表格或代码围栏。
5. 若候选很少，如实说明，并建议换关键词或标签再问。`;
  }
  if (siteOverview) {
    return `你是「Penn Notes」站内导读助手。用户在问「本站有哪些内容 / 栏目」。

规则：
1. 必须依据「全站栏目清单」回答栏目与大致篇数；不要把「参考资料」里的几篇样例当成全站总数。
2. 先总述站点结构（技术笔记各栏目 + AI 动态），再各举 1～2 个例子（书名号）。
3. 不要说「只有 N 篇」除非 N 来自清单中的统计数字；可以说「约 X 篇」。
4. 简洁中文；不要写「相关链接」小节。`;
  }
  if (compare) {
    return `你是「Penn Notes」站内导读助手。用户想对比两篇站内文章。

规则：
1. 只根据「待对比文章」中给出的篇目对比，不要编造未给出的文章。
2. 结构：各用 1 句定位 → 2～4 条差异/互补点 → 什么时候先读哪篇。
3. 用书名号《标题》点名文章；不要写「相关链接」小节。`;
  }
  if (hasSelection) {
    return `你是「Penn Notes」站内导读助手。用户选中了当前页一段文字或代码，请解释。

规则：
1. 以「用户选中的原文/代码」为主，结合当前页与参考资料说明含义、语境或怎么用。
2. 若是代码：先说这段在做什么，再点 1～3 个关键语句；不要整段重抄。
3. 简洁中文；先直接解释选中内容，再补 1～2 点上下文。
4. 不要写「相关链接」小节；不要编造站外内容。`;
  }
  return `你是「Penn Notes」站内导读助手。站点是 Penn 的技术博客（前端 / 工程化 / 后端 / AI 动态）。

规则：
1. 只根据「参考资料」与「当前页面」回答；资料不足时明确说站内暂未写到，不要编造链接或细节。
2. 可参考对话上文理解追问，但仍以参考资料与当前页为准，不要沿用上文中未证实的细节。若用户问「本页/这页/当前页」，优先根据当前页摘要与同页参考条目作答，不要被更早话题带偏。
3. 用简洁中文，少套话。总结类问题：先 1～2 句总述，再列 2～4 条要点即可。AI 动态日更页可按条目列出当日要点。
4. 不要写发布日期、阅读时长、栏目归属等元信息，除非用户明确问。
5. 不要写「相关链接」小节（界面会单独展示来源）；正文里如需点名文章，用书名号《标题》即可。
6. 可用少量 Markdown：加粗用 **文字**，列表用 - 开头；不要用表格或代码围栏除非用户要代码。
7. 不要扮演通用 ChatGPT，不做与本站无关的展开。
8. 若用户问全站有哪些内容，不要根据少量参考资料臆测「全站只有几篇」。`;
}

function isReadingPathIntent(message) {
  return /阅读路径|学习路线|从哪读|入门顺序|想学|按标签|阅读顺序|给我一条.*路径/.test(
    message,
  );
}

function isSiteOverviewIntent(message) {
  return /本站有哪些|本站.*?(内容|栏目|文章)|站点有哪些|都有什么内容|有哪些栏目|全站|网站内容|都写了什么|收录了多少|本站收录/.test(
    message,
  );
}

function isCompareIntent(message) {
  return /对比|比较|有什么区别|差异|哪篇更好|对照/.test(message);
}

/** Page + retrieval context only (no current user question). */
function buildContextPrompt({
  page,
  hits,
  readingPath,
  matchedTags,
  siteOverview,
  catalogText,
  compare,
}) {
  if (readingPath) {
    const lines = [
      "【匹配标签】",
      (matchedTags || []).join("、") || "（未明确，按相关文推断）",
      "",
      "【候选文章（已按入门顺序排列）】",
    ];
    if (!hits.length) {
      lines.push("（暂无足够文章）");
    } else {
      hits.forEach((h, i) => {
        lines.push(
          `${i + 1}. ${h.title}（${h.sectionLabel || ""}） ${h.link}\n   ${h.summary || ""}`,
        );
      });
    }
    return lines.join("\n");
  }
  const lines = [];
  if (siteOverview && catalogText) {
    lines.push("【全站栏目清单】");
    lines.push(catalogText);
    lines.push("");
    lines.push("【部分样例文章】");
    if (!hits.length) {
      lines.push("（无）");
    } else {
      hits.forEach((h, i) => {
        lines.push(`${i + 1}. ${h.title}（${h.sectionLabel || ""}）`);
      });
    }
    return lines.join("\n");
  }
  if (page?.path || page?.title) {
    lines.push("【当前页面】");
    if (page.title) lines.push(`标题：${page.title}`);
    if (page.path) lines.push(`路径：${page.path}`);
    if (page.summary) lines.push(`摘要：${String(page.summary).slice(0, 1800)}`);
    lines.push("");
  }
  if (page?.selection) {
    lines.push(
      page.selectionIsCode ? "【用户选中的代码】" : "【用户选中的原文】",
    );
    lines.push(String(page.selection).slice(0, 800));
    lines.push("");
  }
  if (Array.isArray(page?.headings) && page.headings.length) {
    lines.push("【本页目录】");
    lines.push(page.headings.slice(0, 24).join("\n"));
    lines.push("");
  }
  if (page?.codeSample) {
    lines.push("【本页代码摘录】");
    lines.push(String(page.codeSample).slice(0, 1000));
    lines.push("");
  }
  lines.push(compare ? "【待对比文章】" : "【参考资料】");
  if (!hits.length) {
    lines.push("（未检索到高相关文章）");
  } else {
    hits.forEach((h, i) => {
      lines.push(
        `${i + 1}. ${h.title}（${h.sectionLabel || ""}） ${h.link}\n   ${h.summary || ""}`,
      );
    });
  }
  return lines.join("\n");
}

/** Normalize & trim client history: last 6 turns, content ≤800 chars. */
function normalizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : "";
    if (!role) continue;
    const content = String(item.content || "").trim().slice(0, 800);
    if (!content) continue;
    out.push({ role, content });
  }
  return out.slice(-6);
}

function buildLlmMessages({
  message,
  page,
  hits,
  history,
  aboutCurrentPage,
  readingPath,
  matchedTags,
  siteOverview,
  catalogText,
  compare,
  hasSelection,
}) {
  const hist =
    aboutCurrentPage || readingPath || siteOverview || compare || hasSelection
      ? []
      : history;
  let userContent = message;
  if (aboutCurrentPage) {
    userContent = `请只根据上面的【当前页面】与【参考资料】说明「当前打开的这一页」在讲什么，不要使用对话上文或其它页面的结论。\n\n用户问题：${message}`;
  } else if (readingPath) {
    userContent = `请根据上面的候选文章给出一条阅读路径。\n\n用户问题：${message}`;
  } else if (siteOverview) {
    userContent = `请根据【全站栏目清单】介绍本站有哪些内容，不要把样例篇数当成全站总数。\n\n用户问题：${message}`;
  } else if (compare) {
    userContent = `请对比上面【待对比文章】中的篇目。\n\n用户问题：${message}`;
  } else if (hasSelection) {
    userContent = page?.selectionIsCode
      ? `请解释【用户选中的代码】。\n\n用户问题：${message}`
      : `请解释【用户选中的原文】。\n\n用户问题：${message}`;
  } else if (/解释本页主要代码|本页代码|代码示例/.test(message)) {
    userContent = `请根据【本页代码摘录】与当前页说明代码在讲什么。\n\n用户问题：${message}`;
  } else if (/今日要点|今天要点|今日摘要/.test(message)) {
    userContent = `请根据【当前页面】与参考资料概括今日/本页动态要点。\n\n用户问题：${message}`;
  }
  return [
    {
      role: "system",
      content: buildSystemPrompt({
        readingPath,
        siteOverview,
        compare,
        hasSelection,
      }),
    },
    {
      role: "user",
      content: buildContextPrompt({
        page,
        hits,
        readingPath,
        matchedTags,
        siteOverview,
        catalogText,
        compare,
      }),
    },
    ...hist,
    { role: "user", content: userContent },
  ];
}

async function* streamChatWithLlm({
  message,
  page,
  hits,
  history = [],
  aboutCurrentPage = false,
  readingPath = false,
  matchedTags = [],
  siteOverview = false,
  catalogText = "",
  compare = false,
  hasSelection = false,
}) {
  if (!LLM_API_KEY) {
    const err = new Error("LLM_API_KEY not configured");
    err.code = "NO_KEY";
    throw err;
  }
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0.3,
      stream: true,
      messages: buildLlmMessages({
        message,
        page,
        hits,
        history,
        aboutCurrentPage,
        readingPath,
        matchedTags,
        siteOverview,
        catalogText,
        compare,
        hasSelection,
      }),
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`LLM HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.code = "LLM_HTTP";
    throw err;
  }
  if (!res.body) throw new Error("empty LLM stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore partial JSON
      }
    }
  }
}

async function* streamHeuristic({
  message,
  page,
  hits,
  readingPath,
  matchedTags,
  siteOverview,
  catalogText,
}) {
  const answer = heuristicAnswer({
    message,
    page,
    hits,
    readingPath,
    matchedTags,
    siteOverview,
    catalogText,
  });
  const chars = Array.from(answer);
  for (let i = 0; i < chars.length; i += 2) {
    yield chars.slice(i, i + 2).join("");
    await new Promise((r) => setTimeout(r, 12));
  }
}

function heuristicAnswer({
  message,
  page,
  hits,
  readingPath,
  matchedTags,
  siteOverview,
  catalogText,
}) {
  if (siteOverview && catalogText) {
    return `本站主要内容如下：\n${catalogText}`;
  }
  if (readingPath) {
    if (!hits?.length) {
      return "站内暂未匹配到足够文章来排阅读路径，可以换个标签或栏目关键词再试。";
    }
    const tagLine = matchedTags?.length
      ? `围绕「${matchedTags.slice(0, 3).join("、")}」，建议按此顺序阅读：\n`
      : "建议按此顺序阅读：\n";
    const lines = hits
      .slice(0, 8)
      .map((h, i) => `${i + 1}. 《${h.title}》${h.summary ? ` — ${h.summary.slice(0, 80)}` : ""}`);
    return tagLine + lines.join("\n");
  }
  if (/本页|这页|当前页|总结|摘要|讲了什么|讲啥|要点|内容/.test(message)) {
    if (hits?.length > 1) {
      const lines = hits
        .slice(0, 6)
        .map((h, i) => `${i + 1}. ${h.title}${h.summary ? ` — ${h.summary}` : ""}`);
      return `《${page?.title || "本页"}》主要条目：\n${lines.join("\n")}`;
    }
    if (page?.title) {
      return `《${page.title}》大致围绕：${page.summary || "（暂无摘要）"}`;
    }
  }
  return "当前未配置 LLM，先根据站内索引给出相关文章。";
}

function prepareChat(body) {
  const message = String(body.message || "").trim().slice(0, 500);
  if (!message) {
    const err = new Error("message required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const history = normalizeHistory(body.history);
  const page = body.page && typeof body.page === "object" ? body.page : {};
  const pagePath = String(page.path || "").slice(0, 200);
  const index = loadIndex();
  const pageItems = findAllByPath(index, pagePath);
  const current = pageItems[0] || findByPath(index, pagePath);

  const aboutCurrentPage = /本页|这页|当前页|这一页|本篇|这篇文章|这篇/.test(
    message,
  );
  const readingPath = isReadingPathIntent(message);
  const siteOverview = !readingPath && isSiteOverviewIntent(message);
  const selection = String(page.selection || "")
    .trim()
    .slice(0, 800);
  const hasSelection = Boolean(selection);
  const compare =
    !readingPath &&
    !siteOverview &&
    !hasSelection &&
    isCompareIntent(message);
  let matchedTags = [];
  let catalogText = "";

  // Weak boost: short follow-ups may need previous user turn — but NOT for
  // special intents.
  let retrieveQuery = message;
  if (
    !aboutCurrentPage &&
    !readingPath &&
    !siteOverview &&
    !compare &&
    !hasSelection &&
    message.length < 12
  ) {
    const prevUser = [...history].reverse().find((h) => h.role === "user");
    if (prevUser?.content) {
      retrieveQuery = `${message} ${prevUser.content}`.slice(0, 500);
    }
  }

  let hits = [];

  if (readingPath) {
    const pathResult = buildReadingPath(index, message, { limit: 8 });
    matchedTags = pathResult.matchedTags;
    hits = pathResult.docs.map((doc, i) => ({
      title: doc.title,
      link: doc.link,
      sectionLabel: doc.sectionLabel || doc.section || "",
      date: doc.date || "",
      summary: String(doc.summary || doc.text || "").slice(0, 280),
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      kind: doc.kind || "note",
      score: 100 - i,
    }));
  } else if (siteOverview) {
    const catalog = buildSiteCatalog(index);
    catalogText = formatSiteCatalogText(catalog);
    // Sample 1–2 titles per section for sources UI
    const docs = listNoteDocs(index);
    const bySec = new Map();
    for (const d of docs) {
      const label = d.sectionLabel || d.section || "其它";
      if (!bySec.has(label)) bySec.set(label, []);
      bySec.get(label).push(d);
    }
    hits = [];
    for (const [, list] of bySec) {
      list.sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")),
      );
      for (const doc of list.slice(0, 1)) {
        hits.push({
          title: doc.title,
          link: doc.link,
          sectionLabel: doc.sectionLabel || doc.section || "",
          date: doc.date || "",
          summary: String(doc.summary || doc.text || "").slice(0, 160),
          tags: Array.isArray(doc.tags) ? doc.tags : [],
          kind: "note",
          score: 90,
        });
      }
    }
    hits = hits.slice(0, 8);
  } else if (compare) {
    // Current page + best related note (prefer shared tags / same section).
    hits = retrieve(index, retrieveQuery, { limit: 10, pathBoost: pagePath });
    const mapped = [];
    const seen = new Set();
    const curTags = new Set(
      Array.isArray(current?.tags) ? current.tags.map(String) : [],
    );
    const curSec = String(current?.section || current?.sectionLabel || "");
    if (current) {
      const key = docKey(current);
      seen.add(key);
      mapped.push({
        title: current.title,
        link: current.link,
        sectionLabel: current.sectionLabel || current.section || "",
        date: current.date || "",
        summary: String(current.summary || current.text || "").slice(0, 400),
        tags: Array.isArray(current.tags) ? current.tags : [],
        kind: current.kind || "",
        score: 100,
      });
    }
    const ranked = hits
      .map((h) => {
        const tags = Array.isArray(h.tags) ? h.tags.map(String) : [];
        let bonus = Number(h.score) || 0;
        for (const t of tags) if (curTags.has(t)) bonus += 12;
        if (curSec && (h.section === curSec || h.sectionLabel === curSec)) {
          bonus += 8;
        }
        return { h, bonus };
      })
      .sort((a, b) => b.bonus - a.bonus);
    for (const { h, bonus } of ranked) {
      const key = docKey(h);
      if (!key || seen.has(key)) continue;
      if (pagePath && String(h.link || "").includes(pagePath)) continue;
      seen.add(key);
      mapped.push({
        title: h.title,
        link: h.link,
        sectionLabel: h.sectionLabel || h.section || "",
        date: h.date || "",
        summary: String(h.summary || h.text || "").slice(0, 400),
        tags: Array.isArray(h.tags) ? h.tags : [],
        kind: h.kind || "",
        score: bonus,
      });
      if (mapped.length >= 2) break;
    }
    hits = mapped.slice(0, 2);
  } else {
    hits = retrieve(index, retrieveQuery, { limit: 6, pathBoost: pagePath });

    // Inject unique docs for current path (note chunks or news digest items)
    if (pageItems.length > 0 && (aboutCurrentPage || hasSelection || hits.length < 3)) {
      const mapped = [];
      const seen = new Set();
      for (const it of pageItems) {
        const key = docKey(it);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const summaryChunk =
          pageItems.find(
            (c) =>
              docKey(c) === key &&
              (c.chunkKind === "summary" || c.chunkKind === "body"),
          ) || it;
        mapped.push({
          title: it.title,
          link: it.link,
          sectionLabel: it.sectionLabel || it.section || "",
          date: it.date || "",
          summary: String(
            summaryChunk.text || summaryChunk.summary || it.summary || "",
          ).slice(0, 280),
          tags: Array.isArray(it.tags) ? it.tags : [],
          kind: it.kind || "",
          score: 99,
        });
        if (mapped.length >= 10) break;
      }
      const hitKeys = new Set(hits.map((h) => docKey(h)));
      hits = [
        ...mapped,
        ...hits.filter((h) => !hitKeys.has(docKey(h))),
      ].slice(0, 10);
    } else if (current && !hits.some((h) => docKey(h) === docKey(current))) {
      hits = [
        {
          title: current.title,
          link: current.link,
          sectionLabel: current.sectionLabel || current.section || "",
          date: current.date || "",
          summary: String(current.summary || current.text || "").slice(0, 280),
          tags: Array.isArray(current.tags) ? current.tags : [],
          kind: current.kind || "",
          score: 99,
        },
        ...hits,
      ].slice(0, 6);
    }
  }

  const pageSummary =
    page.summary ||
    buildPageSummaryFromItems(pageItems) ||
    current?.summary ||
    current?.text ||
    "";

  const wantCode =
    Boolean(page.selectionIsCode) || /代码|code/i.test(message);
  const pageCtx = {
    path: pagePath,
    title: String(page.title || current?.title || "").slice(0, 200),
    summary: String(pageSummary).slice(0, 1800),
    ...(selection ? { selection, selectionIsCode: Boolean(page.selectionIsCode) } : {}),
    ...(Array.isArray(page.headings) && page.headings.length
      ? { headings: page.headings.slice(0, 24).map(String) }
      : {}),
    ...(wantCode && page.codeSample
      ? { codeSample: String(page.codeSample).slice(0, 1200) }
      : {}),
  };

  const sources = hits.map(({ title, link, sectionLabel, summary }) => ({
    title,
    link,
    sectionLabel,
    summary: String(summary || "").slice(0, 120),
  }));

  return {
    message,
    pageCtx,
    hits,
    sources,
    history,
    aboutCurrentPage,
    readingPath,
    matchedTags,
    siteOverview,
    catalogText,
    compare,
    hasSelection,
  };
}

function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function handleChatStream(res, body, cors) {
  const {
    message,
    pageCtx,
    hits,
    sources,
    history,
    aboutCurrentPage,
    readingPath,
    matchedTags,
    siteOverview,
    catalogText,
    compare,
    hasSelection,
  } = prepareChat(body);
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...cors,
  });

  const mode = LLM_API_KEY ? "llm" : "heuristic";
  sseWrite(res, "meta", {
    mode,
    sources,
    readingPath: Boolean(readingPath),
    siteOverview: Boolean(siteOverview),
    compare: Boolean(compare),
  });

  try {
    const stream = LLM_API_KEY
      ? streamChatWithLlm({
          message,
          page: pageCtx,
          hits,
          history,
          aboutCurrentPage,
          readingPath,
          matchedTags,
          siteOverview,
          catalogText,
          compare,
          hasSelection,
        })
      : streamHeuristic({
          message,
          page: pageCtx,
          hits,
          readingPath,
          matchedTags,
          siteOverview,
          catalogText,
        });
    for await (const delta of stream) {
      if (delta) sseWrite(res, "delta", { text: delta });
    }
    sseWrite(res, "done", {});
  } catch (err) {
    console.error("assistant stream error:", err.message || err);
    sseWrite(res, "error", { message: String(err.message || err) });
  }
  res.end();
}

async function handleChat(body) {
  const {
    message,
    pageCtx,
    hits,
    sources,
    history,
    aboutCurrentPage,
    readingPath,
    matchedTags,
    siteOverview,
    catalogText,
    compare,
    hasSelection,
  } = prepareChat(body);
  if (!LLM_API_KEY) {
    return {
      answer: heuristicAnswer({
        message,
        page: pageCtx,
        hits,
        readingPath,
        matchedTags,
        siteOverview,
        catalogText,
      }),
      mode: "heuristic",
      sources,
    };
  }
  let full = "";
  for await (const delta of streamChatWithLlm({
    message,
    page: pageCtx,
    hits,
    history,
    aboutCurrentPage,
    readingPath,
    matchedTags,
    siteOverview,
    catalogText,
    compare,
    hasSelection,
  })) {
    full += delta;
  }
  const answer = full.trim();
  if (!answer) throw new Error("empty LLM response");
  return { answer, mode: "llm", sources };
}

const server = http.createServer(async (req, res) => {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  const cors = corsHeaders(origin);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/assistant/health") {
    const index = loadIndex();
    send(
      res,
      200,
      {
        ok: true,
        items: Array.isArray(index.items) ? index.items.length : 0,
        llm: Boolean(LLM_API_KEY),
        generatedAt: index.generatedAt || null,
      },
      cors,
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/assistant/chat") {
    const ip = clientIp(req);
    const minuteGate = limiter.check(ip);
    if (!minuteGate.ok) {
      send(
        res,
        429,
        {
          error: "rate_limited",
          scope: "minute",
          retryAfterSec: minuteGate.retryAfterSec,
          message: "提问太频繁，请稍后再试",
        },
        { ...cors, "Retry-After": String(minuteGate.retryAfterSec) },
      );
      return;
    }
    const dayGate = dailyLimiter.check(ip);
    if (!dayGate.ok) {
      send(
        res,
        429,
        {
          error: "rate_limited",
          scope: "daily",
          retryAfterSec: dayGate.retryAfterSec,
          message: "今日提问次数已用完，明天再来吧",
        },
        { ...cors, "Retry-After": String(dayGate.retryAfterSec) },
      );
      return;
    }

    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const wantStream =
        body.stream !== false &&
        String(req.headers.accept || "").includes("text/event-stream");
      if (wantStream || body.stream === true) {
        await handleChatStream(res, body, cors);
        return;
      }
      const result = await handleChat(body);
      send(res, 200, result, cors);
    } catch (err) {
      const status =
        err.code === "BAD_REQUEST" ? 400 : err.message?.includes("payload") ? 413 : 500;
      console.error("assistant chat error:", err.message || err);
      if (!res.headersSent) {
        send(res, status, { error: "chat_failed", message: String(err.message || err) }, cors);
      } else {
        try {
          sseWrite(res, "error", { message: String(err.message || err) });
          res.end();
        } catch {
          // ignore
        }
      }
    }
    return;
  }

  send(res, 404, { error: "not_found" }, cors);
});

server.listen(PORT, HOST, () => {
  console.log(
    `assistant-server listening on http://${HOST}:${PORT} (index: ${resolveIndexPath()}; rate ${RATE_MAX}/min, ${RATE_DAILY}/day per IP)`,
  );
});
