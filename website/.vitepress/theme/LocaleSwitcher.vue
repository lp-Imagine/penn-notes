<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useData } from "vitepress";
import type { UiLocale } from "./i18n";
import { useI18n } from "./i18n";
import { setUiLocalePreference, uiLocaleRef } from "./ui-locale";

const { t } = useI18n();
const { isDark } = useData();

const toggleAppearance = inject<() => void>("toggle-appearance", () => {
  isDark.value = !isDark.value;
});

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLButtonElement | null>(null);

const options: { key: UiLocale; short: string; label: () => string }[] = [
  { key: "zh-CN", short: "简", label: () => t("localeSwitcher").zhCN },
  { key: "zh-TW", short: "繁", label: () => t("localeSwitcher").zhTW },
  { key: "en", short: "EN", label: () => t("localeSwitcher").en },
];

const currentKey = computed(() => uiLocaleRef.value);

const currentShort = computed(() => {
  const hit = options.find((o) => o.key === currentKey.value);
  return hit?.short ?? "简";
});

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function goLocale(target: UiLocale) {
  if (target === currentKey.value) {
    close();
    return;
  }
  setUiLocalePreference(target);
  if (typeof location !== "undefined") location.reload();
}

function setDark(next: boolean) {
  if (isDark.value === next) return;
  toggleAppearance();
}

function onDocPointerDown(ev: PointerEvent) {
  if (!open.value || !rootEl.value) return;
  const target = ev.target;
  if (target instanceof Node && rootEl.value.contains(target)) return;
  close();
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === "Escape" && open.value) {
    close();
    void nextTick(() => triggerEl.value?.focus());
  }
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
    class="nav-prefs"
    :class="{ 'is-open': open }"
  >
    <button
      ref="triggerEl"
      type="button"
      class="nav-prefs-trigger"
      :aria-label="t('localeSwitcher').prefs"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <span class="nav-prefs-locale" aria-hidden="true">{{ currentShort }}</span>
      <span class="nav-prefs-locale-icon" aria-hidden="true">
        <svg
          class="nav-prefs-svg"
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path
            d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"
          />
        </svg>
      </span>
      <span class="nav-prefs-sep" aria-hidden="true" />
      <span class="nav-prefs-theme-icon" aria-hidden="true">
        <svg
          v-if="!isDark"
          class="nav-prefs-svg"
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
        >
          <circle cx="12" cy="12" r="3.6" />
          <path
            d="M12 2.8v1.7M12 19.5v1.7M4.7 4.7l1.2 1.2M18.1 18.1l1.2 1.2M2.8 12h1.7M19.5 12h1.7M4.7 19.3l1.2-1.2M18.1 5.9l1.2-1.2"
          />
        </svg>
        <svg
          v-else
          class="nav-prefs-svg"
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M20.6 14.2A7.8 7.8 0 1 1 9.8 3.4a6.4 6.4 0 0 0 10.8 10.8z" />
        </svg>
      </span>
    </button>

    <Transition name="nav-prefs-pop">
      <div
        v-if="open"
        class="nav-prefs-panel"
        role="dialog"
        :aria-label="t('localeSwitcher').prefs"
      >
        <div class="nav-prefs-section">
          <p class="nav-prefs-heading">{{ t("localeSwitcher").language }}</p>
          <div
            class="nav-prefs-seg"
            role="listbox"
            :aria-label="t('localeSwitcher').label"
          >
            <button
              v-for="opt in options"
              :key="opt.key"
              type="button"
              class="nav-prefs-seg-btn"
              role="option"
              :aria-selected="currentKey === opt.key ? 'true' : 'false'"
              :class="{ 'is-active': currentKey === opt.key }"
              @click="goLocale(opt.key)"
            >
              <span class="nav-prefs-seg-label">{{ opt.label() }}</span>
            </button>
          </div>
        </div>

        <div class="nav-prefs-section">
          <p class="nav-prefs-heading">{{ t("localeSwitcher").appearance }}</p>
          <div
            class="nav-prefs-seg nav-prefs-seg--appearance"
            role="group"
            :aria-label="t('localeSwitcher').appearance"
          >
            <button
              type="button"
              class="nav-prefs-seg-btn"
              :class="{ 'is-active': !isDark }"
              :aria-pressed="!isDark ? 'true' : 'false'"
              @click="setDark(false)"
            >
              <svg
                class="nav-prefs-svg"
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.6" />
                <path
                  d="M12 2.8v1.7M12 19.5v1.7M4.7 4.7l1.2 1.2M18.1 18.1l1.2 1.2M2.8 12h1.7M19.5 12h1.7M4.7 19.3l1.2-1.2M18.1 5.9l1.2-1.2"
                />
              </svg>
              <span class="nav-prefs-seg-label">{{ t("localeSwitcher").light }}</span>
            </button>
            <button
              type="button"
              class="nav-prefs-seg-btn"
              :class="{ 'is-active': isDark }"
              :aria-pressed="isDark ? 'true' : 'false'"
              @click="setDark(true)"
            >
              <svg
                class="nav-prefs-svg"
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M20.6 14.2A7.8 7.8 0 1 1 9.8 3.4a6.4 6.4 0 0 0 10.8 10.8z" />
              </svg>
              <span class="nav-prefs-seg-label">{{ t("localeSwitcher").dark }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nav-prefs {
  position: relative;
  margin-left: 0;
  flex-shrink: 0;
}

.nav-prefs-trigger {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  height: 34px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--border, var(--vp-c-divider)) 72%, transparent);
  background: color-mix(in srgb, var(--text, var(--vp-c-text-1)) 5%, transparent);
  color: var(--text-2, var(--vp-c-text-2));
  cursor: pointer;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.nav-prefs-trigger:hover {
  color: var(--text, var(--vp-c-text-1));
  background: color-mix(in srgb, var(--text, var(--vp-c-text-1)) 8%, transparent);
  border-color: color-mix(
    in srgb,
    var(--border-strong, var(--vp-c-divider)) 70%,
    transparent
  );
}

.nav-prefs-trigger:active {
  transform: scale(0.97);
}

.nav-prefs-trigger:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--vp-c-brand-1) 18%, transparent);
}

.nav-prefs.is-open .nav-prefs-trigger {
  color: var(--text, var(--vp-c-text-1));
  background: color-mix(in srgb, var(--vp-c-brand-1) 9%, transparent);
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 32%, var(--vp-c-divider));
}

.nav-prefs-locale {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1;
  min-width: 1.1em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.nav-prefs-locale-icon {
  display: none;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  color: var(--text-2, var(--vp-c-text-2));
  transition: color 0.16s ease;
}

.nav-prefs-trigger:hover .nav-prefs-locale-icon,
.nav-prefs.is-open .nav-prefs-locale-icon {
  color: var(--text, var(--vp-c-text-1));
}

.nav-prefs-sep {
  width: 1px;
  height: 11px;
  border-radius: 1px;
  background: color-mix(in srgb, var(--border, var(--vp-c-divider)) 85%, transparent);
  flex-shrink: 0;
  opacity: 0.9;
}

.nav-prefs-theme-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--text-3, var(--vp-c-text-3));
  transition: color 0.16s ease;
}

.nav-prefs-trigger:hover .nav-prefs-theme-icon,
.nav-prefs.is-open .nav-prefs-theme-icon {
  color: var(--text-2, var(--vp-c-text-2));
}

.nav-prefs-svg {
  display: block;
  flex-shrink: 0;
}

.nav-prefs-panel {
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  right: auto;
  z-index: 90;
  width: min(236px, calc(100vw - 20px));
  padding: 11px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border, var(--vp-c-divider)) 82%, transparent);
  background: color-mix(
    in srgb,
    var(--vp-c-bg-elv, var(--vp-c-bg)) 88%,
    transparent
  );
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 45%, transparent) inset,
    0 1px 2px color-mix(in srgb, var(--vp-c-text-1) 4%, transparent),
    0 18px 40px color-mix(in srgb, var(--vp-c-text-1) 11%, transparent);
  transform-origin: top left;
}

:global(.dark) .nav-prefs-panel {
  background: color-mix(in srgb, var(--vp-c-bg-elv, var(--vp-c-bg)) 92%, transparent);
  box-shadow:
    0 1px 0 color-mix(in srgb, #fff 6%, transparent) inset,
    0 1px 2px rgba(0, 0, 0, 0.25),
    0 18px 40px rgba(0, 0, 0, 0.38);
}

.nav-prefs-section + .nav-prefs-section {
  margin-top: 11px;
  padding-top: 11px;
  border-top: 1px solid color-mix(in srgb, var(--border, var(--vp-c-divider)) 72%, transparent);
}

.nav-prefs-heading {
  margin: 0 0 7px;
  padding: 0 3px;
  color: var(--text-3, var(--vp-c-text-3));
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.3;
}

.nav-prefs-seg {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 2px;
  padding: 3px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text, var(--vp-c-text-1)) 5%, transparent);
}

.nav-prefs-seg-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 0;
  min-height: 30px;
  padding: 5px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-2, var(--vp-c-text-2));
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition:
    color 0.14s ease,
    background 0.14s ease,
    box-shadow 0.14s ease,
    transform 0.14s ease;
}

.nav-prefs-seg-btn:hover {
  color: var(--text, var(--vp-c-text-1));
}

.nav-prefs-seg-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 28%, transparent);
}

.nav-prefs-seg-btn.is-active {
  color: var(--text, var(--vp-c-text-1));
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--border, var(--vp-c-divider)) 65%, transparent),
    0 1px 2px color-mix(in srgb, var(--vp-c-text-1) 7%, transparent);
}

.nav-prefs-seg-btn.is-active .nav-prefs-svg {
  color: var(--vp-c-brand-1);
}

.nav-prefs-seg-label {
  white-space: nowrap;
}

.nav-prefs-pop-enter-active,
.nav-prefs-pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-prefs-pop-enter-from,
.nav-prefs-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

@media (max-width: 767px) {
  .nav-prefs {
    margin-left: 0;
  }

  .nav-prefs-trigger {
    width: 36px;
    height: 36px;
    padding: 0;
    gap: 0;
    border-radius: 8px;
    border-color: transparent;
    background: transparent;
    justify-content: center;
    color: var(--text, var(--vp-c-text-1));
  }

  .nav-prefs-trigger:hover,
  .nav-prefs.is-open .nav-prefs-trigger {
    color: var(--text, var(--vp-c-text-1));
    background: color-mix(in srgb, var(--text, var(--vp-c-text-1)) 7%, transparent);
    border-color: transparent;
  }

  .nav-prefs-locale,
  .nav-prefs-sep,
  .nav-prefs-theme-icon {
    display: none;
  }

  .nav-prefs-locale-icon {
    display: inline-flex;
    color: inherit;
  }

  .nav-prefs-trigger:hover .nav-prefs-locale-icon,
  .nav-prefs.is-open .nav-prefs-locale-icon {
    color: inherit;
  }

  .nav-prefs-locale-icon .nav-prefs-svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }

  /* 窄屏触发器在右侧，面板改向左展开，避免 EN / 深色被裁切 */
  .nav-prefs-panel {
    left: auto;
    right: 0;
    transform-origin: top right;
    width: min(236px, calc(100vw - 16px));
  }

  .nav-prefs-heading {
    text-transform: none;
    letter-spacing: 0.04em;
  }

  .nav-prefs-seg-btn {
    padding: 5px 4px;
    font-size: 11px;
    gap: 3px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-prefs-trigger,
  .nav-prefs-seg-btn,
  .nav-prefs-pop-enter-active,
  .nav-prefs-pop-leave-active {
    transition: none;
  }

  .nav-prefs-trigger:active {
    transform: none;
  }
}
</style>
