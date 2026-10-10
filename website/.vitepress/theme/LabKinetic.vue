<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const scroller = ref(null);
const line = ref(null);
let raf = 0;
let running = false;
let shown = 0;

function glyphs() {
  return Array.from(t("lab").kineticLine);
}

function apply(progress, vel) {
  const host = line.value;
  if (!host) return;
  host.dataset.p = String(progress);
  const chars = host.querySelectorAll(".lab-kinetic-char");
  chars.forEach((node, i) => {
    const seed = ((i * 17) % 11) - 5;
    const lift = 1 - progress;
    const x = lift * seed * 7;
    const y = lift * (((i % 5) - 2) * 9 + seed);
    const kick = Math.max(-1, Math.min(1, vel * 8));
    const rot = lift * seed * 3.2 + kick * 6;
    const shift = kick * 7;
    node.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`;
    node.style.textShadow = `${shift}px 0 rgba(59, 91, 219, 0.55), ${-shift}px 0 rgba(212, 146, 74, 0.45)`;
  });
}

function targetProgress() {
  const sc = scroller.value;
  if (!sc) return 0;
  const max = sc.scrollHeight - sc.clientHeight;
  return max > 0 ? sc.scrollTop / max : 1;
}

function tick() {
  if (!running) return;
  const target = targetProgress();
  const prev = shown;
  shown += (target - shown) * 0.18;
  apply(shown, shown - prev);
  raf = window.requestAnimationFrame(tick);
}

function onScroll() {
  const target = targetProgress();
  const vel = target - shown;
  shown = target;
  apply(shown, vel);
}

onMounted(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    shown = 1;
    apply(1, 0);
    line.value?.querySelectorAll(".lab-kinetic-char").forEach((node) => {
      node.style.transform = "none";
      node.style.textShadow = "none";
    });
    return;
  }
  apply(0, 0);
  running = true;
  raf = window.requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  running = false;
  if (raf) window.cancelAnimationFrame(raf);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').kineticTitle" :lead="t('lab').kineticLead">
    <div ref="scroller" class="lab-kinetic" tabindex="0" @scroll="onScroll">
      <div class="lab-kinetic-sticky">
        <p ref="line" class="lab-kinetic-line" data-p="0">
          <span
            v-for="(ch, i) in glyphs()"
            :key="i"
            class="lab-kinetic-char"
            >{{ ch === " " ? "\u00a0" : ch }}</span
          >
        </p>
      </div>
      <div class="lab-kinetic-pad" aria-hidden="true" />
    </div>
    <p class="lab-field-hint">{{ t("lab").kineticHint }}</p>
  </LabDemoChrome>
</template>
