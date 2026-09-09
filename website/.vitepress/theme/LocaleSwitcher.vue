<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
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

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

const options: { key: LocaleKey; label: () => string }[] = [
  { key: "root", label: () => t("localeSwitcher").zhCN },
  { key: "zh-TW", label: () => t("localeSwitcher").zhTW },
  { key: "en", label: () => t("localeSwitcher").en },
];

const currentKey = computed(() =>
  currentLocaleKeyFromPath(router.route.path),
);

const currentLabel = computed(() => {
  const hit = options.find((o) => o.key === currentKey.value);
  return hit ? hit.label() : t("localeSwitcher").zhCN;
});

function optionLabel(key: LocaleKey) {
  return options.find((o) => o.key === key)?.label() ?? key;
}

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

async function goLocale(target: LocaleKey) {
  close();
  if (target === currentKey.value) return;
  const sitePath = stripSiteBase(router.route.path, site.value.base);
  const nextPath = switchLocalePath(sitePath, target);
  const base = site.value.base || "/";
  const withBase = (p: string) => {
    const b = base.endsWith("/") ? base.slice(0, -1) : base;
    if (!b || b === "/") return p;
    return `${b}${p.startsWith("/") ? p : `/${p}`}`;
  };

  // router.go 在 loadPage 完成后才 resolve；此时 page 已是目标页数据
  await router.go(withBase(nextPath));
  await nextTick();

  // 仅在「目标路径确实 404」时回首页。不要用短暂中间态误判——
  // 否则 /about/ → /en/about/ 会被立刻打回 /en/，体感「只有首页能切」。
  const landed = stripSiteBase(router.route.path, site.value.base).replace(
    /\/$/,
    "",
  ) || "/";
  const expected = nextPath.replace(/\/$/, "") || "/";
  if (page.value.isNotFound && landed === expected) {
    await router.go(withBase(localeKeyToHome(target)));
  }
}

function onDocPointerDown(ev: PointerEvent) {
  if (!open.value || !rootEl.value) return;
  const target = ev.target;
  if (target instanceof Node && rootEl.value.contains(target)) return;
  close();
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocPointerDown, true);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointerDown, true);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div
    ref="rootEl"
    class="locale-switcher"
    :class="{ 'is-open': open }"
  >
    <button
      type="button"
      class="locale-switcher-trigger"
      :aria-label="t('localeSwitcher').label"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="locale-switcher-current">{{ currentLabel }}</span>
      <span class="locale-switcher-caret" aria-hidden="true" />
    </button>

    <ul
      v-show="open"
      class="locale-switcher-menu"
      role="listbox"
      :aria-label="t('localeSwitcher').label"
    >
      <li v-for="opt in options" :key="opt.key" role="none">
        <button
          type="button"
          class="locale-switcher-option"
          role="option"
          :aria-selected="currentKey === opt.key ? 'true' : 'false'"
          :class="{ 'is-active': currentKey === opt.key }"
          @click="goLocale(opt.key)"
        >
          {{ optionLabel(opt.key) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.locale-switcher {
  position: relative;
  margin-left: 8px;
  flex-shrink: 0;
}

.locale-switcher-trigger {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 88%, transparent);
  background: color-mix(in srgb, var(--vp-c-bg-alt) 55%, transparent);
  color: var(--vp-c-text-1);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.4;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.locale-switcher-trigger:hover {
  border-color: color-mix(in srgb, var(--vp-c-divider) 100%, transparent);
  background: color-mix(in srgb, var(--vp-c-bg-alt) 80%, transparent);
}

.locale-switcher-caret {
  width: 0;
  height: 0;
  border-left: 3.5px solid transparent;
  border-right: 3.5px solid transparent;
  border-top: 4px solid var(--vp-c-text-3);
  transition: transform 0.15s ease;
}

.locale-switcher.is-open .locale-switcher-caret {
  transform: rotate(180deg);
}

.locale-switcher-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 70;
  min-width: 108px;
  margin: 0;
  padding: 4px;
  list-style: none;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--vp-c-divider) 92%, transparent);
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--vp-c-text-1) 6%, transparent),
    0 12px 28px color-mix(in srgb, var(--vp-c-text-1) 10%, transparent);
}

.locale-switcher-option {
  appearance: none;
  display: block;
  width: 100%;
  margin: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  line-height: 1.35;
  cursor: pointer;
  transition:
    color 0.12s ease,
    background 0.12s ease;
}

.locale-switcher-option:hover {
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-text-1) 5%, transparent);
}

.locale-switcher-option.is-active {
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 10%, transparent);
}

@media (max-width: 767px) {
  .locale-switcher {
    margin-left: 4px;
  }

  .locale-switcher-trigger {
    padding: 3px 8px;
    font-size: 11px;
  }
}
</style>
