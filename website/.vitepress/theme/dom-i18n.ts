/**
 * 构建产物里的 data-i18n 壳层文案：按 UI 偏好刷新。
 * data-i18n="home.latestNotes"
 * data-i18n-args="12"  → 传给函数型文案
 * data-i18n-aria="home.browseAria" → 写 aria-label
 *
 * 另含：搜索按钮、日报栏目 H2 / 阅读原文 / 空栏目（无 data-i18n 的存量 HTML）。
 */
import { NEWS_SECTION_DATA } from "../i18n/page-messages";
import { getUiText } from "../i18n/messages";
import type { UiLocale } from "../i18n/types";
import { getUiLocalePreference } from "./ui-locale";

function lookup(path: string, locale: UiLocale): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = getUiText(locale);
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function formatValue(raw: unknown, argsAttr: string | null): string | null {
  if (typeof raw === "string") return raw;
  if (typeof raw === "function") {
    const args = (argsAttr || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const n = Number(s);
        return Number.isFinite(n) && String(n) === s ? n : s;
      });
    try {
      return String((raw as (...a: unknown[]) => unknown)(...args));
    } catch {
      return null;
    }
  }
  return null;
}

/** VitePress 本地搜索按钮：theme 原地改写不会触发重绘，直接刷 DOM */
function applySearchButtonI18n(locale: UiLocale) {
  const s = getUiText(locale).search;
  const placeholder = document.querySelector<HTMLElement>(
    ".DocSearch-Button-Placeholder",
  );
  if (placeholder) placeholder.textContent = s.buttonText;
  const btn = document.querySelector<HTMLElement>(".DocSearch-Button");
  if (btn) btn.setAttribute("aria-label", s.buttonAriaLabel);
}

const EMPTY_DAY_MARKERS = new Set([
  "（本日无新条目）",
  "（本日無新條目）",
  "(No new items today)",
]);

/** 日报正文壳：栏目名、阅读原文、空栏目文案 + 右侧大纲同步 */
function applyNewsDigestI18n(locale: UiLocale) {
  const news = getUiText(locale).news;
  const byZh = new Map<string, string>();
  for (const sec of NEWS_SECTION_DATA) {
    if (!sec.data) continue;
    byZh.set(sec.data, news.sections[sec.id]);
  }

  document.querySelectorAll<HTMLElement>(".news-section[data-section]").forEach((node) => {
    const zh = node.getAttribute("data-section") || "";
    const label = byZh.get(zh);
    if (label) {
      const h2 = node.querySelector<HTMLElement>("h2");
      if (h2) {
        h2.textContent = label;
        const id = h2.id;
        if (id) {
          document
            .querySelectorAll<HTMLAnchorElement>(
              ".VPDocAside a.outline-link, .VPDocOutline a.outline-link, a.outline-link",
            )
            .forEach((a) => {
              const href = a.getAttribute("href") || "";
              if (!href.startsWith("#")) return;
              let linkId = href.slice(1);
              try {
                linkId = decodeURIComponent(linkId);
              } catch {
                /* keep raw */
              }
              if (linkId === id) a.textContent = label;
            });
        }
      }
    }

    node.querySelectorAll("p").forEach((p) => {
      const text = (p.textContent || "").trim();
      if (
        EMPTY_DAY_MARKERS.has(text) ||
        text === news.emptyDay ||
        p.getAttribute("data-i18n") === "news.emptyDay"
      ) {
        p.textContent = news.emptyDay;
      }
    });
  });

  document.querySelectorAll<HTMLElement>(".news-entry-source a").forEach((a) => {
    a.textContent = news.readOriginal;
  });

  // 首页等静态卡片上的栏目 tag（数据仍是简体名）
  document
    .querySelectorAll<HTMLElement>(".news-section-tag[data-news-section]")
    .forEach((el) => {
      const zh = el.getAttribute("data-news-section") || "";
      const label = byZh.get(zh);
      if (label) el.textContent = label;
    });
}

export function applyDomI18n(locale: UiLocale = getUiLocalePreference()) {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const text = formatValue(lookup(key, locale), el.getAttribute("data-i18n-args"));
    if (text != null) el.textContent = text;
  });

  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (!key) return;
    const text = formatValue(lookup(key, locale), el.getAttribute("data-i18n-args"));
    if (text != null) el.setAttribute("aria-label", text);
  });

  applySearchButtonI18n(locale);
  applyNewsDigestI18n(locale);
}
