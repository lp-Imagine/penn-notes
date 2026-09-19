<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const stage = ref(null);

const buttons = [
  { id: "a", labelKey: "magPrimary" },
  { id: "b", labelKey: "magSecondary" },
  { id: "c", labelKey: "magGhost" },
];

const offsets = ref({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, c: { x: 0, y: 0 } });
const els = {};

function setEl(id, el) {
  if (el) els[id] = el;
  else delete els[id];
}

function onMove(e) {
  const root = stage.value;
  if (!root) return;
  const next = {};
  for (const btn of buttons) {
    const el = els[btn.id];
    if (!el) {
      next[btn.id] = { x: 0, y: 0 };
      continue;
    }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const pull = Math.max(0, 1 - dist / 140);
    next[btn.id] = {
      x: dx * pull * 0.28,
      y: dy * pull * 0.28,
    };
  }
  offsets.value = next;
}

function onLeave() {
  offsets.value = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, c: { x: 0, y: 0 } };
}

function styleFor(id) {
  const o = offsets.value[id] || { x: 0, y: 0 };
  return {
    transform: `translate3d(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px, 0)`,
  };
}

onMounted(() => {
  stage.value?.addEventListener("pointermove", onMove);
  stage.value?.addEventListener("pointerleave", onLeave);
});

onBeforeUnmount(() => {
  stage.value?.removeEventListener("pointermove", onMove);
  stage.value?.removeEventListener("pointerleave", onLeave);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').magTitle" :lead="t('lab').magLead">
    <p class="lab-demo-code">
      <code>magnetic attract · distance falloff</code>
    </p>
    <div ref="stage" class="lab-mag-stage">
      <button
        v-for="btn in buttons"
        :key="btn.id"
        :ref="(el) => setEl(btn.id, el)"
        type="button"
        class="lab-mag-btn"
        :class="`lab-mag-btn--${btn.id}`"
        :style="styleFor(btn.id)"
      >
        {{ t("lab")[btn.labelKey] }}
      </button>
      <p class="lab-mag-hint">{{ t("lab").magHint }}</p>
    </div>
  </LabDemoChrome>
</template>
