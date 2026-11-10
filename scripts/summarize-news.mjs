/**
 * Editorial Chinese briefing for Penn Notes.
 * Categories cover mainstream AI/tech news + site specialties.
 */
import { NEWS_SECTIONS, normalizeSection } from "./news/sections.mjs";
import { fetch } from "./news/http.mjs";

const LLM_BASE_URL = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(
  /\/$/,
  "",
);
const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";
const LLM_API_KEY = process.env.LLM_API_KEY || "";

/** 每栏最多条数（与 prompt 硬性规则一致） */
export const MAX_PER_SECTION = 5;
/** 全文最多条数 */
export const MAX_TOTAL = 20;

/**
 * @param {Array<{title:string,url:string,sourceName:string,section:string,date:string,snippet:string,excerpt?:string}>} items
 * @param {string} reportDate
 * @param {{ allowHeuristic?: boolean }} [opts]
 * @returns {Promise<{ bySection: Record<string, Array<object>>, briefing: string[] }>}
 */
export async function summarizeNews(items, reportDate, opts = {}) {
  const empty = {
    bySection: Object.fromEntries(NEWS_SECTIONS.map((s) => [s, []])),
    briefing: [],
  };
  if (!items.length) return empty;

  if (!LLM_API_KEY) {
    if (!opts.allowHeuristic) {
      throw new Error(
        "LLM_API_KEY is required. Set the secret or pass --allow-heuristic (low quality).",
      );
    }
    console.warn("[summarize] LLM_API_KEY missing — heuristic fallback (low quality)");
    return heuristicSummarize(items, reportDate);
  }

  const capped = items.slice(0, 80);
  // 候选多时自动压缩 excerpt，避免 prompt 超长；总量控制在 ~120K 字符内。
  const excerptBudget = Math.max(300, Math.floor(120000 / capped.length) - 900);
  const payload = capped.map((it, i) => ({
    id: i,
    title: it.title,
    source: it.sourceName,
    sectionHint: normalizeSection(it.section) || it.section,
    date: it.date,
    snippet: it.snippet,
    excerpt: (it.excerpt || "").slice(0, excerptBudget),
  }));

  const system = `你是「Penn Notes」资讯编辑：个人前端站的每日精选，栏目参考主流科技/AI 资讯，同时保留本站特色。

栏目（只能用这些，覆盖要够广，不要因为「不够前端」就丢掉好新闻）：
- 业界：融资、并购、裁员、监管、市场格局
- 产品：应用/产品发布、功能更新、定价与商业化
- 模型：新模型、API、评测、能力与成本变化
- 开源：仓库、协议、社区项目（含 MCP / Agent 相关开源）
- 开发者工具：编码助手、IDE、Agent 平台、协作与工程工具链
- 前端：JS/TS、框架、构建、样式、Web 平台与 DX

硬性规则：
1. 每条必须带正确 id；该 id 的标题/摘录是唯一事实来源，禁止张冠李戴。
2. 中文标题可润色，须保留核心实体。
3. 普通条 summary：1 段 70–160 字；结尾「对读者：」给一句实用启示（选型/风险/可跟进动作）。
4. 信息面优先：有价值的业界/产品/模型新闻都要收；本站特色（开发者工具、前端）有则加分，无则不强行塞。
5. 去重、去纯广告；每栏 0–${MAX_PER_SECTION} 条；全文最多 ${MAX_TOTAL} 条；空栏可以。
6. briefing：恰好 3 句中文，概括今日格局/最大看点；只能依据候选素材，禁止编造未出现的事实。
7. 有且仅有 1 条 lead=true（全文最重要的头条）。头条 summary：120–220 字，含背景一句 + 事实要点；原文若有融资额/参数量/涨跌等数字必须原样保留，禁止改成「大幅」「显著」等模糊词；结尾仍要「对读者：」。
8. 只输出 JSON：{"briefing":["句1","句2","句3"],"items":[{"id":0,"section":"业界","title":"...","summary":"...","date":"YYYY-MM-DD","lead":false}]}
9. 不要输出 url、source、markdown 代码块。`;

  const user = `报告日期：${reportDate}
候选素材（按 id 绑定，勿混淆）：
${JSON.stringify(payload, null, 2)}`;

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
    throw new Error(`LLM error ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const parsed = parseJson(content);
  const list = Array.isArray(parsed?.items) ? parsed.items : [];
  const briefing = normalizeBriefing(parsed?.briefing);

  const usedIds = new Set();
  const bySection = Object.fromEntries(NEWS_SECTIONS.map((s) => [s, []]));
  const perSection = Object.fromEntries(NEWS_SECTIONS.map((s) => [s, 0]));
  /** @type {Array<{section:string, item:object, lead:boolean}>} */
  const accepted = [];
  let leadAssigned = false;

  for (const row of list) {
    const id = Number(row.id);
    if (!Number.isInteger(id) || id < 0 || id >= capped.length) continue;
    if (usedIds.has(id)) continue;

    const section = normalizeSection(row.section);
    if (!section) continue;
    if (perSection[section] >= MAX_PER_SECTION) continue;

    const src = capped[id];
    const summary = String(row.summary || "").trim();
    const title = String(row.title || src.title).trim();
    if (summary.length < 40) continue;

    if (!passesBindingCheck(src, title, summary)) {
      console.warn(
        `[summarize] drop id=${id} (binding mismatch): ${src.title.slice(0, 60)}`,
      );
      continue;
    }

    const wantLead = Boolean(row.lead) && !leadAssigned;
    const item = {
      title,
      summary,
      sourceName: src.sourceName,
      url: src.url,
      date: String(row.date || src.date || reportDate).slice(0, 10),
      image: null,
      lead: wantLead,
    };

    usedIds.add(id);
    if (wantLead) leadAssigned = true;
    perSection[section] += 1;
    accepted.push({ section, item, lead: wantLead });
  }

  // 全局上限：优先保留头条，再按 LLM 返回顺序截断
  const trimmed = trimToMaxTotal(accepted);
  for (const { section, item } of trimmed) {
    bySection[section].push(item);
  }

  // 若模型未标 lead，把全文第一条标为头条
  ensureOneLead(bySection);

  const total = NEWS_SECTIONS.reduce((n, s) => n + bySection[s].length, 0);
  if (total === 0) {
    throw new Error("LLM returned no usable items — check model output / candidates");
  }
  return { bySection, briefing };
}

/**
 * @param {Array<{section:string, item:object, lead:boolean}>} accepted
 */
function trimToMaxTotal(accepted) {
  if (accepted.length <= MAX_TOTAL) return accepted;
  const lead = accepted.find((a) => a.lead);
  const rest = accepted.filter((a) => !a.lead);
  const out = [];
  if (lead) out.push(lead);
  for (const row of rest) {
    if (out.length >= MAX_TOTAL) break;
    out.push(row);
  }
  return out;
}

function ensureOneLead(bySection) {
  let hasLead = false;
  for (const s of NEWS_SECTIONS) {
    for (const it of bySection[s] || []) {
      if (it.lead) {
        if (hasLead) it.lead = false;
        else hasLead = true;
      }
    }
  }
  if (hasLead) return;
  for (const s of NEWS_SECTIONS) {
    if (bySection[s]?.length) {
      bySection[s][0].lead = true;
      return;
    }
  }
}

function normalizeBriefing(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function passesBindingCheck(src, title, summary) {
  const blob = `${title}\n${summary}`.toLowerCase();
  const srcTitle = String(src.title || "").toLowerCase();
  const isRepo = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(src.title.trim());

  if (isRepo) {
    const repo = src.title.trim().toLowerCase();
    const short = repo.split("/")[1] || repo;
    if (!blob.includes(repo) && !blob.includes(short)) return false;
    return true;
  }

  const tokens = srcTitle
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4)
    .slice(0, 8);

  if (!tokens.length) return true;
  return tokens.filter((t) => blob.includes(t)).length >= 1;
}

function heuristicSummarize(items, reportDate) {
  const bySection = Object.fromEntries(NEWS_SECTIONS.map((s) => [s, []]));
  const perSection = Object.fromEntries(NEWS_SECTIONS.map((s) => [s, 0]));
  const accepted = [];
  for (const it of items) {
    const section = normalizeSection(it.section) || "业界";
    if (perSection[section] >= MAX_PER_SECTION) continue;
    const item = {
      title: it.title,
      summary: `${it.snippet || it.excerpt || "详见原文。"}\n\n对读者：待大模型补全启示。`,
      sourceName: it.sourceName,
      url: it.url,
      date: it.date || reportDate,
      image: null,
      lead: false,
    };
    accepted.push({ section, item, lead: false });
    perSection[section] += 1;
    if (accepted.length >= MAX_TOTAL) break;
  }
  const trimmed = trimToMaxTotal(accepted);
  for (const { section, item } of trimmed) {
    bySection[section].push(item);
  }
  ensureOneLead(bySection);
  const briefing = [];
  const first = trimmed[0]?.item;
  if (first) {
    briefing.push(`今日精选以「${String(first.title).slice(0, 40)}」等条目为主（启发式草稿）。`);
    briefing.push("完整导读将在配置 LLM_API_KEY 后由模型生成。");
    briefing.push("请以原文链接核对事实。");
  }
  return { bySection, briefing };
}

function parseJson(text) {
  const cleaned = String(text)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
