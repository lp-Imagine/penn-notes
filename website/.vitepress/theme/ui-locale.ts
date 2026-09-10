/**
 * UI 语言偏好：localStorage 为主，同步 cookie；与 URL 无关。
 */
import { ref } from "vue";
import type { UiLocale } from "../i18n/types";

export const UI_LOCALE_KEY = "penn-ui-locale";

export const uiLocaleRef = ref<UiLocale>("zh-CN");

function parseLocale(raw: string | null | undefined): UiLocale | null {
  if (!raw) return null;
  if (raw === "zh-CN" || raw === "zh-TW" || raw === "en") return raw;
  if (raw === "root") return "zh-CN";
  const lower = raw.toLowerCase();
  if (lower.startsWith("zh-tw") || lower.includes("hant")) return "zh-TW";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("zh")) return "zh-CN";
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const esc = name.replace(/([$()*+.?[\\\]^{|}])/g, "\\$1");
  const m = document.cookie.match(new RegExp(`(?:^|; )${esc}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getUiLocalePreference(): UiLocale {
  if (typeof window === "undefined") return "zh-CN";
  try {
    const fromLs = parseLocale(localStorage.getItem(UI_LOCALE_KEY));
    if (fromLs) return fromLs;
  } catch {
    // ignore
  }
  const fromCookie = parseLocale(readCookie(UI_LOCALE_KEY));
  if (fromCookie) return fromCookie;
  return "zh-CN";
}

export function syncDocumentLang(locale: UiLocale = getUiLocalePreference()) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "en" ? "en" : locale;
  document.documentElement.setAttribute("data-ui-locale", locale);
}

export function setUiLocalePreference(locale: UiLocale) {
  try {
    localStorage.setItem(UI_LOCALE_KEY, locale);
  } catch {
    // ignore
  }
  writeCookie(UI_LOCALE_KEY, locale);
  uiLocaleRef.value = locale;
  syncDocumentLang(locale);
}

/** 客户端启动时从存储灌入 ref + html lang */
export function initUiLocaleFromStorage(): UiLocale {
  const loc = getUiLocalePreference();
  uiLocaleRef.value = loc;
  syncDocumentLang(loc);
  return loc;
}
