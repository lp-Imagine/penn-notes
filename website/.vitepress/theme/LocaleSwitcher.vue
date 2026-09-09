<script setup lang="ts">
import { computed, nextTick } from "vue";
import { useData, useRouter } from "vitepress";
import {
  localeKeyToHome,
  stripSiteBase,
  switchLocalePath,
  useI18n,
  type LocaleKey,
} from "./i18n";

const router = useRouter();
const { page, site } = useData();
const { t, currentLocaleKeyFromPath } = useI18n();

const options: { key: LocaleKey; label: () => string }[] = [
  { key: "root", label: () => t("localeSwitcher").zhCN },
  { key: "zh-TW", label: () => t("localeSwitcher").zhTW },
  { key: "en", label: () => t("localeSwitcher").en },
];

const currentKey = computed(() =>
  currentLocaleKeyFromPath(router.route.path),
);

async function goLocale(target: LocaleKey) {
  if (target === currentKey.value) return;
  const sitePath = stripSiteBase(router.route.path, site.value.base);
  const nextPath = switchLocalePath(sitePath, target);
  const base = site.value.base || "/";
  const withBase = (p: string) => {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    if (!b || b === "/") return p;
    return `${b}${p.startsWith("/") ? p : `/${p}`}`;
  };

  await router.go(withBase(nextPath));
  await nextTick();
  if (page.value.isNotFound) {
    await router.go(withBase(localeKeyToHome(target)));
  }
}

function optionLabel(key: LocaleKey) {
  return options.find((o) => o.key === key)?.label() ?? key;
}
</script>

<template>
  <div class="locale-switcher" role="navigation" :aria-label="t('localeSwitcher').label">
    <button
      v-for="opt in options"
      :key="opt.key"
      type="button"
      class="locale-switcher-btn"
      :class="{ 'is-active': currentKey === opt.key }"
      :aria-current="currentKey === opt.key ? 'true' : undefined"
      @click="goLocale(opt.key)"
    >
      {{ optionLabel(opt.key) }}
    </button>
  </div>
</template>

<style scoped>
.locale-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 88%, transparent);
  background: color-mix(in srgb, var(--vp-c-bg-alt) 55%, transparent);
  flex-shrink: 0;
}

.locale-switcher-btn {
  appearance: none;
  border: 0;
  margin: 0;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.4;
  color: var(--vp-c-text-2);
  background: transparent;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.locale-switcher-btn:hover {
  color: var(--vp-c-text-1);
}

.locale-switcher-btn.is-active {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--vp-c-divider) 70%, transparent);
}

@media (max-width: 767px) {
  .locale-switcher {
    margin-left: 4px;
    padding: 1px;
  }

  .locale-switcher-btn {
    padding: 2px 6px;
    font-size: 11px;
  }
}
</style>
