<script setup>
import { computed, nextTick, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const openId = ref("");
const note = ref("");
const cards = new Map();

const items = computed(() => {
  const L = t("lab");
  return [
    { id: "iris", title: L.morphIris, body: L.morphIrisBody },
    { id: "fault", title: L.morphFault, body: L.morphFaultBody },
    { id: "lattice", title: L.morphLattice, body: L.morphLatticeBody },
    { id: "ghost", title: L.morphGhost, body: L.morphGhostBody },
  ];
});

const current = computed(() => items.value.find((item) => item.id === openId.value) || null);

function setCard(id, el) {
  if (el) cards.set(id, el);
  else cards.delete(id);
}

function nameSpecimen(el) {
  if (el) el.style.viewTransitionName = "lab-specimen";
}

function clearNames() {
  cards.forEach((el) => {
    el.style.viewTransitionName = "";
  });
  document.querySelectorAll(".lab-morph-visual").forEach((el) => {
    el.style.viewTransitionName = "";
  });
}

function transition(update, source, after) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = document.startViewTransition?.bind(document);
  if (!start || reduced) {
    update();
    if (!start) note.value = t("lab").morphUnsupported;
    return;
  }
  nameSpecimen(source);
  document.documentElement.classList.add("lab-morphing");
  const tx = start(async () => {
    update();
    await nextTick();
    after?.();
  });
  tx.finished.finally(() => {
    clearNames();
    document.documentElement.classList.remove("lab-morphing");
  });
}

function open(id) {
  note.value = "";
  transition(
    () => {
      openId.value = id;
    },
    cards.get(id),
    () => nameSpecimen(document.querySelector(".lab-morph-visual"))
  );
}

function close() {
  const id = openId.value;
  transition(
    () => {
      openId.value = "";
    },
    document.querySelector(".lab-morph-visual"),
    () => nameSpecimen(cards.get(id))
  );
}
</script>

<template>
  <LabDemoChrome :title="t('lab').morphTitle" :lead="t('lab').morphLead">
    <div v-if="!current" class="lab-morph-grid">
      <button
        v-for="item in items"
        :key="item.id"
        :ref="(el) => setCard(item.id, el)"
        type="button"
        class="lab-morph-card"
        :data-specimen="item.id"
        @click="open(item.id)"
      >
        <span class="lab-morph-swatch" :data-specimen="item.id" />
        <span class="lab-morph-name">{{ item.title }}</span>
      </button>
    </div>
    <div v-else class="lab-morph-detail">
      <button type="button" class="lab-morph-back" @click="close">
        {{ t("lab").morphBack }}
      </button>
      <div class="lab-morph-visual" :data-specimen="current.id" />
      <h2 class="lab-morph-detail-title">{{ current.title }}</h2>
      <p class="lab-morph-detail-body">{{ current.body }}</p>
    </div>
    <p v-if="note" class="lab-field-hint">{{ note }}</p>
  </LabDemoChrome>
</template>
