<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const host = ref(null);
const canvas = ref(null);

let raf = 0;
let ctx = null;
let particles = [];
let w = 0;
let h = 0;
let dpr = 1;
let reduced = false;
let pointer = { x: 0, y: 0, inside: false };

function resize() {
  const el = host.value;
  const c = canvas.value;
  if (!el || !c) return;
  const r = el.getBoundingClientRect();
  w = r.width;
  h = r.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.floor(w * dpr);
  c.height = Math.floor(h * dpr);
  c.style.width = `${w}px`;
  c.style.height = `${h}px`;
  ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(x, y) {
  for (let i = 0; i < 3; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 1.6 - 0.4,
      life: 1,
      size: 1.5 + Math.random() * 2.5,
    });
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function tick() {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  if (pointer.inside && !reduced) {
    spawn(pointer.x, pointer.y);
  }

  ctx.globalCompositeOperation = "lighter";
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    p.life -= 0.018;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.fillStyle = `rgba(90, 160, 255, ${p.life * 0.75})`;
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  raf = requestAnimationFrame(tick);
}

function onMove(e) {
  const el = host.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  pointer.x = e.clientX - r.left;
  pointer.y = e.clientY - r.top;
  pointer.inside = true;
}

function onLeave() {
  pointer.inside = false;
}

function onResize() {
  resize();
}

onMounted(() => {
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  resize();
  window.addEventListener("resize", onResize);
  host.value?.addEventListener("pointermove", onMove);
  host.value?.addEventListener("pointerleave", onLeave);
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", onResize);
  host.value?.removeEventListener("pointermove", onMove);
  host.value?.removeEventListener("pointerleave", onLeave);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').particleTitle" :lead="t('lab').particleLead">
    <p class="lab-demo-code"><code>canvas · particle trail · rAF</code></p>
    <div ref="host" class="lab-particle">
      <canvas ref="canvas" class="lab-particle-canvas" aria-hidden="true"></canvas>
      <p class="lab-particle-hint">{{ t("lab").particleHint }}</p>
    </div>
  </LabDemoChrome>
</template>
