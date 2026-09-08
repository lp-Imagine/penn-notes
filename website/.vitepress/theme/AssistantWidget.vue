<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";
import AssistantBrandIcon from "./AssistantBrandIcon.vue";
import AssistantCloseIcon from "./AssistantCloseIcon.vue";

type AssistantConfig = {
  enabled?: boolean;
  apiBase?: string;
};

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  sources?: {
    title: string;
    link: string;
    sectionLabel?: string;
    summary?: string;
  }[];
  feedback?: "up" | "down";
};

const { theme, page, site } = useData();
const route = useRoute();

/** 面板展示名（与品牌一致，偏「导读」而非泛 AI 助手） */
const ASSISTANT_NAME = "Penn 导读";
const ASSISTANT_TAGLINE = "读懂本站 · 随时追问";

const open = ref(false);
const input = ref("");
const loading = ref(false);
const error = ref("");
const messages = ref<ChatMsg[]>([]);
const pageSwitchHint = ref("");
const panelRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const dialogRef = ref<HTMLElement | null>(null);
const selectionText = ref("");
const selectionIsCode = ref(false);
const copiedIdx = ref(-1);
const exportedIdx = ref(-1);
const sharedHint = ref(false);
const feedbackFor = ref(-1);
const feedbackReason = ref("");
const firstVisit = ref(false);
const showOnboard = ref(false);
const fontScale = ref(1);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const listening = ref(false);
const voiceSupported = ref(false);
const readingSection = ref("");
const panelW = ref(0);
const panelH = ref(0);
const resizing = ref(false);
/** 全屏浮层（默认开）；可切回右下角小窗 */
const panelExpanded = ref(true);
/** 站内确认框（替代 window.confirm） */
const confirmDialog = ref<{
  title: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
} | null>(null);

const SESSION_KEY = "penn-assistant-session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ONBOARD_KEY = "penn-assistant-onboarded";
const FONT_KEY = "penn-assistant-font";
const PANEL_SIZE_KEY = "penn-assistant-panel-size";
const PANEL_EXPANDED_KEY = "penn-assistant-expanded";
const FONT_STEPS = [0.9, 1, 1.12, 1.25] as const;
const REWRITE_PROMPTS = ["说得更短一点", "只要操作步骤", "换个角度再讲"];
let askAbort: AbortController | null = null;
let activePacer: { stop: () => void; push: (t: string) => void; finish: () => Promise<void> } | null =
  null;
let speechRec: {
  start: () => void;
  stop: () => void;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
  lang: string;
  interimResults: boolean;
  continuous: boolean;
} | null = null;

const cfg = computed(() => (theme.value.assistant || {}) as AssistantConfig);
const enabled = computed(() => Boolean(cfg.value.enabled));

const pathOnly = computed(() => sitePathOnly());

const PATH_PROMPT = "按标签给我一条阅读路径";
const COMPARE_PROMPT = "对比当前这篇和站内相关文";
const TOC_PROMPT = "本页有哪些章节？";
const CODE_PROMPT = "解释本页主要代码";
const TODAY_PROMPT = "今日要点是什么？";
const SUMMARY_PROMPT = "总结一下当前这篇文章";
const PITFALL_PROMPT = "有哪些容易踩的坑？";
const TAKEAWAY_PROMPT = "这篇的核心结论是什么？";
const ONBOARD_PROMPTS = [
  "本站有哪些内容？",
  PATH_PROMPT,
  "最近在写什么？",
  "前端入门该从哪篇看？",
];

const DOC_SECTIONS = [
  "/tech",
  "/engineering",
  "/backend",
  "/web",
  "/ui",
  "/computer",
  "/agent",
  "/misc",
  "/life",
  "/ai",
] as const;

function pathParts(p: string) {
  return p.split("/").filter(Boolean);
}

function isDocSection(p: string) {
  return DOC_SECTIONS.some((s) => p === s || p.startsWith(`${s}/`));
}

function isDocIndex(p: string) {
  return DOC_SECTIONS.some((s) => p === s);
}

/** 按栏目 / 子主题补充几条更贴页的提问 */
function sectionExtraPrompts(p: string): string[] {
  const [sec, topic = ""] = pathParts(p);
  if (sec === "web") {
    if (topic === "react") {
      return ["React 相关还有哪些文？", "和 Hooks / Virtual DOM 怎么串起来？"];
    }
    if (topic === "vue") {
      return ["Vue 相关还有哪些文？", "和组件通信 / 生命周期怎么串？"];
    }
    if (topic === "javascript") {
      return ["JS / TS 相关还有哪些文？", "和 Promise / 异步怎么串起来？"];
    }
    if (topic === "ui-lib") {
      return ["UI 组件库相关还有哪些？", "这类问题常见解法是什么？"];
    }
    return ["前端相关还有哪些文？", "这篇适合什么场景用？"];
  }
  if (sec === "ui") {
    if (topic === "css") {
      return ["还有哪些 CSS 布局技巧？", "深色模式相关怎么处理？"];
    }
    return ["UI / 样式相关还有哪些？", "有没有更简的写法？"];
  }
  if (sec === "engineering") {
    if (topic === "git") return ["Git 相关手册还有哪些？", "常见协作场景怎么用？"];
    if (topic === "npm") return ["npm / 包管理相关还有哪些？", "踩坑点有哪些？"];
    if (topic === "toolchain") {
      return ["工程工具链相关还有哪些？", "怎么落到日常工作流？"];
    }
    return ["工程化相关还有哪些？", "怎么落到日常工作流？"];
  }
  if (sec === "agent") {
    return ["Agent 实践还有哪些？", "怎么落到日常工作流？"];
  }
  if (sec === "backend") {
    return ["后端相关还有哪些文？", "和前端联调时要注意什么？"];
  }
  if (sec === "computer") {
    return ["浏览器 / 计算机相关还有哪些？", "和前端渲染怎么对应？"];
  }
  if (sec === "tech") {
    if (topic === "github") {
      return ["GitHub 技巧还有哪些？", "有没有更快的检索方式？"];
    }
    return ["工具 / 文档相关还有哪些？", "有没有可直接套用的清单？"];
  }
  if (sec === "misc") {
    return ["这类随想还有哪些？", "这篇想表达什么观点？"];
  }
  return ["站内还有哪些相关文？"];
}

function buildArticleQuickPrompts(p: string): string[] {
  const items = [SUMMARY_PROMPT, TAKEAWAY_PROMPT, COMPARE_PROMPT, TOC_PROMPT];
  if (pageHasCode()) items.splice(1, 0, CODE_PROMPT);
  items.push(PITFALL_PROMPT, ...sectionExtraPrompts(p));
  return uniquePrompts(items, 6);
}

function uniquePrompts(items: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of items) {
    const t = q.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

const quickPrompts = computed(() => {
  if (showOnboard.value && !messages.value.length) {
    return ONBOARD_PROMPTS;
  }
  const p = pathOnly.value;

  if (p === "/" || p === "") {
    return [
      "本站有哪些内容？",
      "最近在写什么？",
      PATH_PROMPT,
      "前端入门该从哪篇看？",
      "工程化相关有哪些？",
      "Agent 实践从哪开始？",
    ];
  }
  if (p === "/news" || p === "/news/") {
    return [
      TODAY_PROMPT,
      "最近有哪些动态？",
      "挑一条值得深读的",
      "站内有没有相关实践文？",
      PATH_PROMPT,
    ];
  }
  if (p.startsWith("/news/")) {
    return [
      "这条动态在讲什么？",
      TODAY_PROMPT,
      "和本站哪篇笔记最相关？",
      "站内有没有相关实践文？",
      "值得跟进的点有哪些？",
    ];
  }
  if (p.startsWith("/books")) {
    return [
      "书架上有哪些书？",
      "推荐一本入门书",
      "和前端相关的书有哪些？",
      "最近在读什么？",
      PATH_PROMPT,
    ];
  }
  if (p.startsWith("/collect")) {
    return [
      "收藏夹里有什么？",
      "有哪些值得先看？",
      "帮我按主题归一下",
      PATH_PROMPT,
    ];
  }
  if (p.startsWith("/topics")) {
    return [
      "有哪些专题？",
      "推荐一个适合现在看的专题",
      "专题和单篇笔记有什么区别？",
      PATH_PROMPT,
    ];
  }
  if (p.startsWith("/tags")) {
    return [
      "有哪些热门标签？",
      PATH_PROMPT,
      "前端相关标签有哪些？",
      "工程化相关标签有哪些？",
    ];
  }
  if (p.startsWith("/about")) {
    return [
      "作者是谁？在做什么？",
      "本站怎么用最合适？",
      "站内内容是怎么组织的？",
      PATH_PROMPT,
    ];
  }
  if (p.startsWith("/recent")) {
    return [
      "最近更新了什么？",
      "哪几篇值得先看？",
      PATH_PROMPT,
      "工程化相关有哪些？",
    ];
  }
  if (p.startsWith("/archive") || p.startsWith("/talks") || p.startsWith("/suibi")) {
    return [
      "这一页主要有什么？",
      "挑几条值得看的",
      PATH_PROMPT,
      "和站内笔记有什么关系？",
    ];
  }
  if (isDocIndex(p)) {
    const label = pathParts(p)[0] || "这个分类";
    return [
      `${label} 分类下有哪些文章？`,
      "推荐一篇入门文",
      "最近更新了什么？",
      PATH_PROMPT,
      "和其它分类怎么串着看？",
    ];
  }
  if (isDocSection(p)) {
    return buildArticleQuickPrompts(p);
  }
  return [
    "最近在写什么？",
    PATH_PROMPT,
    "工程化相关有哪些？",
    "前端入门该从哪篇看？",
    "本站有哪些内容？",
  ];
});

const followUpPrompts = computed(() => {
  if (loading.value || !messages.value.length) return [];
  const last = messages.value[messages.value.length - 1];
  if (last?.role !== "assistant" || !last.content.trim()) return [];
  if (last.feedback === "down") return [...REWRITE_PROMPTS];
  const title = String(page.value?.title || "").trim();
  const p = pathOnly.value;
  const related = title
    ? `和《${title}》还有哪些相关文？`
    : "站内还有哪些相关文章？";
  const items = ["展开其中一点", related, COMPARE_PROMPT];
  if (isDocSection(p) && !isDocIndex(p)) {
    items.push(TAKEAWAY_PROMPT, PITFALL_PROMPT, ...sectionExtraPrompts(p));
  } else if (p.startsWith("/news")) {
    items.push("和本站哪篇笔记最相关？", "值得跟进的点有哪些？");
  } else {
    items.push(PATH_PROMPT, "还有哪些值得接着看？");
  }
  if (selectionText.value) {
    items.unshift(
      selectionIsCode.value ? "解释这段代码" : "解释我选中的这段",
    );
  }
  return uniquePrompts(items, 5);
});

const followUpsLabel = computed(() =>
  messages.value[messages.value.length - 1]?.feedback === "down"
    ? "换个答法"
    : "继续问",
);

const selectionPreview = computed(() => {
  const t = selectionText.value.trim();
  if (!t) return "";
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
});

const selectionChipLabel = computed(() =>
  selectionIsCode.value ? "代码" : "选中",
);

function sitePathOnly() {
  const raw = route.path || "/";
  const base = (site.value.base || "/").replace(/\/$/, "");
  const stripped =
    base && base !== "/" && raw.startsWith(base) ? raw.slice(base.length) : raw;
  return decodeURI(stripped).replace(/\/$/, "") || "/";
}

function pageHasCode() {
  try {
    return Boolean(document.querySelector(".vp-doc pre, .vp-doc code"));
  } catch {
    return false;
  }
}

type PageHeading = { id: string; text: string; level: number };

function listPageHeadings(): PageHeading[] {
  try {
    return Array.from(
      document.querySelectorAll(".vp-doc h2[id], .vp-doc h3[id]"),
    )
      .map((el) => ({
        id: el.id,
        text: (el.textContent || "").trim().replace(/\s*#\s*$/, ""),
        level: el.tagName === "H2" ? 2 : 3,
      }))
      .filter((h) => h.id && h.text);
  } catch {
    return [];
  }
}

function firstPageCodeSample() {
  try {
    const pre = document.querySelector(".vp-doc pre code, .vp-doc pre");
    const t = (pre?.textContent || "").trim();
    return t ? t.slice(0, 1200) : "";
  } catch {
    return "";
  }
}

function jumpToHeadingByQuery(message: string): string | null {
  const headings = listPageHeadings();
  if (!headings.length) return null;
  const m =
    message.match(
      /(?:跳到|讲到|滚到|定位到|打开)[「『《]?([^」』》\s，。！？]{1,40})/,
    ) || message.match(/[「『《]([^」』》]{1,40})[」』》]/);
  const key = (m?.[1] || message).replace(
    /^(跳到|讲到|滚到|定位到|打开|本页|章节)/,
    "",
  );
  const needle = key.trim();
  if (needle.length < 1) return null;
  const hit =
    headings.find((h) => h.text === needle) ||
    headings.find((h) => h.text.includes(needle) || needle.includes(h.text));
  if (!hit) return null;
  return scrollToHeading(hit) ? hit.text : null;
}

function scrollToHeading(hit: PageHeading) {
  const el = document.getElementById(hit.id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    history.replaceState(null, "", `#${encodeURIComponent(hit.id)}`);
  } catch {
    /* ignore */
  }
  trackAssistant("assistant_jump", {
    q: hit.text.slice(0, 80),
    path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
  });
  return true;
}

/** 回答里点名的本页章节 → 一键滚到正文 */
function matchedHeadingsInAnswer(content: string): PageHeading[] {
  const text = String(content || "");
  if (!text.trim()) return [];
  const hits: PageHeading[] = [];
  for (const h of listPageHeadings()) {
    if (h.text.length < 2) continue;
    if (
      text.includes(h.text) ||
      text.includes(`「${h.text}」`) ||
      text.includes(`『${h.text}』`)
    ) {
      hits.push(h);
    }
    if (hits.length >= 3) break;
  }
  return hits;
}

function openSource(link: string) {
  const href = withSiteBase(link);
  const path = sitePathOnly();
  // 同源当前文：若带 hash 则滚过去，否则新开/跳转
  try {
    const u = new URL(href, window.location.origin);
    const base = (site.value.base || "/").replace(/\/$/, "");
    let uPath = decodeURI(u.pathname);
    if (base && base !== "/" && uPath.startsWith(base)) {
      uPath = uPath.slice(base.length) || "/";
    }
    uPath = uPath.replace(/\/$/, "") || "/";
    if (uPath === path && u.hash) {
      const id = decodeURIComponent(u.hash.replace(/^#/, ""));
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        trackAssistant("assistant_open_source", {
          path: path.split("/").filter(Boolean)[0] || "home",
          mode: "hash",
        });
        return;
      }
    }
    if (uPath === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      trackAssistant("assistant_open_source", {
        path: path.split("/").filter(Boolean)[0] || "home",
        mode: "same",
      });
      return;
    }
  } catch {
    /* fall through */
  }
  window.location.assign(href);
  trackAssistant("assistant_open_source", {
    path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
    mode: "nav",
  });
}

function loadFontScale() {
  try {
    const n = Number(localStorage.getItem(FONT_KEY));
    if (FONT_STEPS.includes(n as (typeof FONT_STEPS)[number])) {
      fontScale.value = n;
    }
  } catch {
    /* ignore */
  }
}

function bumpFont(dir: -1 | 1) {
  const i = FONT_STEPS.indexOf(
    fontScale.value as (typeof FONT_STEPS)[number],
  );
  const cur = i >= 0 ? i : 1;
  const next = FONT_STEPS[Math.max(0, Math.min(FONT_STEPS.length - 1, cur + dir))];
  fontScale.value = next;
  try {
    localStorage.setItem(FONT_KEY, String(next));
  } catch {
    /* ignore */
  }
}

function markOnboarded() {
  showOnboard.value = false;
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* ignore */
  }
}

function trackAssistant(
  event: string,
  data?: Record<string, string | number | undefined>,
) {
  try {
    const umami = (window as unknown as { umami?: { track?: Function } }).umami;
    if (typeof umami?.track !== "function") return;
    const clean: Record<string, string | number> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v === undefined || v === "") continue;
        clean[k] = v;
      }
    }
    if (Object.keys(clean).length) umami.track(event, clean);
    else umami.track(event);
  } catch {
    // ignore analytics errors
  }
}

function isReadingPathQuestion(q: string) {
  return /阅读路径|学习路线|从哪读|入门顺序|想学|按标签|阅读顺序|给我一条.*路径/.test(
    q,
  );
}

function requestConfirm(opts: {
  title: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  confirmDialog.value = opts;
}

function cancelConfirm() {
  confirmDialog.value = null;
}

function runConfirm() {
  const action = confirmDialog.value?.onConfirm;
  confirmDialog.value = null;
  action?.();
}

function clearChat(opts?: { skipConfirm?: boolean }) {
  if (loading.value) return;
  if (!opts?.skipConfirm && messages.value.length) {
    requestConfirm({
      title: "清空当前对话？",
      detail: "清空后不可恢复，可重新提问继续聊。",
      confirmLabel: "清空",
      cancelLabel: "取消",
      danger: true,
      onConfirm: () => clearChat({ skipConfirm: true }),
    });
    return;
  }
  messages.value = [];
  error.value = "";
  pageSwitchHint.value = "";
  feedbackFor.value = -1;
  feedbackReason.value = "";
  persistSession();
}

function stopGenerate() {
  if (!loading.value) return;
  askAbort?.abort();
  askAbort = null;
  activePacer?.stop();
  activePacer = null;
  loading.value = false;
  preferTurnPin = true;
  void scrollLatestTurnIntoView();
  persistSession();
}

function sendFeedback(idx: number, vote: "up" | "down", reason = "") {
  const m = messages.value[idx];
  if (!m || m.role !== "assistant" || m.feedback) return;
  messages.value[idx] = { ...m, feedback: vote };
  feedbackFor.value = -1;
  feedbackReason.value = "";
  const prevUser = [...messages.value.slice(0, idx)]
    .reverse()
    .find((x) => x.role === "user");
  trackAssistant("assistant_feedback", {
    vote,
    reason: reason.slice(0, 80),
    q: (prevUser?.content || "").slice(0, 80),
    path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
  });
  persistSession();
}

function onFeedbackDown(idx: number) {
  const m = messages.value[idx];
  if (!m || m.feedback) return;
  feedbackFor.value = idx;
  feedbackReason.value = "";
}

function submitFeedbackDown(idx: number) {
  sendFeedback(idx, "down", feedbackReason.value.trim());
}

async function copyAnswer(idx: number) {
  const m = messages.value[idx];
  if (!m || m.role !== "assistant" || !m.content.trim()) return;
  try {
    await navigator.clipboard.writeText(m.content);
    copiedIdx.value = idx;
    window.setTimeout(() => {
      if (copiedIdx.value === idx) copiedIdx.value = -1;
    }, 1600);
  } catch {
    error.value = "复制失败，请手动选择文字";
  }
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const lines: string[] = [];
  for (const para of String(text || "").split(/\n+/)) {
    if (!para) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const ch of Array.from(para)) {
      const trial = line + ch;
      if (ctx.measureText(trial).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else line = trial;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function canvasSafeColor(raw: string, fallback: string) {
  const c = String(raw || "").trim();
  if (!c) return fallback;
  // canvas 对 oklch / color-mix 支持不一，不安全时回退
  if (/oklch|color-mix|lab\(|lch\(/i.test(c)) return fallback;
  return c;
}

async function exportAnswerCard(idx: number) {
  const m = messages.value[idx];
  if (!m || m.role !== "assistant" || !m.content.trim()) return;
  const prevUser = [...messages.value.slice(0, idx)]
    .reverse()
    .find((x) => x.role === "user");
  const title = String(page.value?.title || "Penn Notes").trim();
  const q = (prevUser?.content || "").trim().slice(0, 120);
  const a = m.content.trim().slice(0, 900);
  const isDark = document.documentElement.classList.contains("dark");

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 720;
  const pad = 36;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    error.value = "当前浏览器不支持导出卡片";
    return;
  }

  ctx.font = "600 28px system-ui, sans-serif";
  const qLines = wrapCanvasText(ctx, q ? `问：${q}` : `${ASSISTANT_NAME}回答`, W - pad * 2);
  ctx.font = "400 22px system-ui, sans-serif";
  const aLines = wrapCanvasText(ctx, a, W - pad * 2);
  const H = Math.min(
    1100,
    pad * 2 + 52 + qLines.length * 36 + 20 + aLines.length * 32 + 48,
  );
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const root = getComputedStyle(document.documentElement);
  const bg = canvasSafeColor(
    root.getPropertyValue("--surface"),
    isDark ? "#1e293b" : "#f8fafc",
  );
  const fg = canvasSafeColor(
    root.getPropertyValue("--text"),
    isDark ? "#e2e8f0" : "#0f172a",
  );
  const muted = canvasSafeColor(
    root.getPropertyValue("--text-3"),
    isDark ? "#94a3b8" : "#64748b",
  );
  const accent = canvasSafeColor(
    root.getPropertyValue("--accent"),
    "#3b82f6",
  );

  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 8, H);

  let y = pad;
  ctx.fillStyle = muted;
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText(`Penn Notes · ${ASSISTANT_NAME}`, pad + 8, y);
  y += 28;
  ctx.fillStyle = fg;
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText(title.length > 28 ? `${title.slice(0, 28)}…` : title, pad + 8, y);
  y += 36;

  ctx.font = "600 22px system-ui, sans-serif";
  for (const line of qLines.slice(0, 4)) {
    ctx.fillText(line, pad + 8, y);
    y += 34;
  }
  y += 10;
  ctx.font = "400 20px system-ui, sans-serif";
  ctx.fillStyle = fg;
  for (const line of aLines) {
    if (y > H - 40) break;
    ctx.fillText(line, pad + 8, y);
    y += 30;
  }
  ctx.fillStyle = muted;
  ctx.font = "400 14px system-ui, sans-serif";
  ctx.fillText("penn-notes.draftly.cn", pad + 8, H - 20);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) {
    error.value = "导出失败";
    return;
  }

  const download = () => {
    const url = URL.createObjectURL(blob);
    const aEl = document.createElement("a");
    aEl.href = url;
    aEl.download = "penn-assistant-card.png";
    aEl.click();
    URL.revokeObjectURL(url);
  };

  // 优先下载（反馈明确）；再尝试写入剪贴板
  download();
  exportedIdx.value = idx;
  window.setTimeout(() => {
    if (exportedIdx.value === idx) exportedIdx.value = -1;
  }, 1800);
  trackAssistant("assistant_export", {
    path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
  });

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    }
  } catch {
    // 下载已成功即可
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function shareConversation() {
  const lines: string[] = [`# Penn Notes ${ASSISTANT_NAME}会话`, ""];
  const title = String(page.value?.title || "").trim();
  if (title) lines.push(`> 页面：《${title}》`, "");
  for (const m of messages.value) {
    if (!m.content.trim()) continue;
    if (m.role === "user") lines.push(`**问：** ${m.content.trim()}`, "");
    else lines.push(`**答：** ${m.content.trim()}`, "");
  }
  const text = lines.join("\n").trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    sharedHint.value = true;
    trackAssistant("assistant_share", {
      turns: messages.value.filter((m) => m.content.trim()).length,
      path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
    });
    window.setTimeout(() => {
      sharedHint.value = false;
    }, 1800);
  } catch {
    error.value = "复制失败，请手动选择文字";
  }
}

function captureDocSelection(e?: Event) {
  try {
    const t = e?.target;
    // 点助手面板（含「解释」）时选区常被清空，保留已捕获的选中条文
    if (
      t instanceof Element &&
      t.closest(".penn-assistant-panel, .penn-assistant-fab")
    ) {
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      if (selectionText.value) {
        selectionText.value = "";
        selectionIsCode.value = false;
      }
      return;
    }
    const text = String(sel.toString() || "").trim();
    if (text.length < 8) {
      if (selectionText.value) {
        selectionText.value = "";
        selectionIsCode.value = false;
      }
      return;
    }
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const el =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    if (!el?.closest?.(".vp-doc")) {
      if (selectionText.value) {
        selectionText.value = "";
        selectionIsCode.value = false;
      }
      return;
    }
    if (el.closest(".penn-assistant")) return;
    selectionText.value = text.slice(0, 800);
    selectionIsCode.value = Boolean(el.closest("pre, code"));
  } catch {
    // ignore
  }
}

let selectionSyncTimer: ReturnType<typeof setTimeout> | null = null;
function onSelectionChange() {
  if (selectionSyncTimer != null) clearTimeout(selectionSyncTimer);
  selectionSyncTimer = setTimeout(() => {
    selectionSyncTimer = null;
    // selectionchange 无可靠 target，仅在选区已空时清芯片
    try {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !String(sel.toString() || "").trim()) {
        // 若焦点在助手内（点解释/输入），不要清
        const ae = document.activeElement;
        if (ae?.closest?.(".penn-assistant-panel")) return;
        if (selectionText.value) {
          selectionText.value = "";
          selectionIsCode.value = false;
        }
      }
    } catch {
      // ignore
    }
  }, 120);
}

function clearSelectionChip() {
  selectionText.value = "";
  selectionIsCode.value = false;
}

function persistSession() {
  try {
    if (!messages.value.length) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
  } catch {
    /* ignore */
  }
  const payload = JSON.stringify({
    messages: messages.value.slice(-20),
    pageSwitchHint: pageSwitchHint.value,
    savedAt: Date.now(),
  });
  try {
    localStorage.setItem(SESSION_KEY, payload);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

function restoreSession() {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      messages?: ChatMsg[];
      pageSwitchHint?: string;
      savedAt?: number;
    };
    if (
      typeof parsed.savedAt === "number" &&
      Date.now() - parsed.savedAt > SESSION_TTL_MS
    ) {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    if (Array.isArray(parsed.messages) && parsed.messages.length) {
      messages.value = parsed.messages
        .filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-20);
      if (messages.value.length) {
        pageSwitchHint.value =
          typeof parsed.pageSwitchHint === "string" && parsed.pageSwitchHint
            ? parsed.pageSwitchHint
            : "已恢复上次对话（保留 7 天，可点清空）";
      }
    }
  } catch {
    // ignore
  }
}

function initSpeech() {
  const w = window as unknown as {
    SpeechRecognition?: new () => typeof speechRec;
    webkitSpeechRecognition?: new () => typeof speechRec;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return;
  voiceSupported.value = true;
  const rec = new Ctor() as NonNullable<typeof speechRec>;
  rec.lang = "zh-CN";
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (ev: unknown) => {
    const e = ev as {
      results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>;
      resultIndex: number;
    };
    let text = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
    }
    if (text.trim()) input.value = text.trim().slice(0, 500);
  };
  rec.onerror = () => {
    listening.value = false;
  };
  rec.onend = () => {
    listening.value = false;
  };
  speechRec = rec;
}

function toggleVoice() {
  if (!speechRec || loading.value) return;
  if (listening.value) {
    try {
      speechRec.stop();
    } catch {
      /* ignore */
    }
    listening.value = false;
    return;
  }
  try {
    speechRec.start();
    listening.value = true;
    trackAssistant("assistant_voice", {
      path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
    });
  } catch {
    listening.value = false;
    error.value = "无法启动语音识别";
  }
}

function focusInput() {
  if (!open.value) {
    open.value = true;
    updatePanelMaxH();
  }
  void nextTick(() => inputRef.value?.focus());
}

function updateReadingSection() {
  try {
    const headings = listPageHeadings();
    if (!headings.length) {
      readingSection.value = "";
      return;
    }
    const mid = window.innerHeight * 0.28;
    let current = "";
    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= mid) current = h.text;
    }
    readingSection.value = current;
  } catch {
    readingSection.value = "";
  }
}

function askSummarizeSection() {
  if (!readingSection.value || loading.value) return;
  void ask(`总结一下「${readingSection.value}」这一节`, { fromChip: true });
}

function loadPanelSize() {
  try {
    const raw = localStorage.getItem(PANEL_SIZE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { w?: number; h?: number };
    if (parsed.w && parsed.w >= 320 && parsed.w <= 560) panelW.value = parsed.w;
    if (parsed.h && parsed.h >= 360 && parsed.h <= 860) panelH.value = parsed.h;
  } catch {
    /* ignore */
  }
}

function savePanelSize() {
  try {
    localStorage.setItem(
      PANEL_SIZE_KEY,
      JSON.stringify({ w: panelW.value || undefined, h: panelH.value || undefined }),
    );
  } catch {
    /* ignore */
  }
}

function onResizePointerDown(e: PointerEvent) {
  if (typeof window === "undefined") return;
  if (panelExpanded.value) return;
  if (!window.matchMedia("(min-width: 768px)").matches) return;
  e.preventDefault();
  e.stopPropagation();
  const panel = dialogRef.value;
  if (!panel) return;
  resizing.value = true;
  const startX = e.clientX;
  const startY = e.clientY;
  const rect = panel.getBoundingClientRect();
  const startW = rect.width;
  const startH = rect.height;

  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    // 右下角小窗：向左拖变宽，向上拖变高
    panelW.value = Math.max(320, Math.min(560, startW - dx));
    panelH.value = Math.max(360, Math.min(860, startH - dy));
    panelMaxH.value = panelH.value;
  };
  const onUp = () => {
    resizing.value = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    savePanelSize();
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function apiBase() {
  const raw = (cfg.value.apiBase || "").trim().replace(/\/$/, "");
  return raw || "";
}

function endpoint(path: string) {
  const base = apiBase();
  if (!base) return path;
  return `${base}${path}`;
}

function withSiteBase(link: string) {
  const base = site.value.base || "/";
  if (/^https?:\/\//i.test(link)) return link;
  const clean = String(link || "").replace(/^\//, "");
  if (base === "/") return `/${clean}`;
  return `${base.replace(/\/$/, "")}/${clean}`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 流式阶段用轻量渲染：不做段落/列表切块，避免每字重排导致文字「飘出」卡片。
 * 仅转义 + 完整加粗 + 换行。
 */
function renderStreamingHtml(raw: string) {
  let s = escapeHtml(String(raw || ""));
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\n/g, "<br />");
  return s;
}

/** Safe subset: paragraphs, br, bold, lists, hr, markdown links; 《书名》→站内链. */
function renderAssistantHtml(
  raw: string,
  sources?: ChatMsg["sources"],
) {
  let text = String(raw || "").trim();
  // Drop model-emitted「相关链接」block — UI shows sources separately.
  text = text.replace(
    /\n*(?:#{1,3}\s*)?(?:\*\*)?相关链接(?:\*\*)?\s*\n[\s\S]*$/u,
    "",
  );
  text = text.replace(/\n---+\s*$/u, "").trim();

  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const resolved = withSiteBase(
      String(href).replace(/&amp;/g, "&").replace(/^<|>$/g, ""),
    );
    return `<a href="${escapeHtml(resolved)}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  if (sources?.length) {
    const byTitle = new Map(
      sources.map((src) => [String(src.title || "").trim(), src] as const),
    );
    s = s.replace(/《([^》]+)》/g, (full, title) => {
      const hit =
        byTitle.get(title) ||
        [...byTitle.entries()].find(
          ([t]) => t.includes(title) || title.includes(t),
        )?.[1];
      if (!hit?.link) return full;
      return `<a class="penn-assistant-booklink" href="${escapeHtml(withSiteBase(hit.link))}">《${escapeHtml(title)}》</a>`;
    });
  }

  const blocks = s.split(/\n{2,}/).map((block) => {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    if (!lines.length) return "";
    if (lines.every((l) => /^(-|\*)\s+/.test(l.trim()) || /^---+/.test(l.trim()))) {
      const items = lines
        .filter((l) => /^(-|\*)\s+/.test(l.trim()))
        .map((l) => `<li>${l.trim().replace(/^(-|\*)\s+/, "")}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    }
    if (lines.length === 1 && /^---+$/.test(lines[0].trim())) {
      return "<hr />";
    }
    return `<p>${lines.join("<br />")}</p>`;
  });

  return blocks.filter(Boolean).join("");
}

const pageTitleShort = computed(() => {
  const t = String(page.value?.title || "").trim();
  if (!t) return "";
  return t.length > 22 ? `${t.slice(0, 22)}…` : t;
});

const SECTION_CHIP_LABEL: Record<string, string> = {
  web: "JS & 框架",
  ui: "样式",
  engineering: "工程化",
  backend: "后端",
  tech: "工具备忘",
  computer: "浏览器",
  agent: "AI Agent",
  misc: "杂项",
  news: "AI 动态",
  about: "关于",
  archive: "归档",
  tags: "标签",
  recent: "最近",
};

/** 顶栏胶囊用：首页等无 frontmatter title 时给可读名，避免「新页面」 */
const pageLabelShort = computed(() => {
  const path = (pathOnly.value || "/").replace(/\/$/, "") || "/";
  if (path === "/") return "首页";

  const titled = pageTitleShort.value;
  if (titled) return titled;

  const parts = path.split("/").filter(Boolean);
  if (parts.length === 1 && SECTION_CHIP_LABEL[parts[0]]) {
    return SECTION_CHIP_LABEL[parts[0]];
  }

  if (typeof document !== "undefined") {
    const doc = String(document.title || "")
      .replace(/\s*[|·\-–—]\s*Penn Notes.*$/i, "")
      .replace(/^Penn Notes\s*[|·\-–—]\s*/i, "")
      .trim();
    if (doc && !/^penn notes$/i.test(doc)) {
      return doc.length > 22 ? `${doc.slice(0, 22)}…` : doc;
    }
  }

  const last = parts[parts.length - 1] || "";
  if (last) return decodeURIComponent(last).slice(0, 22);
  return "当前页";
});

function pageContext() {
  const title = String(page.value?.title || document.title || "").trim();
  const path = sitePathOnly();
  let summary = "";
  try {
    // 仅在新闻相关页抓卡片，避免其它页误扫到首页/侧栏同类 class
    if (path === "/news" || path.startsWith("/news/")) {
      const newsCards = Array.from(
        document.querySelectorAll(
          ".vp-doc .news-item-card, .vp-doc .section-card--media, .vp-doc .news-card",
        ),
      ).slice(0, 12);
      const bits = newsCards
        .map((card) => {
          const t = (
            card.querySelector(".news-item-title, .section-card-title")
              ?.textContent || ""
          ).trim();
          const s = (
            card.querySelector(
              ".news-item-summary, .section-card .news-item-summary",
            )?.textContent || ""
          ).trim();
          if (!t) return "";
          return s ? `${t}：${s}` : t;
        })
        .filter(Boolean);
      summary = bits.join("\n").slice(0, 1200);
    }
    if (!summary) {
      const paras = Array.from(
        document.querySelectorAll(
          ".vp-doc > p, .vp-doc .penn-callout, .vp-doc li, .vp-doc h2, .vp-doc h3",
        ),
      )
        .map((el) => (el.textContent || "").trim())
        .filter((t) => t.length > 12 && !/^复制(代码)?$/.test(t))
        .slice(0, 10);
      summary = paras.join(" ").slice(0, 900);
    }
  } catch {
    // ignore
  }
  return {
    path,
    title,
    summary,
    headings: listPageHeadings()
      .slice(0, 24)
      .map((h) => `${h.level === 2 ? "##" : "###"} ${h.text}`),
    codeSample: firstPageCodeSample(),
    ...(selectionText.value.trim()
      ? {
          selection: selectionText.value.trim().slice(0, 800),
          selectionIsCode: selectionIsCode.value,
        }
      : {}),
  };
}

let preferTurnPin = false;

async function scrollToBottom() {
  if (preferTurnPin) return;
  await nextTick();
  const el = listRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

/** 流式生成中：跟着回答气泡底部走，保证正在写出的文字在视野内 */
async function scrollStreamIntoView() {
  if (preferTurnPin) return;
  await nextTick();
  const list = listRef.value;
  if (!list) return;
  const assistants = list.querySelectorAll(
    '.penn-assistant-msg[data-role="assistant"]',
  );
  const last = assistants[assistants.length - 1] as HTMLElement | undefined;
  if (!last) {
    list.scrollTop = list.scrollHeight;
    return;
  }
  const bubble = last.querySelector(
    ".penn-assistant-bubble",
  ) as HTMLElement | null;
  const anchor = bubble || last;
  const listRect = list.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();
  const pad = 16;
  // 气泡底部被挡住 → 往下滚
  const overflowBottom = anchorRect.bottom - (listRect.bottom - pad);
  if (overflowBottom > 0) {
    list.scrollTop += overflowBottom;
    return;
  }
  // 整段气泡比列表矮却顶在视口上方之外 → 拉回来
  if (
    anchorRect.top < listRect.top + 4 &&
    anchorRect.height <= list.clientHeight - pad
  ) {
    list.scrollTop += anchorRect.top - listRect.top - 8;
  }
}

/** 答完后：滚回本轮提问置顶，露出「提问 + 回答开头」（图二效果） */
async function scrollLatestTurnIntoView() {
  const list = listRef.value;
  if (!list) return;

  const pinTurnTop = () => {
    const box = listRef.value;
    if (!box) return false;
    const users = box.querySelectorAll('.penn-assistant-msg[data-role="user"]');
    const el = users[users.length - 1] as HTMLElement | undefined;
    if (!el) return false;
    // 用内容坐标计算，避免 flex / 锚定导致相对 delta 失效
    const top =
      el.getBoundingClientRect().top -
      box.getBoundingClientRect().top +
      box.scrollTop;
    box.scrollTop = Math.max(0, top - 8);
    return true;
  };

  const settle = async () => {
    await nextTick();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  };

  await settle();
  pinTurnTop();
  // 全文 HTML /「继续问」挂载后再钉，防止仍停在图一底部
  await settle();
  pinTurnTop();
  window.setTimeout(() => {
    pinTurnTop();
  }, 80);
  window.setTimeout(() => {
    pinTurnTop();
  }, 200);
}

/** 提问刚发出时：保证用户气泡与思考态完整在视野内 */
async function scrollPendingTurnIntoView() {
  await nextTick();
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  const list = listRef.value;
  if (!list) return;
  const users = list.querySelectorAll('.penn-assistant-msg[data-role="user"]');
  const user = users[users.length - 1] as HTMLElement | undefined;
  if (!user) {
    list.scrollTop = list.scrollHeight;
    return;
  }
  const listRect = list.getBoundingClientRect();
  const userRect = user.getBoundingClientRect();
  // 用户气泡被顶出 → 拉回顶部附近
  if (userRect.top < listRect.top + 6) {
    list.scrollTop += userRect.top - listRect.top - 8;
  }
  // 底部（含等待气泡）被裁 → 滚到底留白
  const last = list.querySelector(
    '.penn-assistant-msg[data-role="assistant"]:last-of-type',
  ) as HTMLElement | null;
  const bottomEl = last || user;
  const bottom = bottomEl.getBoundingClientRect().bottom;
  const overflow = bottom - (listRect.bottom - 12);
  if (overflow > 0) list.scrollTop += overflow;
}

/** 阻止弹窗内滚动穿透到页面 */
let touchStartY = 0;

function scrollChainBlocked(
  deltaY: number,
  el: HTMLElement | null,
  target: Node | null,
) {
  if (!el || !target || !el.contains(target)) return null;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return true;
  const top = el.scrollTop;
  if (deltaY < 0 && top <= 0) return true;
  if (deltaY > 0 && top >= max - 1) return true;
  return false;
}

function shouldBlockScrollChain(deltaY: number, target: EventTarget | null) {
  const node = target instanceof Node ? target : null;
  // 输入框多行溢出时放行原生滚动（原先只认消息列表，导致 textarea 滚轮失效）
  const inputBlock = scrollChainBlocked(deltaY, inputRef.value, node);
  if (inputBlock !== null) return inputBlock;
  const listBlock = scrollChainBlocked(deltaY, listRef.value, node);
  if (listBlock !== null) return listBlock;
  return true;
}

function onPanelWheel(e: WheelEvent) {
  e.stopPropagation();
  const input = inputRef.value;
  const node = e.target instanceof Node ? e.target : null;
  // 多行输入：由我们滚动 textarea，避免面板防穿透把滚轮吞掉
  if (input && node && input.contains(node)) {
    const max = Math.max(0, input.scrollHeight - input.clientHeight);
    if (max > 0) {
      const prev = input.scrollTop;
      const next = Math.min(max, Math.max(0, prev + e.deltaY));
      if (next !== prev) {
        input.scrollTop = next;
        e.preventDefault();
        return;
      }
    }
  }
  if (shouldBlockScrollChain(e.deltaY, e.target)) {
    e.preventDefault();
  }
}

function onPanelTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? 0;
}

function onPanelTouchMove(e: TouchEvent) {
  e.stopPropagation();
  const y = e.touches[0]?.clientY ?? 0;
  const deltaY = touchStartY - y;
  const input = inputRef.value;
  const node = e.target instanceof Node ? e.target : null;
  if (input && node && input.contains(node)) {
    const max = Math.max(0, input.scrollHeight - input.clientHeight);
    if (max > 0) {
      const prev = input.scrollTop;
      const next = Math.min(max, Math.max(0, prev + deltaY));
      if (next !== prev) {
        input.scrollTop = next;
        touchStartY = y;
        e.preventDefault();
        return;
      }
    }
  }
  if (shouldBlockScrollChain(deltaY, e.target)) {
    e.preventDefault();
  }
}

function bindPanelScrollLock() {
  const el = dialogRef.value;
  if (!el) return;
  el.addEventListener("wheel", onPanelWheel, { passive: false });
  el.addEventListener("touchstart", onPanelTouchStart, { passive: true });
  el.addEventListener("touchmove", onPanelTouchMove, { passive: false });
}

function unbindPanelScrollLock() {
  const el = dialogRef.value;
  if (!el) return;
  el.removeEventListener("wheel", onPanelWheel);
  el.removeEventListener("touchstart", onPanelTouchStart);
  el.removeEventListener("touchmove", onPanelTouchMove);
}

/** Pace streamed text so it doesn't dump instantly. */
function createStreamPacer(
  onUpdate: (visible: string) => void,
  baseMs = 18,
) {
  let pending = "";
  let visible = "";
  let raf: number | null = null;
  let lastTs = 0;
  let drainWait: (() => void) | null = null;
  let scrollQueued = false;

  const queueScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      void scrollStreamIntoView();
    });
  };

  const tick = (ts: number) => {
    raf = null;
    if (!pending) {
      drainWait?.();
      drainWait = null;
      return;
    }
    if (!lastTs) lastTs = ts;
    const elapsed = ts - lastTs;
    // 积压越多越快吐字，空闲时略放慢更有「在写」感
    const backlog = Array.from(pending).length;
    const pace =
      backlog > 180 ? 6 : backlog > 90 ? 10 : backlog > 40 ? 14 : baseMs;
    if (elapsed < pace) {
      raf = requestAnimationFrame(tick);
      return;
    }
    lastTs = ts;
    const chars = Array.from(pending);
    const take =
      backlog > 200 ? 6 : backlog > 100 ? 3 : backlog > 40 ? 2 : 1;
    const chunk = chars.slice(0, take).join("");
    pending = chars.slice(take).join("");
    visible += chunk;
    onUpdate(visible);
    queueScroll();
    if (pending) raf = requestAnimationFrame(tick);
    else {
      drainWait?.();
      drainWait = null;
    }
  };

  const kick = () => {
    if (raf != null) return;
    raf = requestAnimationFrame(tick);
  };

  return {
    push(text: string) {
      if (!text) return;
      pending += text;
      kick();
    },
    async finish() {
      if (!pending && raf == null) return;
      await new Promise<void>((resolve) => {
        drainWait = resolve;
        kick();
      });
    },
    stop() {
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
      drainWait = null;
      pending = "";
      lastTs = 0;
    },
  };
}

async function ask(text: string, opts?: { fromChip?: boolean }) {
  const message = text.trim();
  if (!message || loading.value) return;
  error.value = "";
  preferTurnPin = false;
  markOnboarded();

  const pathSec = pathOnly.value.split("/").filter(Boolean)[0] || "home";
  const qShort = message.slice(0, 80);
  if (opts?.fromChip) {
    trackAssistant("assistant_followup", { q: qShort, path: pathSec });
  } else {
    trackAssistant("assistant_ask", { q: qShort, path: pathSec });
  }
  if (isReadingPathQuestion(message)) {
    trackAssistant("assistant_path", { q: qShort, path: pathSec, mode: "path" });
  }

  // 本页目录：本地列出，可点章节名继续「跳到…」
  if (/本页(有哪些)?(章节|目录)|有哪些章节|目录有哪些|章节列表/.test(message)) {
    const headings = listPageHeadings();
    messages.value.push({ role: "user", content: message });
    input.value = "";
    pageSwitchHint.value = "";
    const answer = headings.length
      ? [
          "本页章节：",
          ...headings.map(
            (h) => `${h.level === 2 ? "-" : "  -"} ${h.text}`,
          ),
          "",
          "想跳转可以说「跳到某某」或「讲到某某的那段」。",
        ].join("\n")
      : "当前页没有识别到章节标题（需要正文里的 h2/h3）。";
    messages.value.push({ role: "assistant", content: answer, sources: [] });
    persistSession();
    await scrollLatestTurnIntoView();
    return;
  }

  // 跳转到本页某节：优先本地滚动，失败再走 LLM
  if (/跳到|讲到|滚到|定位到/.test(message)) {
    const jumped = jumpToHeadingByQuery(message);
    if (jumped) {
      messages.value.push({ role: "user", content: message });
      input.value = "";
      pageSwitchHint.value = "";
      messages.value.push({
        role: "assistant",
        content: `已跳到本页「${jumped}」。若要我解释这一节，可以说「解释这一节」或选中段落后点解释。`,
        sources: [],
      });
      persistSession();
      trackAssistant("assistant_jump", { q: qShort, path: pathSec });
      await scrollLatestTurnIntoView();
      return;
    }
  }

  // 「本页」/选中解释/对比/代码：不带上文，避免串题
  const aboutCurrentPage =
    /本页|这页|当前页|这一页|本篇|这篇文章|这篇/.test(message);
  const specialTurn =
    aboutCurrentPage ||
    /解释我选中|选中的这段|解释这段代码|解释本页主要代码|对比|比较|有什么区别|今日要点/.test(
      message,
    );
  const history = specialTurn
    ? []
    : messages.value
        .filter((m) => m.content.trim())
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content.slice(0, 800),
        }));

  messages.value.push({ role: "user", content: message });
  input.value = "";
  pageSwitchHint.value = "";
  loading.value = true;

  const assistantIdx = messages.value.length;
  messages.value.push({ role: "assistant", content: "", sources: [] });
  await scrollPendingTurnIntoView();

  askAbort?.abort();
  askAbort = new AbortController();
  const signal = askAbort.signal;

  const pacer = createStreamPacer((visible) => {
    const prev = messages.value[assistantIdx];
    messages.value[assistantIdx] = {
      ...prev,
      content: visible,
    };
  }, 18);
  activePacer = pacer;

  try {
    const res = await fetch(endpoint("/api/assistant/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message,
        history,
        stream: true,
        page: pageContext(),
      }),
      signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        if (data.scope === "daily") {
          throw new Error(data.message || "今日提问次数已用完，明天再来吧");
        }
        throw new Error(
          data.message ||
            `提问太频繁，请 ${data.retryAfterSec || 60} 秒后再试`,
        );
      }
      throw new Error(data.message || data.error || `请求失败 (${res.status})`);
    }

    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/event-stream") || !res.body) {
      const data = await res.json().catch(() => ({}));
      pacer.stop();
      messages.value[assistantIdx] = {
        role: "assistant",
        content: String(data.answer || ""),
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let sawError = "";

    while (true) {
      if (signal.aborted) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        break;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";

      for (const chunk of chunks) {
        const lines = chunk.split("\n");
        let event = "message";
        let dataLine = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        if (!dataLine) continue;
        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (event === "meta") {
          const sources = Array.isArray(data.sources)
            ? (data.sources as ChatMsg["sources"])
            : [];
          messages.value[assistantIdx] = {
            ...messages.value[assistantIdx],
            sources,
          };
        } else if (event === "delta") {
          const piece = String(data.text || "");
          if (piece) pacer.push(piece);
        } else if (event === "error") {
          sawError = String(data.message || "stream error");
        }
      }
    }

    if (!signal.aborted) await pacer.finish();
    else pacer.stop();

    if (sawError && !messages.value[assistantIdx]?.content) {
      throw new Error(sawError);
    }
    if (sawError && messages.value[assistantIdx]?.content) {
      error.value = sawError;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      const prev = messages.value[assistantIdx];
      if (prev && !prev.content.trim()) {
        messages.value[assistantIdx] = {
          ...prev,
          content: "（已停止生成）",
        };
      }
    } else {
      pacer.stop();
      error.value = err instanceof Error ? err.message : String(err);
      const prev = messages.value[assistantIdx];
      if (!prev?.content) {
        messages.value[assistantIdx] = {
          role: "assistant",
          content: `暂时没法回答：${error.value}`,
        };
      }
    }
  } finally {
    activePacer = null;
    askAbort = null;
    // 先禁止流式跟滚，再结束 loading（插入继续问），最后强制滚回本轮提问
    preferTurnPin = true;
    loading.value = false;
    persistSession();
    await scrollLatestTurnIntoView();
  }
}

function onSubmit(e: Event) {
  e.preventDefault();
  void ask(input.value);
}

function resizeInput() {
  const el = inputRef.value;
  if (!el) return;
  // 先塌到 0 再量内容高，避免被当前 height 限制导致 scrollHeight 偏小
  el.style.height = "0px";
  const cs = getComputedStyle(el);
  const min = Number.parseFloat(cs.minHeight) || 0;
  const max = Number.parseFloat(cs.maxHeight) || Number.POSITIVE_INFINITY;
  const next = Math.max(min, Math.min(el.scrollHeight, max));
  el.style.height = `${next}px`;
  // 超过 5 行后靠 overflow 滚动；显式保持可滚（不隐藏 overflow）
  el.style.overflowY = "auto";
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
  e.preventDefault();
  if (loading.value) return;
  void ask(input.value);
}

watch(input, () => {
  void nextTick(resizeInput);
});

const MOBILE_MQ = "(max-width: 767px)";
const isMobileUi = ref(false);
let mobileMq: MediaQueryList | null = null;

function syncMobileUi() {
  if (typeof window === "undefined") return;
  isMobileUi.value = window.matchMedia(MOBILE_MQ).matches;
}

function onMobileMqChange() {
  syncMobileUi();
}

function closePanel() {
  if (!open.value) return;
  confirmDialog.value = null;
  open.value = false;
  if (listening.value) {
    try {
      speechRec?.stop();
    } catch {
      /* ignore */
    }
    listening.value = false;
  }
}

/** 全屏/移动端：点弹窗/FAB 以外关闭 */
function onDocPointerDownOutside(e: PointerEvent) {
  if (!open.value) return;
  if (!panelExpanded.value && !isMobileUi.value) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest(".penn-assistant-panel, .penn-assistant-fab, .penn-assistant-scrim")) {
    return;
  }
  closePanel();
}

function toggle() {
  const next = !open.value;
  if (!next) {
    closePanel();
    return;
  }
  open.value = true;
  if (firstVisit.value && !messages.value.length) {
    showOnboard.value = true;
  }
  trackAssistant("assistant_open", {
    path: pathOnly.value.split("/").filter(Boolean)[0] || "home",
    onboard: showOnboard.value ? 1 : 0,
  });
  if (!isMobileUi.value) {
    void nextTick(() => inputRef.value?.focus());
  }
}

function togglePanelExpanded() {
  panelExpanded.value = !panelExpanded.value;
  savePanelExpanded();
}

function loadPanelExpanded() {
  try {
    const raw = localStorage.getItem(PANEL_EXPANDED_KEY);
    if (raw === "0") panelExpanded.value = false;
    else panelExpanded.value = true;
  } catch {
    panelExpanded.value = true;
  }
}

function savePanelExpanded() {
  try {
    localStorage.setItem(PANEL_EXPANDED_KEY, panelExpanded.value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function onDocKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (confirmDialog.value) {
      e.preventDefault();
      cancelConfirm();
      return;
    }
    if (open.value) {
      closePanel();
      return;
    }
  }
  // ⌘/Ctrl + Shift + L：开关导读
  if (
    (e.key === "l" || e.key === "L") &&
    (e.metaKey || e.ctrlKey) &&
    e.shiftKey &&
    !e.altKey
  ) {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.("textarea, input, [contenteditable=true]")) return;
    e.preventDefault();
    toggle();
  }
}

const panelMaxH = ref(720);
const PANEL_MAX = 720;

function updatePanelMaxH() {
  if (typeof window === "undefined") return;
  if (panelExpanded.value) {
    panelMaxH.value = Math.floor(window.innerHeight * 0.92);
    return;
  }
  const isDesktop = window.matchMedia("(min-width: 768px)").matches;
  const idealMax = isDesktop ? PANEL_MAX : 600;
  panelMaxH.value =
    panelH.value > 0
      ? Math.min(panelH.value, idealMax)
      : Math.min(idealMax, Math.floor(window.innerHeight * 0.78));
}

const rootStyle = computed(() => {
  const panelVars = {
    "--penn-assistant-panel-max-h": `${panelMaxH.value}px`,
    "--penn-assistant-fs": String(fontScale.value),
    ...(panelW.value > 0 && !panelExpanded.value
      ? { "--penn-assistant-panel-w": `${panelW.value}px` }
      : {}),
  } as Record<string, string>;
  return panelVars;
});

function onWinResize() {
  syncMobileUi();
  updatePanelMaxH();
}

watch(
  () => route.path,
  (to, from) => {
    if (!from || to === from) return;
    if (!messages.value.length) {
      pageSwitchHint.value = "";
      return;
    }
    void nextTick(() => {
      const label = pageLabelShort.value || "当前页";
      pageSwitchHint.value = `已切换到《${label}》，可继续问或清空`;
      persistSession();
    });
  },
);

watch(
  () => messages.value.length,
  (len) => {
    if (!len) pageSwitchHint.value = "";
  },
);

watch([open, panelExpanded], () => {
  updatePanelMaxH();
  syncBodyScrollLock();
});

function syncBodyScrollLock() {
  if (typeof document === "undefined") return;
  const lock = open.value && panelExpanded.value;
  document.documentElement.classList.toggle("penn-assistant-scroll-lock", lock);
}

onMounted(() => {
  restoreSession();
  loadFontScale();
  loadPanelSize();
  loadPanelExpanded();
  initSpeech();
  updateReadingSection();
  try {
    firstVisit.value = !localStorage.getItem(ONBOARD_KEY);
  } catch {
    firstVisit.value = true;
  }
  syncMobileUi();
  mobileMq = window.matchMedia(MOBILE_MQ);
  mobileMq.addEventListener?.("change", onMobileMqChange);
  updatePanelMaxH();
  syncBodyScrollLock();
  document.addEventListener("keydown", onDocKey);
  document.addEventListener("pointerdown", onDocPointerDownOutside, true);
  document.addEventListener("mouseup", captureDocSelection);
  document.addEventListener("selectionchange", onSelectionChange);
  window.addEventListener("resize", onWinResize);
  window.addEventListener("scroll", updateReadingSection, { passive: true });
  void nextTick(() => {
    bindPanelScrollLock();
  });
});

onBeforeUnmount(() => {
  unbindPanelScrollLock();
  document.documentElement.classList.remove("penn-assistant-scroll-lock");
  mobileMq?.removeEventListener?.("change", onMobileMqChange);
  mobileMq = null;
  document.removeEventListener("keydown", onDocKey);
  document.removeEventListener("pointerdown", onDocPointerDownOutside, true);
  document.removeEventListener("mouseup", captureDocSelection);
  document.removeEventListener("selectionchange", onSelectionChange);
  if (selectionSyncTimer != null) clearTimeout(selectionSyncTimer);
  window.removeEventListener("resize", onWinResize);
  window.removeEventListener("scroll", updateReadingSection);
  try {
    speechRec?.stop();
  } catch {
    /* ignore */
  }
  askAbort?.abort();
});
</script>

<template>
  <div
    v-if="enabled"
    ref="panelRef"
    class="penn-assistant"
    :class="{ 'is-open': open, 'is-expanded': panelExpanded }"
    :style="rootStyle"
  >
    <button
      v-if="open && panelExpanded"
      type="button"
      class="penn-assistant-scrim"
      :aria-label="`关闭${ASSISTANT_NAME}`"
      @click="closePanel"
      @wheel.prevent
      @touchmove.prevent
    />
    <div
      v-show="open"
      ref="dialogRef"
      class="penn-assistant-panel"
      :class="{ 'is-expanded': panelExpanded }"
      role="dialog"
      :aria-label="ASSISTANT_NAME"
    >
      <header class="penn-assistant-head">
        <div class="penn-assistant-brand">
          <span class="penn-assistant-mark" aria-hidden="true">
            <AssistantBrandIcon uid="pa-mark" :size="28" class="penn-assistant-mark-avatar" />
          </span>
          <div class="penn-assistant-brand-text">
            <p class="penn-assistant-title">{{ ASSISTANT_NAME }}</p>
            <p class="penn-assistant-sub">{{ ASSISTANT_TAGLINE }}</p>
          </div>
        </div>
        <div class="penn-assistant-head-actions">
          <div class="penn-assistant-font" role="group" aria-label="字号">
            <button
              type="button"
              class="penn-assistant-font-btn"
              aria-label="减小字号"
              title="减小字号"
              :disabled="fontScale <= FONT_STEPS[0]"
              @click="bumpFont(-1)"
            >
              A−
            </button>
            <button
              type="button"
              class="penn-assistant-font-btn"
              aria-label="增大字号"
              title="增大字号"
              :disabled="fontScale >= FONT_STEPS[FONT_STEPS.length - 1]"
              @click="bumpFont(1)"
            >
              A+
            </button>
          </div>
          <button
            v-if="messages.length"
            type="button"
            class="penn-assistant-clear"
            :disabled="loading"
            @click="shareConversation"
          >
            {{ sharedHint ? "已复制" : "分享" }}
          </button>
          <button
            v-if="messages.length"
            type="button"
            class="penn-assistant-clear"
            :disabled="loading"
            @click="clearChat()"
          >
            清空
          </button>
          <button
            type="button"
            class="penn-assistant-expand"
            :aria-label="panelExpanded ? '退出全屏' : '全屏'"
            :title="panelExpanded ? '退出全屏' : '全屏'"
            @click="togglePanelExpanded"
          >
            <svg
              v-if="panelExpanded"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                d="M9 3.8H3.8V9M15 3.8h5.2V9M9 20.2H3.8V15M15 20.2h5.2V15"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                d="M14.5 3.8H20.2V9.5M9.5 3.8H3.8V9.5M14.5 20.2H20.2V14.5M9.5 20.2H3.8V14.5"
              />
            </svg>
          </button>
          <button type="button" class="penn-assistant-close" aria-label="关闭" @click="closePanel">
            ×
          </button>
        </div>
      </header>
      <div
        v-if="
          pageSwitchHint ||
          pageLabelShort ||
          selectionPreview ||
          (readingSection && open)
        "
        class="penn-assistant-context"
      >
        <div class="penn-assistant-context-card">
          <p
            v-if="pageSwitchHint"
            class="penn-assistant-pagechip penn-assistant-pagechip--switch"
            :title="pageSwitchHint"
          >
            {{
              readingSection || selectionPreview
                ? "已切换页面"
                : `已切换 · ${pageLabelShort}`
            }}
          </p>
          <p
            v-else-if="pageLabelShort && (panelExpanded || !readingSection)"
            class="penn-assistant-pagechip"
            :title="page.title || pageLabelShort"
          >
            当前：{{ pageLabelShort }}
          </p>
          <p v-if="selectionPreview" class="penn-assistant-selchip">
            <span class="penn-assistant-selchip-label">{{ selectionChipLabel }}</span>
            <span class="penn-assistant-selchip-text" :title="selectionText">{{
              selectionPreview
            }}</span>
            <button
              type="button"
              class="penn-assistant-selchip-ask"
              :disabled="loading"
              @click="
                ask(
                  selectionIsCode ? '解释这段代码' : '解释我选中的这段',
                  { fromChip: true },
                )
              "
            >
              解释
            </button>
            <button
              type="button"
              class="penn-assistant-selchip-clear"
              aria-label="清除选中"
              @click="clearSelectionChip"
            >
              ×
            </button>
          </p>
          <p
            v-else-if="readingSection && open"
            class="penn-assistant-selchip penn-assistant-selchip--section"
          >
            <span class="penn-assistant-selchip-label">在看</span>
            <span class="penn-assistant-selchip-text" :title="readingSection">{{
              readingSection.length > 24
                ? `${readingSection.slice(0, 24)}…`
                : readingSection
            }}</span>
            <button
              type="button"
              class="penn-assistant-selchip-ask"
              :disabled="loading"
              @click="askSummarizeSection"
            >
              总结这节
            </button>
          </p>
        </div>
      </div>

      <div ref="listRef" class="penn-assistant-messages">
        <div v-if="!messages.length" class="penn-assistant-empty">
          <p class="penn-assistant-empty-lead">
            {{
              showOnboard
                ? "第一次用？先从下面几问摸清本站。"
                : "想快速摸清本站，或弄懂当前这篇？先试下面几问。"
            }}
          </p>
          <div class="penn-assistant-chips">
            <button
              v-for="(q, qi) in quickPrompts"
              :key="q"
              type="button"
              class="penn-assistant-chip penn-assistant-chip--prompt"
              :disabled="loading"
              @click="ask(q, { fromChip: true })"
            >
              <span class="penn-assistant-chip-index" aria-hidden="true">{{
                String(qi + 1).padStart(2, "0")
              }}</span>
              <span class="penn-assistant-chip-text">{{ q }}</span>
              <span class="penn-assistant-chip-go" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                  <path
                    d="M3.5 8h9M8.5 4l4 4-4 4"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>

        <div
          v-for="(m, i) in messages"
          :key="i"
          class="penn-assistant-msg"
          :data-role="m.role"
          :class="{
            'is-streaming':
              loading && i === messages.length - 1 && m.role === 'assistant',
          }"
        >
          <div
            v-if="m.role === 'assistant'"
            class="penn-assistant-bubble penn-assistant-bubble--md"
            :class="{
              'is-streaming':
                loading && i === messages.length - 1,
              'is-waiting':
                loading &&
                i === messages.length - 1 &&
                !m.content.trim(),
            }"
          >
            <span
              v-if="
                loading &&
                i === messages.length - 1 &&
                !m.content.trim()
              "
              class="penn-assistant-waiting"
            >
              <span class="penn-assistant-dots" aria-hidden="true"
                ><i /><i /><i
              /></span>
              读取文章
            </span>
            <div
              v-else-if="loading && i === messages.length - 1"
              class="penn-assistant-md penn-assistant-md--live"
            >
              <span v-html="renderStreamingHtml(m.content)" /><span
                class="penn-assistant-caret"
                aria-hidden="true"
              />
            </div>
            <div
              v-else
              class="penn-assistant-md"
              v-html="renderAssistantHtml(m.content, m.sources)"
            />
          </div>
          <div v-else class="penn-assistant-bubble">{{ m.content }}</div>
          <div
            v-if="
              m.role === 'assistant' &&
              m.content.trim() &&
              !(loading && i === messages.length - 1)
            "
            class="penn-assistant-msg-actions"
          >
            <button
              type="button"
              class="penn-assistant-act"
              :class="{ 'is-done': copiedIdx === i }"
              aria-label="复制回答"
              :title="copiedIdx === i ? '已复制' : '复制'"
              @click="copyAnswer(i)"
            >
              <svg v-if="copiedIdx !== i" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8 8.5h9.5v11H8z" />
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6.5 15.5H5A1.5 1.5 0 0 1 3.5 14V5A1.5 1.5 0 0 1 5 3.5h9A1.5 1.5 0 0 1 15.5 5v1.5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5L20 7" />
              </svg>
            </button>
            <button
              type="button"
              class="penn-assistant-act"
              :class="{ 'is-done': exportedIdx === i }"
              aria-label="导出分享卡片"
              :title="exportedIdx === i ? '已下载卡片图' : '导出卡片图（发群/周报）'"
              @click="exportAnswerCard(i)"
            >
              <svg v-if="exportedIdx !== i" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <rect x="4" y="5" width="16" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 10h8M8 13.5h5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m5 12 5 5L20 7" />
              </svg>
            </button>
            <button
              v-if="!m.feedback"
              type="button"
              class="penn-assistant-act"
              aria-label="有用"
              title="有用"
              @click="sendFeedback(i, 'up')"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 11v8.5H5A1.5 1.5 0 0 1 3.5 18v-5.5A1.5 1.5 0 0 1 5 11h2.5Zm0 0 3-6.5a2 2 0 0 1 2-.8h.2a2.2 2.2 0 0 1 2.1 2.7L14.2 11H19a2 2 0 0 1 1.9 2.6l-1.2 4A2.5 2.5 0 0 1 17.3 19.5H7.5" />
              </svg>
            </button>
            <button
              v-if="!m.feedback"
              type="button"
              class="penn-assistant-act"
              aria-label="不准"
              title="不准"
              @click="onFeedbackDown(i)"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 13V4.5H5A1.5 1.5 0 0 0 3.5 6v5.5A1.5 1.5 0 0 0 5 13h2.5Zm0 0 3 6.5a2 2 0 0 0 2 .8h.2a2.2 2.2 0 0 0 2.1-2.7L14.2 13H19a2 2 0 0 0 1.9-2.6l-1.2-4A2.5 2.5 0 0 0 17.3 4.5H7.5" />
              </svg>
            </button>
            <span v-else class="penn-assistant-feedback-done" :title="m.feedback === 'up' ? '已标有用' : '已标不准'">
              <svg v-if="m.feedback === 'up'" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 11v8.5H5A1.5 1.5 0 0 1 3.5 18v-5.5A1.5 1.5 0 0 1 5 11h2.5Zm0 0 3-6.5a2 2 0 0 1 2-.8h.2a2.2 2.2 0 0 1 2.1 2.7L14.2 11H19a2 2 0 0 1 1.9 2.6l-1.2 4A2.5 2.5 0 0 1 17.3 19.5H7.5" />
              </svg>
              <svg v-else viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M7.5 13V4.5H5A1.5 1.5 0 0 0 3.5 6v5.5A1.5 1.5 0 0 0 5 13h2.5Zm0 0 3 6.5a2 2 0 0 0 2 .8h.2a2.2 2.2 0 0 0 2.1-2.7L14.2 13H19a2 2 0 0 0 1.9-2.6l-1.2-4A2.5 2.5 0 0 0 17.3 4.5H7.5" />
              </svg>
            </span>
          </div>
          <div
            v-if="feedbackFor === i"
            class="penn-assistant-feedback-box"
          >
            <input
              v-model="feedbackReason"
              class="penn-assistant-feedback-input"
              type="text"
              maxlength="80"
              placeholder="哪里不准？（可选）"
              @keydown.enter.prevent="submitFeedbackDown(i)"
            />
            <button
              type="button"
              class="penn-assistant-feedback-submit"
              @click="submitFeedbackDown(i)"
            >
              提交
            </button>
          </div>
          <div
            v-if="
              m.role === 'assistant' &&
              m.content.trim() &&
              !(loading && i === messages.length - 1) &&
              matchedHeadingsInAnswer(m.content).length
            "
            class="penn-assistant-jump-row"
          >
            <button
              v-for="h in matchedHeadingsInAnswer(m.content)"
              :key="h.id"
              type="button"
              class="penn-assistant-jump-chip"
              :title="`滚到正文：${h.text}`"
              @click="scrollToHeading(h)"
            >
              滚到 {{ h.text.length > 12 ? `${h.text.slice(0, 12)}…` : h.text }}
            </button>
          </div>
          <details
            v-if="m.sources?.length && !(loading && i === messages.length - 1)"
            class="penn-assistant-sources-wrap"
            open
          >
            <summary class="penn-assistant-sources-summary">
              参考 {{ Math.min(m.sources.length, 3) }} 篇
            </summary>
            <ul class="penn-assistant-sources">
              <li
                v-for="s in m.sources.slice(0, 3)"
                :key="s.link"
                class="penn-assistant-source-row"
              >
                <div class="penn-assistant-source-main">
                  <a
                    class="penn-assistant-source-title"
                    :href="withSiteBase(s.link)"
                    >{{ s.title }}</a
                  >
                  <span v-if="s.sectionLabel" class="penn-assistant-source-tag">{{
                    s.sectionLabel
                  }}</span>
                  <button
                    type="button"
                    class="penn-assistant-source-open"
                    aria-label="打开参考文章"
                    title="打开"
                    @click.prevent="openSource(s.link)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7 17 17 7M10 7h7v7"
                      />
                    </svg>
                  </button>
                </div>
                <p v-if="s.summary" class="penn-assistant-source-desc">
                  {{ s.summary }}
                </p>
              </li>
            </ul>
          </details>
        </div>

        <div v-if="followUpPrompts.length" class="penn-assistant-followups">
          <div class="penn-assistant-followups-head">
            <span class="penn-assistant-followups-badge" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path
                  d="M3.2 8h9.6M8 3.2v9.6"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <p class="penn-assistant-followups-label">{{ followUpsLabel }}</p>
          </div>
          <div class="penn-assistant-chips penn-assistant-chips--follow">
            <button
              v-for="q in followUpPrompts"
              :key="q"
              type="button"
              class="penn-assistant-chip penn-assistant-chip--follow"
              :disabled="loading"
              @click="ask(q, { fromChip: true })"
            >
              <span class="penn-assistant-chip-mark" aria-hidden="true" />
              <span class="penn-assistant-chip-text">{{ q }}</span>
              <span class="penn-assistant-chip-go" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                  <path
                    d="M3.5 8h9M8.5 4l4 4-4 4"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

      <form
        class="penn-assistant-form"
        :class="{ 'is-answering': loading }"
        @submit="onSubmit"
      >
        <textarea
          ref="inputRef"
          v-model="input"
          class="penn-assistant-input"
          rows="3"
          maxlength="500"
          :placeholder="
            listening
              ? '正在听，再说一次或点停止…'
              : '输入你想问的问题…'
          "
          :disabled="loading"
          enterkeyhint="send"
          title="Enter 发送，Shift+Enter 换行"
          @keydown="onInputKeydown"
          @input="resizeInput"
        />
        <button
          v-if="voiceSupported"
          type="button"
          class="penn-assistant-voice"
          :class="{ 'is-on': listening }"
          :disabled="loading"
          :aria-label="listening ? '停止语音' : '语音输入'"
          :title="listening ? '停止录音' : '语音输入'"
          @click="toggleVoice"
        >
          <span v-if="listening" class="penn-assistant-voice-rings" aria-hidden="true">
            <i /><i />
          </span>
          <!-- 录音中：声纹，比方块更像「正在听」 -->
          <svg
            v-if="listening"
            class="penn-assistant-voice-wave"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <rect class="penn-assistant-voice-bar" x="5" y="8" width="2.5" height="8" rx="1.25" />
            <rect class="penn-assistant-voice-bar" x="10.75" y="5" width="2.5" height="14" rx="1.25" />
            <rect class="penn-assistant-voice-bar" x="16.5" y="7" width="2.5" height="10" rx="1.25" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z"
            />
          </svg>
        </button>
        <button
          v-if="loading"
          class="penn-assistant-stop"
          type="button"
          aria-label="停止生成"
          title="停止"
          @click="stopGenerate"
        >
          <svg
            class="penn-assistant-form-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />
          </svg>
        </button>
        <button
          v-else
          class="penn-assistant-send"
          type="submit"
          aria-label="发送"
          title="发送（Enter）"
          :disabled="!input.trim()"
        >
          <svg
            class="penn-assistant-form-icon"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M12 19.8a.9.9 0 0 1-.9-.9V7.94l-3.3 3.3a.9.9 0 1 1-1.28-1.27l4.84-4.84a.9.9 0 0 1 1.28 0l4.84 4.84a.9.9 0 1 1-1.28 1.27l-3.3-3.3V18.9a.9.9 0 0 1-.9.9Z"
            />
          </svg>
        </button>
      </form>
      <p class="penn-assistant-foot">AI 生成可能有误，注意核实</p>
      <div
        v-if="confirmDialog"
        class="penn-assistant-confirm"
        role="alertdialog"
        aria-modal="true"
        :aria-label="confirmDialog.title"
      >
        <button
          type="button"
          class="penn-assistant-confirm-scrim"
          aria-label="取消"
          @click="cancelConfirm"
        />
        <div class="penn-assistant-confirm-card">
          <p class="penn-assistant-confirm-title">{{ confirmDialog.title }}</p>
          <p v-if="confirmDialog.detail" class="penn-assistant-confirm-detail">
            {{ confirmDialog.detail }}
          </p>
          <div class="penn-assistant-confirm-actions">
            <button
              type="button"
              class="penn-assistant-confirm-btn"
              @click="cancelConfirm"
            >
              {{ confirmDialog.cancelLabel || "取消" }}
            </button>
            <button
              type="button"
              class="penn-assistant-confirm-btn"
              :class="{ 'is-danger': confirmDialog.danger }"
              @click="runConfirm"
            >
              {{ confirmDialog.confirmLabel || "确定" }}
            </button>
          </div>
        </div>
      </div>
      <button
        v-if="!panelExpanded"
        type="button"
        class="penn-assistant-resize"
        aria-label="拖拽调整大小"
        title="拖拽调整大小"
        @pointerdown="onResizePointerDown"
      />
    </div>

    <button
      type="button"
      class="penn-assistant-fab"
      :class="{ 'is-dismiss': open }"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="open ? `关闭${ASSISTANT_NAME}` : `打开${ASSISTANT_NAME}`"
      @click="toggle"
    >
      <span v-if="!open" class="penn-assistant-fab-tip" aria-hidden="true"
        >站内导读</span
      >
      <!-- 打开态：同家族收起标 -->
      <AssistantCloseIcon
        v-if="open"
        uid="pa-close"
        :size="40"
        class="penn-assistant-fab-icon penn-assistant-fab-icon--close"
      />
      <!-- 入口：AI 星芒导读标 -->
      <AssistantBrandIcon
        v-else
        uid="pa-fab"
        :size="40"
        class="penn-assistant-fab-icon penn-assistant-fab-icon--avatar"
      />
    </button>
  </div>
</template>
