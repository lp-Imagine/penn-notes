<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const stage = ref(null);
const scene = ref(null);
const grain = ref(null);
const count = ref(48);
const trail = ref(70);
const glow = ref(150);
const noise = ref(26);

let raf = 0;
let running = false;
let reduced = false;
let particles = [];
let width = 0;
let height = 0;
let frame = 0;
let sceneCtx = null;
let grainCtx = null;
let tile = null;
let tileCtx = null;
let observer = null;
const pointer = { x: 0, y: 0, inside: false };
const smooth = { x: 0, y: 0 };

function ensureTile() {
  if (tile) return;
  tile = document.createElement("canvas");
  tile.width = 160;
  tile.height = 160;
  tileCtx = tile.getContext("2d", { willReadFrequently: true });
  refreshTile();
}

function refreshTile() {
  if (!tileCtx) return;
  const image = tileCtx.createImageData(160, 160);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = 70 + Math.random() * 185;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = Math.floor(Math.random() * 255);
  }
  tileCtx.putImageData(image, 0, 0);
}

function resize() {
  const host = stage.value;
  const sceneCanvas = scene.value;
  const grainCanvas = grain.value;
  if (!host || !sceneCanvas || !grainCanvas) return;
  const rect = host.getBoundingClientRect();
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (const canvas of [sceneCanvas, grainCanvas]) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  sceneCtx = sceneCanvas.getContext("2d");
  grainCtx = grainCanvas.getContext("2d");
  sceneCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  grainCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!pointer.inside) {
    pointer.x = width * 0.5;
    pointer.y = height * 0.46;
    smooth.x = pointer.x;
    smooth.y = pointer.y;
  }
}

function spawn(x, y, amount) {
  const cap = 90 + Math.round(count.value * 3.2);
  for (let i = 0; i < amount; i++) {
    if (particles.length > cap) particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.25 + Math.random() * 1.7;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.004 + (1 - trail.value / 100) * 0.03 + Math.random() * 0.008,
      r: 0.7 + Math.random() * 2.2,
      hue: Math.random() > 0.7 ? 32 : 214,
    });
  }
}

function drawScene(ts) {
  if (!sceneCtx || width < 2 || height < 2) return;
  const ctx = sceneCtx;
  if (!pointer.inside && !reduced) {
    const time = ts / 1000;
    pointer.x = width * (0.5 + Math.cos(time * 0.32) * 0.16);
    pointer.y = height * (0.46 + Math.sin(time * 0.27) * 0.1);
  }
  smooth.x += (pointer.x - smooth.x) * (reduced ? 1 : 0.18);
  smooth.y += (pointer.y - smooth.y) * (reduced ? 1 : 0.18);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0e1218";
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    Math.min(width, height) * 0.1,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.72
  );
  vignette.addColorStop(0, "rgba(36, 52, 78, 0.35)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  const radius = Math.max(24, glow.value);
  const halo = ctx.createRadialGradient(smooth.x, smooth.y, 0, smooth.x, smooth.y, radius);
  halo.addColorStop(0, "rgba(186, 214, 255, 0.85)");
  halo.addColorStop(0.28, "rgba(126, 182, 255, 0.38)");
  halo.addColorStop(0.62, "rgba(212, 146, 74, 0.16)");
  halo.addColorStop(1, "rgba(126, 182, 255, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);

  if (!reduced) {
    const burst = pointer.inside ? 1 + Math.round((count.value / 96) * 6) : frame % 4 === 0 ? 1 : 0;
    if (burst) spawn(smooth.x, smooth.y, burst);
  } else if (!particles.length) {
    spawn(smooth.x, smooth.y, 18);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += reduced ? 0 : p.vx;
    p.y += reduced ? 0 : p.vy;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= reduced ? 0 : p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.fillStyle = `hsla(${p.hue}, 86%, 72%, ${Math.max(0, p.life)})`;
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrain() {
  if (!grainCtx || !tile || width < 2) return;
  grainCtx.clearRect(0, 0, width, height);
  const amount = noise.value / 100;
  if (amount <= 0.01) return;
  const pattern = grainCtx.createPattern(tile, "repeat");
  if (!pattern) return;
  grainCtx.globalAlpha = amount * 0.9;
  grainCtx.fillStyle = pattern;
  grainCtx.fillRect(0, 0, width, height);
  grainCtx.globalAlpha = 1;
}

function frameTick(ts) {
  if (!running) return;
  frame += 1;
  if (!reduced && noise.value > 1 && frame % 3 === 0) refreshTile();
  drawScene(ts);
  drawGrain();
  raf = window.requestAnimationFrame(frameTick);
}

function renderStill() {
  drawScene(0);
  drawGrain();
}

function pointFrom(event) {
  const host = stage.value;
  if (!host) return;
  const rect = host.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.inside = true;
  if (reduced) {
    smooth.x = pointer.x;
    smooth.y = pointer.y;
    spawn(pointer.x, pointer.y, 2);
    renderStill();
  }
}

function onLeave() {
  pointer.inside = false;
}

function onControl() {
  if (reduced) renderStill();
}

function onVisibility() {
  if (reduced) return;
  if (document.hidden) {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    return;
  }
  if (!running) {
    running = true;
    raf = window.requestAnimationFrame(frameTick);
  }
}

onMounted(() => {
  reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  ensureTile();
  resize();
  observer = new ResizeObserver(() => {
    resize();
    if (reduced) renderStill();
  });
  if (stage.value) observer.observe(stage.value);
  document.addEventListener("visibilitychange", onVisibility);
  if (reduced) {
    renderStill();
    return;
  }
  running = true;
  raf = window.requestAnimationFrame(frameTick);
});

onBeforeUnmount(() => {
  running = false;
  if (raf) window.cancelAnimationFrame(raf);
  observer?.disconnect();
  observer = null;
  document.removeEventListener("visibilitychange", onVisibility);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').effectsTitle" :lead="t('lab').effectsLead">
    <div
      ref="stage"
      class="lab-fx"
      role="application"
      :aria-label="t('lab').effectsHint"
      @pointermove="pointFrom"
      @pointerdown="pointFrom"
      @pointerleave="onLeave"
    >
      <canvas ref="scene" class="lab-fx-scene" />
      <div class="lab-fx-glass">
        <p class="lab-fx-kicker">{{ t("lab").effectsGlassKicker }}</p>
        <p class="lab-fx-title">{{ t("lab").effectsGlassTitle }}</p>
        <p class="lab-fx-body">{{ t("lab").effectsGlassBody }}</p>
      </div>
      <canvas ref="grain" class="lab-fx-grain" aria-hidden="true" />
      <p class="lab-fx-hint">{{ t("lab").effectsHint }}</p>
    </div>
    <div class="lab-field-controls">
      <label class="lab-field-label">
        <span>{{ t("lab").effectsParticles }} · {{ count }}</span>
        <input v-model.number="count" type="range" min="8" max="96" step="1" @input="onControl" />
      </label>
      <label class="lab-field-label">
        <span>{{ t("lab").effectsTrail }} · {{ trail }}</span>
        <input v-model.number="trail" type="range" min="0" max="100" step="1" @input="onControl" />
      </label>
      <label class="lab-field-label">
        <span>{{ t("lab").effectsGlow }} · {{ glow }}</span>
        <input v-model.number="glow" type="range" min="48" max="260" step="1" @input="onControl" />
      </label>
      <label class="lab-field-label">
        <span>{{ t("lab").effectsGrain }} · {{ noise }}</span>
        <input v-model.number="noise" type="range" min="0" max="80" step="1" @input="onControl" />
      </label>
    </div>
  </LabDemoChrome>
</template>
