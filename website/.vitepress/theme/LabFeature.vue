<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const step = ref(0);
const draft = ref("");
const audience = ref("self");
const done = ref(false);
const alt = ref(false);
const toast = ref("");
const open = ref(false);
const query = ref("");
const active = ref(0);
const cmdInput = ref(null);
let toastTimer = 0;

const steps = computed(() => {
  const L = t("lab");
  return [
    { id: "write", label: L.featureStepWrite },
    { id: "who", label: L.featureStepWho },
    { id: "confirm", label: L.featureStepConfirm },
  ];
});

const audiences = computed(() => {
  const L = t("lab");
  return [
    { id: "self", label: L.featureWhoSelf, hint: L.featureWhoSelfHint },
    { id: "friends", label: L.featureWhoFriends, hint: L.featureWhoFriendsHint },
    { id: "public", label: L.featureWhoPublic, hint: L.featureWhoPublicHint },
  ];
});

const whoLabel = computed(
  () => audiences.value.find((item) => item.id === audience.value)?.label || ""
);

const summary = computed(() => {
  const L = t("lab");
  const title = draft.value.trim();
  if (!title) return L.featureSummaryEmpty;
  return L.featureSummary(title, whoLabel.value);
});

const commands = computed(() => {
  const L = t("lab");
  const all = [
    { id: "toast", label: L.featureCmdToast, hint: L.featureCmdToastHint },
    { id: "next", label: L.featureCmdNext, hint: L.featureCmdNextHint },
    { id: "reset", label: L.featureCmdReset, hint: L.featureCmdResetHint },
    { id: "theme", label: L.featureCmdTheme, hint: L.featureCmdThemeHint },
  ];
  const q = query.value.trim().toLowerCase();
  if (!q) return all;
  return all.filter((item) => `${item.label} ${item.hint}`.toLowerCase().includes(q));
});

const activeIndex = computed(() => {
  if (!commands.value.length) return 0;
  return Math.min(active.value, commands.value.length - 1);
});

function pushToast(text) {
  toast.value = text;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.value = "";
  }, 2400);
}

function reset(announce) {
  step.value = 0;
  draft.value = "";
  audience.value = "self";
  done.value = false;
  if (announce) pushToast(t("lab").featureToastReset);
}

function publish() {
  if (!draft.value.trim()) {
    step.value = 0;
    pushToast(t("lab").featureToastNeedTitle);
    return;
  }
  done.value = true;
  step.value = 2;
  pushToast(t("lab").featureToastPublished);
}

function next(fromCommand) {
  if (step.value === 0 && !draft.value.trim()) {
    pushToast(t("lab").featureToastNeedTitle);
    return;
  }
  if (done.value && step.value >= 2) {
    pushToast(t("lab").featureToastPublished);
    return;
  }
  if (step.value < 2) {
    step.value += 1;
    if (fromCommand) pushToast(t("lab").featureToastStep);
    return;
  }
  publish();
}

function prev() {
  if (step.value === 0) return;
  done.value = false;
  step.value -= 1;
}

function goTo(index) {
  if (index > 0 && !draft.value.trim()) {
    pushToast(t("lab").featureToastNeedTitle);
    return;
  }
  if (index < step.value) done.value = false;
  step.value = index;
}

function openPalette() {
  open.value = true;
  query.value = "";
  active.value = 0;
  nextTick(() => cmdInput.value?.focus());
}

function closePalette() {
  open.value = false;
}

function run(id) {
  closePalette();
  if (id === "toast") pushToast(t("lab").featureToastCmd);
  else if (id === "next") next(true);
  else if (id === "reset") reset(true);
  else if (id === "theme") {
    alt.value = !alt.value;
    pushToast(t("lab").featureToastTheme);
  }
}

function onKey(event) {
  const meta = event.metaKey || event.ctrlKey;
  if (meta && event.shiftKey && !event.altKey && (event.key === "k" || event.key === "K")) {
    event.preventDefault();
    openPalette();
    return;
  }
  if (!open.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closePalette();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    active.value = Math.min(commands.value.length - 1, activeIndex.value + 1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    active.value = Math.max(0, activeIndex.value - 1);
    return;
  }
  if (event.key === "Enter") {
    const item = commands.value[activeIndex.value];
    if (!item) return;
    event.preventDefault();
    run(item.id);
  }
}

watch(query, () => {
  active.value = 0;
});

watch(open, (value) => {
  document.body.style.overflow = value ? "hidden" : "";
});

onMounted(() => {
  document.addEventListener("keydown", onKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  window.clearTimeout(toastTimer);
  document.body.style.overflow = "";
});
</script>

<template>
  <LabDemoChrome :title="t('lab').featureTitle" :lead="t('lab').featureLead">
    <div class="lab-feature" :class="{ 'is-alt': alt }">
      <div class="lab-feature-steps" role="tablist">
        <button
          v-for="(item, index) in steps"
          :key="item.id"
          type="button"
          class="lab-feature-step"
          :class="{ 'is-on': step === index, 'is-done': step > index }"
          role="tab"
          :aria-selected="step === index"
          @click="goTo(index)"
        >
          <span class="lab-feature-step-idx">0{{ index + 1 }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <div v-if="step === 0" class="lab-feature-panel">
        <label class="lab-feature-field">
          <span class="lab-feature-label">{{ t("lab").featureTitleLabel }}</span>
          <input
            v-model="draft"
            class="lab-feature-input"
            type="text"
            maxlength="48"
            :placeholder="t('lab').featureTitlePh"
            @keydown.enter.prevent="next(false)"
          />
        </label>
      </div>

      <div v-else-if="step === 1" class="lab-feature-choices" role="radiogroup">
        <button
          v-for="item in audiences"
          :key="item.id"
          type="button"
          class="lab-feature-choice"
          :class="{ 'is-on': audience === item.id }"
          role="radio"
          :aria-checked="audience === item.id"
          @click="audience = item.id"
        >
          <span class="lab-feature-choice-name">{{ item.label }}</span>
          <span class="lab-feature-choice-hint">{{ item.hint }}</span>
        </button>
      </div>

      <div v-else class="lab-feature-panel">
        <p class="lab-feature-summary">{{ summary }}</p>
        <p v-if="done" class="lab-feature-done">{{ t("lab").featureDone }}</p>
      </div>

      <div class="lab-feature-actions">
        <button
          v-if="step > 0"
          type="button"
          class="lab-feature-btn"
          @click="prev"
        >
          {{ t("lab").featurePrev }}
        </button>
        <button
          v-if="!(done && step === 2)"
          type="button"
          class="lab-feature-btn lab-feature-btn--primary"
          @click="next(false)"
        >
          {{ step === 2 ? t("lab").featurePublish : t("lab").featureNext }}
        </button>
        <button
          v-else
          type="button"
          class="lab-feature-btn lab-feature-btn--primary"
          @click="reset(true)"
        >
          {{ t("lab").featureAgain }}
        </button>
      </div>

      <p v-if="toast" class="lab-cmd-toast" role="status">{{ toast }}</p>

      <div class="lab-cmd-bar">
        <button type="button" class="lab-feature-btn" @click="openPalette">
          {{ t("lab").featureCmdOpen }}
        </button>
        <span class="lab-cmd-kbd" aria-hidden="true">
          <kbd>⌘</kbd>
          <kbd>⇧</kbd>
          <kbd>K</kbd>
        </span>
        <span class="lab-cmd-tip">{{ t("lab").featureCmdTip }}</span>
      </div>
    </div>
    <p class="lab-field-hint">{{ t("lab").featureHint }}</p>

    <Teleport v-if="open" to="body">
      <div class="lab-cmd-overlay" @click.self="closePalette">
        <div
          class="lab-cmd-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="t('lab').featureCmdOpen"
        >
          <input
            ref="cmdInput"
            v-model="query"
            class="lab-cmd-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('lab').featureCmdPlaceholder"
          />
          <ul v-if="commands.length" class="lab-cmd-list">
            <li v-for="(item, index) in commands" :key="item.id">
              <button
                type="button"
                class="lab-cmd-item"
                :class="{ 'is-active': index === activeIndex }"
                @mouseenter="active = index"
                @click="run(item.id)"
              >
                <span class="lab-cmd-item-label">{{ item.label }}</span>
                <span class="lab-cmd-item-hint">{{ item.hint }}</span>
              </button>
            </li>
          </ul>
          <p v-else class="lab-cmd-empty">{{ t("lab").featureCmdEmpty }}</p>
        </div>
      </div>
    </Teleport>
  </LabDemoChrome>
</template>
