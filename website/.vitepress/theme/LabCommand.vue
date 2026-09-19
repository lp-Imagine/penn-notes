<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const open = ref(false);
const query = ref("");
const active = ref(0);
const toast = ref("");
const inputEl = ref(null);
let toastTimer;

const commands = computed(() => [
  {
    id: "toast",
    label: t("lab").cmdToast,
    hint: t("lab").cmdToastHint,
    run: () => flash(t("lab").cmdToastDone),
  },
  {
    id: "focus",
    label: t("lab").cmdFocus,
    hint: t("lab").cmdFocusHint,
    run: () => {
      document.documentElement.classList.toggle("lab-cmd-focus");
      flash(
        document.documentElement.classList.contains("lab-cmd-focus")
          ? t("lab").cmdFocusOn
          : t("lab").cmdFocusOff
      );
    },
  },
  {
    id: "shake",
    label: t("lab").cmdShake,
    hint: t("lab").cmdShakeHint,
    run: () => {
      const board = document.querySelector(".lab-cmd-board");
      board?.classList.remove("is-shake");
      void board?.offsetWidth;
      board?.classList.add("is-shake");
      flash(t("lab").cmdShakeDone);
    },
  },
  {
    id: "theme",
    label: t("lab").cmdTheme,
    hint: t("lab").cmdThemeHint,
    run: () => {
      const board = document.querySelector(".lab-cmd-board");
      board?.classList.toggle("lab-cmd-board--alt");
      flash(t("lab").cmdThemeDone);
    },
  },
]);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return commands.value;
  return commands.value.filter(
    (c) =>
      c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)
  );
});

watch(filtered, () => {
  active.value = 0;
});

function flash(msg) {
  toast.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 1600);
}

function toggle() {
  open.value = !open.value;
  if (open.value) {
    query.value = "";
    active.value = 0;
    requestAnimationFrame(() => inputEl.value?.focus());
  }
}

function close() {
  open.value = false;
}

function run(cmd) {
  cmd.run();
  close();
}

function onKey(e) {
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key.toLowerCase() === "k") {
    e.preventDefault();
    toggle();
    return;
  }
  if (!open.value) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    active.value = (active.value + 1) % Math.max(filtered.value.length, 1);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    active.value =
      (active.value - 1 + filtered.value.length) %
      Math.max(filtered.value.length, 1);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const cmd = filtered.value[active.value];
    if (cmd) run(cmd);
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  clearTimeout(toastTimer);
  document.documentElement.classList.remove("lab-cmd-focus");
});
</script>

<template>
  <LabDemoChrome :title="t('lab').cmdTitle" :lead="t('lab').cmdLead">
    <div class="lab-cmd-board">
      <div class="lab-cmd-bar">
        <button type="button" class="lab-demo-btn" @click="toggle">
          {{ open ? t("lab").cmdClose : t("lab").cmdOpen }}
        </button>
        <span class="lab-cmd-kbd"><kbd>⌘</kbd><kbd>K</kbd></span>
        <span class="lab-cmd-tip">{{ t("lab").cmdTip }}</span>
      </div>

      <p v-if="toast" class="lab-cmd-toast" role="status">{{ toast }}</p>

      <div class="lab-cmd-preview">
        <p class="lab-cmd-preview-title">{{ t("lab").cmdPreviewTitle }}</p>
        <p class="lab-cmd-preview-body">{{ t("lab").cmdPreviewBody }}</p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        class="lab-cmd-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('lab').cmdTitle"
        @click.self="close"
      >
        <div class="lab-cmd-panel">
          <input
            ref="inputEl"
            v-model="query"
            class="lab-cmd-input"
            type="search"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('lab').cmdPlaceholder"
          />
          <ul class="lab-cmd-list" role="listbox">
            <li v-if="!filtered.length" class="lab-cmd-empty">
              {{ t("lab").cmdEmpty }}
            </li>
            <li
              v-for="(cmd, i) in filtered"
              :key="cmd.id"
              class="lab-cmd-item"
              :class="{ 'is-active': i === active }"
              role="option"
              :aria-selected="i === active"
              @mouseenter="active = i"
              @click="run(cmd)"
            >
              <span class="lab-cmd-item-label">{{ cmd.label }}</span>
              <span class="lab-cmd-item-hint">{{ cmd.hint }}</span>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </LabDemoChrome>
</template>
