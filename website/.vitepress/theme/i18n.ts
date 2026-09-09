import { computed } from "vue";
import { useData } from "vitepress";
import {
  dateLocaleForLang,
  getMessages,
  getUiText,
  resolveUiLocale,
  type MessageTree,
} from "../i18n/messages";
import type { LocaleKey, UiLocale } from "../i18n/types";

export { dateLocaleForLang, getUiText, resolveUiLocale };
export type { LocaleKey, MessageTree, UiLocale };

const LOCALE_PREFIX_RE = /^\/(en|zh-TW)(?=\/|$)/;

/** 去掉站点 base 后的路径 */
export function stripSiteBase(path: string, base = "/"): string {
  const b = (base || "/").replace(/\/$/, "");
  if (b && b !== "/" && path.startsWith(b)) {
    return path.slice(b.length) || "/";
  }
  return path || "/";
}

/** 去掉 /en、/zh-TW 前缀，得到简体站相对路径 */
export function stripLocalePrefix(path: string): string {
  const cleaned = path.replace(LOCALE_PREFIX_RE, "");
  return cleaned || "/";
}

export function detectLocaleKey(path: string): LocaleKey {
  if (path === "/en" || path.startsWith("/en/")) return "en";
  if (path === "/zh-TW" || path.startsWith("/zh-TW/")) return "zh-TW";
  return "root";
}

export function localeKeyToPrefix(key: LocaleKey): string {
  if (key === "en") return "/en";
  if (key === "zh-TW") return "/zh-TW";
  return "";
}

export function localeKeyToHome(key: LocaleKey): string {
  if (key === "en") return "/en/";
  if (key === "zh-TW") return "/zh-TW/";
  return "/";
}

/** 在三种 locale 前缀之间改写路径（不含 base） */
export function switchLocalePath(path: string, target: LocaleKey): string {
  const bare = stripLocalePrefix(path);
  const normalized =
    bare.endsWith("/index.html") ? bare.replace(/\/index\.html$/, "/") : bare;
  if (target === "root") return normalized || "/";
  const prefix = localeKeyToPrefix(target);
  if (!normalized || normalized === "/") return `${prefix}/`;
  return `${prefix}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

/** 给无 locale 前缀的站内链接加上当前语言前缀 */
export function withLocalePrefix(link: string, localeKey: LocaleKey): string {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return link;
  if (link.startsWith("/en/") || link === "/en") return link;
  if (link.startsWith("/zh-TW/") || link === "/zh-TW") return link;
  const prefix = localeKeyToPrefix(localeKey);
  if (!prefix) return link;
  return `${prefix}${link}`;
}

export function useI18n() {
  const { lang, site } = useData();

  const uiLocale = computed(() => resolveUiLocale(lang.value));
  const m = computed(() => getMessages(lang.value));
  const dateLocale = computed(() => dateLocaleForLang(lang.value));

  function t<K extends keyof MessageTree>(key: K): MessageTree[K] {
    return m.value[key];
  }

  function currentLocaleKeyFromPath(routePath: string): LocaleKey {
    return detectLocaleKey(stripSiteBase(routePath, site.value.base));
  }

  return {
    lang,
    uiLocale,
    dateLocale,
    messages: m,
    t,
    currentLocaleKeyFromPath,
  };
}
