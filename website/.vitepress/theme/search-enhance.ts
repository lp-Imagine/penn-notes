/** 本地搜索：按「全部 / 笔记 / AI 动态」筛选结果 */

export type SearchFilterLabels = {
  ariaLabel: string;
  all: string;
  notes: string;
  news: string;
  empty: string;
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

const DEFAULT_LABELS: SearchFilterLabels = {
  ariaLabel: "按栏目筛选搜索结果",
  all: "全部",
  notes: "笔记",
  news: "AI 动态",
  empty: "当前筛选下没有结果，试试「全部」或其它栏目",
};

let labelsGetter: () => SearchFilterLabels = () => DEFAULT_LABELS;
let active: FilterId = "all";
let boxObserver: MutationObserver | undefined;
let resultsObserver: MutationObserver | undefined;
let boundBox: HTMLElement | null = null;

function labels() {
  return labelsGetter() || DEFAULT_LABELS;
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

function syncFilterLabels(box: HTMLElement) {
  const L = labels();
  const bar = box.querySelector<HTMLElement>(".penn-search-filter");
  if (bar) {
    bar.setAttribute("aria-label", L.ariaLabel);
    bar.querySelectorAll<HTMLButtonElement>(".penn-search-chip").forEach((btn) => {
      const id = btn.dataset.filter as FilterId;
      const def = FILTERS.find((f) => f.id === id);
      if (def) btn.textContent = L[def.labelKey];
    });
  }
  const empty = box.querySelector<HTMLElement>(".penn-search-filter-empty");
  if (empty) empty.textContent = L.empty;
}

function ensureFilterUi(box: HTMLElement) {
  const existing = box.querySelector<HTMLElement>(".penn-search-filter");
  if (existing) {
    syncFilterLabels(box);
    return;
  }

  const form = box.querySelector(".search-bar");
  if (!form?.parentElement) return;

  const L = labels();
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
}

function bindBox(box: HTMLElement) {
  if (boundBox === box) {
    ensureFilterUi(box);
    applyFilter(box);
    return;
  }

  resultsObserver?.disconnect();
  boundBox = box;
  ensureFilterUi(box);
  applyFilter(box);

  const results = box.querySelector(".results");
  if (results) {
    resultsObserver = new MutationObserver(() => applyFilter(box));
    resultsObserver.observe(results, { childList: true, subtree: true });
  }
}

function scan() {
  const box = document.querySelector<HTMLElement>(".VPLocalSearchBox");
  if (box) bindBox(box);
}

export function setupSearchEnhance(getLabels?: () => SearchFilterLabels) {
  if (getLabels) labelsGetter = getLabels;
  scan();
  if (boxObserver) return;
  boxObserver = new MutationObserver(() => scan());
  boxObserver.observe(document.body, { childList: true, subtree: true });
}

export function teardownSearchEnhance() {
  boxObserver?.disconnect();
  resultsObserver?.disconnect();
  boxObserver = undefined;
  resultsObserver = undefined;
  boundBox = null;
}
