import { computed } from "vue";
import {
  dateLocaleForLang,
  getMessages,
  getUiText,
  resolveUiLocale,
  type MessageTree,
} from "../i18n/messages";
import type { UiLocale } from "../i18n/types";
import { getUiLocalePreference, uiLocaleRef } from "./ui-locale";

export { dateLocaleForLang, getUiText, resolveUiLocale };
export type { MessageTree, UiLocale };

/** 去掉站点 base 后的路径 */
export function stripSiteBase(path: string, base = "/"): string {
  const b = (base || "/").replace(/\/$/, "");
  if (b && b !== "/" && path.startsWith(b)) {
    return path.slice(b.length) || "/";
  }
  return path || "/";
}

/**
 * 历史兼容：曾经有 /en、/zh-TW 路径前缀。
 * 现已改为偏好存储，此函数仅剥离遗留前缀（书签 / 外链）。
 */
export function stripLocalePrefix(path: string): string {
  const cleaned = path.replace(/^\/(en|zh-TW)(?=\/|$)/, "");
  return cleaned || "/";
}

export function useI18n() {
  const uiLocale = computed(() => uiLocaleRef.value || getUiLocalePreference());
  const m = computed(() => getMessages(uiLocale.value));
  const dateLocale = computed(() => dateLocaleForLang(uiLocale.value));

  function t<K extends keyof MessageTree>(key: K): MessageTree[K] {
    return m.value[key];
  }

  return {
    uiLocale,
    dateLocale,
    messages: m,
    t,
  };
}
