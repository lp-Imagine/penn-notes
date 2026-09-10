/** 本地搜索：栏目筛选 + 弹层壳文案（占位 / 快捷键）按 UI 偏好刷新 */

import type { MessageTree } from "../i18n/types";

export type SearchFilterLabels = {
  ariaLabel: string;
  all: string;
  notes: string;
  news: string;
  empty: string;
};

export type SearchModalLabels = MessageTree["search"];

export type SearchEnhanceLabels = {
  filter: SearchFilterLabels;
  modal: SearchModalLabels;
};

type FilterId = "all" | "notes" | "news";

type FilterDef = {
  id: FilterId;
  labelKey: keyof Pick<SearchFilterLabels, "all" | "notes" | "news">;
  match: (href: string) => boolean;
};

const FILTERS: FilterDef[] = [
  {
    id: "all",
    labelKey: "all",
    match: () => true,
  },
  {
    id: "notes",
    labelKey: "notes",
    match: (href: string) =>
      /\/(web|ui|engineering|backend|tech|agent|computer|misc|sync)\//.test(
        href,
      ),
  },
  {
    id: "news",
    labelKey: "news",
    match: (href: string) => href.includes("/news/"),
  },
];

/** 未注入 locale 时的兜底（与 messages.zh-CN 对齐） */
const DEFAULT_FILTER: SearchFilterLabels = {
  ariaLabel: "按栏目筛选搜索结果",
  all: "全部",
  notes: "笔记",
  news: "AI 动态",
  empty: "当前筛选下没有结果，试试「全部」或其它栏目",
};

const DEFAULT_MODAL: SearchModalLabels = {
  buttonText: "搜索笔记 / 动态",
  buttonAriaLabel: "搜索笔记与 AI 动态",
  displayDetails: "显示正文摘要",
  resetButtonTitle: "清除",
  backButtonTitle: "关闭",
  noResultsText: "未找到与",
  selectText: "选择",
  selectKeyAriaLabel: "回车键",
  navigateText: "移动",
  navigateUpKeyAriaLabel: "上方向键",
  navigateDownKeyAriaLabel: "下方向键",
  closeText: "关闭",
  closeKeyAriaLabel: "Esc 键",
};

let labelsGetter: () => SearchEnhanceLabels = () => ({
  filter: DEFAULT_FILTER,
  modal: DEFAULT_MODAL,
});
let active: FilterId = "all";
let boxObserver: MutationObserver | undefined;
let resultsObserver: MutationObserver | undefined;
let boundBox: HTMLElement | null = null;
/** 同步文案 / 插入筛选条时忽略 observer，避免 textContent 改写触发死循环卡死页面 */
let syncing = false;

function labels(): SearchEnhanceLabels {
  return labelsGetter() || { filter: DEFAULT_FILTER, modal: DEFAULT_MODAL };
}

function applyFilter(box: HTMLElement) {
  const items = box.querySelectorAll<HTMLElement>(".results > li");
  const filter = FILTERS.find((f) => f.id === active) || FILTERS[0];
  let visible = 0;
  items.forEach((li) => {
    if (li.classList.contains("no-results")) {
      li.hidden = false;
      return;
    }
    const href = li.querySelector("a.result")?.getAttribute("href") || "";
    const show = filter.match(href);
    li.hidden = !show;
    if (show) visible += 1;
  });

  const empty = box.querySelector<HTMLElement>(".penn-search-filter-empty");
  if (empty) {
    empty.hidden = !(active !== "all" && visible === 0 && items.length > 0);
  }
}

function syncChips(bar: HTMLElement) {
  bar.querySelectorAll<HTMLButtonElement>(".penn-search-chip").forEach((btn) => {
    const id = btn.dataset.filter as FilterId;
    btn.classList.toggle("is-active", id === active);
    btn.setAttribute("aria-pressed", id === active ? "true" : "false");
  });
}

function setTextIfChanged(el: HTMLElement | null, text: string) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
}

function setAttrIfChanged(el: HTMLElement | null, attr: string, value: string) {
  if (!el || el.getAttribute(attr) === value) return;
  el.setAttribute(attr, value);
}

/** 保留 span 内 kbd，只改末尾说明文字 */
function setTrailingText(span: HTMLElement, text: string) {
  let textNode: Text | null = null;
  for (const n of span.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) textNode = n as Text;
  }
  const next = ` ${text}`;
  if (textNode) {
    if ((textNode.textContent || "").trim() === text) return;
    textNode.textContent = next;
    return;
  }
  span.appendChild(document.createTextNode(next));
}

/** VitePress 弹层文案构建期写死简体，theme 原地改不触发重绘，打开后直接刷 DOM */
function syncModalChrome(box: HTMLElement) {
  const s = labels().modal;
  syncing = true;
  try {
    const input = box.querySelector<HTMLInputElement>(".search-input");
    if (input && input.placeholder !== s.buttonText) {
      input.placeholder = s.buttonText;
    }

    const details = box.querySelector<HTMLElement>(".toggle-layout-button");
    setAttrIfChanged(details, "title", s.displayDetails);

    const reset = box.querySelector<HTMLElement>(".clear-button");
    setAttrIfChanged(reset, "title", s.resetButtonTitle);

    const back = box.querySelector<HTMLElement>("button.back-button, .back-button");
    setAttrIfChanged(back, "title", s.backButtonTitle);

    const shortcuts = box.querySelectorAll<HTMLElement>(
      ".search-keyboard-shortcuts > span",
    );
    if (shortcuts[0]) {
      const kbds = shortcuts[0].querySelectorAll("kbd");
      setAttrIfChanged(kbds[0] || null, "aria-label", s.navigateUpKeyAriaLabel);
      setAttrIfChanged(kbds[1] || null, "aria-label", s.navigateDownKeyAriaLabel);
      setTrailingText(shortcuts[0], s.navigateText);
    }
    if (shortcuts[1]) {
      const kbd = shortcuts[1].querySelector("kbd");
      setAttrIfChanged(kbd, "aria-label", s.selectKeyAriaLabel);
      setTrailingText(shortcuts[1], s.selectText);
    }
    if (shortcuts[2]) {
      const kbd = shortcuts[2].querySelector("kbd");
      setAttrIfChanged(kbd, "aria-label", s.closeKeyAriaLabel);
      setTrailingText(shortcuts[2], s.closeText);
    }

    const noResults = box.querySelector<HTMLElement>(".results > li.no-results");
    if (noResults) {
      const strong = noResults.querySelector("strong");
      const query = strong?.textContent ?? "";
      const desired = `${s.noResultsText} "`;
      // 结构：前缀 + <strong>query</strong> + 可选收尾引号
      let prefixNode: Text | null = null;
      for (const n of noResults.childNodes) {
        if (n.nodeType === Node.TEXT_NODE) {
          prefixNode = n as Text;
          break;
        }
      }
      if (prefixNode && (prefixNode.textContent || "").trimStart() !== desired.trimStart()) {
        prefixNode.textContent = desired;
      } else if (!prefixNode && strong) {
        noResults.insertBefore(document.createTextNode(desired), strong);
      }
      // 保证 strong 后有收尾引号
      if (strong?.nextSibling?.nodeType === Node.TEXT_NODE) {
        const tail = strong.nextSibling as Text;
        if ((tail.textContent || "").trim() !== '"') tail.textContent = '"';
      } else if (strong && query) {
        strong.after(document.createTextNode('"'));
      }
    }
  } finally {
    syncing = false;
  }
}

function syncFilterLabels(box: HTMLElement) {
  const L = labels().filter;
  syncing = true;
  try {
    const bar = box.querySelector<HTMLElement>(".penn-search-filter");
    if (bar) {
      bar.setAttribute("aria-label", L.ariaLabel);
      bar.querySelectorAll<HTMLButtonElement>(".penn-search-chip").forEach((btn) => {
        const id = btn.dataset.filter as FilterId;
        const def = FILTERS.find((f) => f.id === id);
        if (def) setTextIfChanged(btn, L[def.labelKey]);
      });
    }
    const empty = box.querySelector<HTMLElement>(".penn-search-filter-empty");
    setTextIfChanged(empty, L.empty);
  } finally {
    syncing = false;
  }
}

function ensureFilterUi(box: HTMLElement) {
  const existing = box.querySelector<HTMLElement>(".penn-search-filter");
  if (existing) {
    syncFilterLabels(box);
    return;
  }

  const form = box.querySelector(".search-bar");
  if (!form?.parentElement) return;

  const L = labels().filter;
  syncing = true;
  try {
    const bar = document.createElement("div");
    bar.className = "penn-search-filter";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", L.ariaLabel);

    for (const f of FILTERS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "penn-search-chip";
      btn.dataset.filter = f.id;
      btn.textContent = L[f.labelKey];
      btn.setAttribute("aria-pressed", f.id === active ? "true" : "false");
      if (f.id === active) btn.classList.add("is-active");
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        active = f.id;
        syncChips(bar);
        applyFilter(box);
      });
      bar.appendChild(btn);
    }

    const empty = document.createElement("p");
    empty.className = "penn-search-filter-empty";
    empty.hidden = true;
    empty.textContent = L.empty;

    form.insertAdjacentElement("afterend", bar);
    bar.insertAdjacentElement("afterend", empty);
  } finally {
    syncing = false;
  }
}

function paintBox(box: HTMLElement) {
  ensureFilterUi(box);
  syncModalChrome(box);
  applyFilter(box);
}

function bindBox(box: HTMLElement) {
  if (boundBox === box) {
    paintBox(box);
    return;
  }

  resultsObserver?.disconnect();
  boundBox = box;
  paintBox(box);

  const results = box.querySelector(".results");
  if (results) {
    resultsObserver = new MutationObserver(() => {
      if (syncing) return;
      applyFilter(box);
      // 结果区重绘可能把 no-results / 壳文案冲回构建期简体
      syncModalChrome(box);
    });
    resultsObserver.observe(results, { childList: true, subtree: true });
  }
}

function clearBoundBox() {
  resultsObserver?.disconnect();
  resultsObserver = undefined;
  boundBox = null;
}

function scan() {
  if (syncing) return;
  const box = document.querySelector<HTMLElement>(".VPLocalSearchBox");
  if (box) bindBox(box);
  else if (boundBox) clearBoundBox();
}

function normalizeGetter(
  getLabels?: () => SearchEnhanceLabels | SearchFilterLabels,
): (() => SearchEnhanceLabels) | undefined {
  if (!getLabels) return undefined;
  return () => {
    const raw = getLabels();
    if (raw && typeof raw === "object" && "filter" in raw && "modal" in raw) {
      return raw as SearchEnhanceLabels;
    }
    return {
      filter: (raw as SearchFilterLabels) || DEFAULT_FILTER,
      modal: DEFAULT_MODAL,
    };
  };
}

export function setupSearchEnhance(
  getLabels?: () => SearchEnhanceLabels | SearchFilterLabels,
) {
  const normalized = normalizeGetter(getLabels);
  if (normalized) labelsGetter = normalized;
  scan();
  if (boxObserver) return;
  boxObserver = new MutationObserver(() => {
    if (syncing) return;
    scan();
  });
  // 只盯 body 直接子节点：Teleport 挂/卸搜索层；勿用 subtree，否则改 chip 文案会递归触发
  boxObserver.observe(document.body, { childList: true });
}

export function teardownSearchEnhance() {
  boxObserver?.disconnect();
  clearBoundBox();
  boxObserver = undefined;
}

/** 切语言后刷新已打开搜索框内的筛选 + 弹层壳文案 */
export function refreshSearchEnhanceLabels() {
  if (!boundBox) return;
  syncFilterLabels(boundBox);
  syncModalChrome(boundBox);
}
