<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();

const PRESETS = [
  { id: "coral", f: 0.0545, k: 0.062 },
  { id: "worms", f: 0.046, k: 0.063 },
  { id: "maze", f: 0.029, k: 0.057 },
  { id: "spots", f: 0.035, k: 0.065 },
  { id: "mitosis", f: 0.0367, k: 0.0649 },
];

const W = 128;
const H = 72;
const presetId = ref("maze");
const canvas = ref(null);
const feed = computed(() => PRESETS.find((p) => p.id === presetId.value)?.f ?? 0.0545);
const kill = computed(() => PRESETS.find((p) => p.id === presetId.value)?.k ?? 0.062);

let U = new Float32Array(W * H);
let V = new Float32Array(W * H);
let nU = new Float32Array(W * H);
let nV = new Float32Array(W * H);
let timer = 0;
let running = false;
let image = null;
let ctx = null;
let painting = false;
let px = -1;
let py = -1;

function presetName(id) {
  const L = t("lab");
  if (id === "worms") return L.diffWorms;
  if (id === "maze") return L.diffMaze;
  if (id === "spots") return L.diffSpots;
  if (id === "mitosis") return L.diffMitosis;
  return L.diffCoral;
}

function seed() {
  U.fill(1);
  V.fill(0);
  for (let i = 0; i < W * H; i++) {
    if (Math.random() < 0.018) {
      U[i] = 0.5;
      V[i] = 0.25 + Math.random() * 0.05;
    }
  }
}

function paintCell(x, y) {
  for (let oy = -2; oy <= 2; oy++) {
    for (let ox = -2; ox <= 2; ox++) {
      const xx = x + ox;
      const yy = y + oy;
      if (xx < 1 || yy < 1 || xx >= W - 1 || yy >= H - 1) continue;
      const i = yy * W + xx;
      U[i] = 0.5;
      V[i] = 0.95;
    }
  }
}

function clamp01(n) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function step() {
  const f = feed.value;
  const k = kill.value;
  const Du = 0.2097;
  const Dv = 0.105;
  for (let x = 0; x < W; x++) {
    nU[x] = U[x];
    nV[x] = V[x];
    const b = (H - 1) * W + x;
    nU[b] = U[b];
    nV[b] = V[b];
  }
  for (let y = 0; y < H; y++) {
    const l = y * W;
    const r = l + W - 1;
    nU[l] = U[l];
    nV[l] = V[l];
    nU[r] = U[r];
    nV[r] = V[r];
  }
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const u = U[i];
      const v = V[i];
      const lap = (src) =>
        src[i - W - 1] * 0.05 +
        src[i - W] * 0.2 +
        src[i - W + 1] * 0.05 +
        src[i - 1] * 0.2 +
        src[i] * -1 +
        src[i + 1] * 0.2 +
        src[i + W - 1] * 0.05 +
        src[i + W] * 0.2 +
        src[i + W + 1] * 0.05;
      const uvv = u * v * v;
      nU[i] = clamp01(u + (Du * lap(U) - uvv + f * (1 - u)));
      nV[i] = clamp01(v + (Dv * lap(V) + uvv - (f + k) * v));
    }
  }
  const swapU = U;
  U = nU;
  nU = swapU;
  const swapV = V;
  V = nV;
  nV = swapV;
}

function draw() {
  if (!image || !ctx) return;
  const data = image.data;
  for (let i = 0; i < W * H; i++) {
    const v = V[i];
    const o = i * 4;
    const t = v <= 0.03 ? 0 : Math.min(1, (v - 0.03) / 0.5);
    const hot = t * t;
    data[o] = 14 + hot * 230 + t * 40;
    data[o + 1] = 16 + t * 78 + hot * 90;
    data[o + 2] = 28 + t * 190 - hot * 40;
    data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function frame() {
  if (!running) return;
  if (painting && px >= 0) paintCell(px, py);
  for (let n = 0; n < 8; n++) step();
  draw();
}

function cellFromEvent(event) {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect) return;
  px = Math.min(W - 2, Math.max(1, ((event.clientX - rect.left) / rect.width) * W)) | 0;
  py = Math.min(H - 2, Math.max(1, ((event.clientY - rect.top) / rect.height) * H)) | 0;
}

function onDown(event) {
  painting = true;
  canvas.value?.setPointerCapture?.(event.pointerId);
  cellFromEvent(event);
}

function onMove(event) {
  if (!painting) return;
  cellFromEvent(event);
}

function onUp() {
  painting = false;
}

function warm() {
  for (let n = 0; n < 700; n++) step();
  draw();
}

function selectPreset(id) {
  presetId.value = id;
  seed();
  warm();
}

function reset() {
  seed();
  warm();
}

onMounted(() => {
  const node = canvas.value;
  if (!node) return;
  node.width = W;
  node.height = H;
  ctx = node.getContext("2d", { alpha: false });
  if (!ctx) return;
  image = ctx.createImageData(W, H);
  seed();
  warm();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  running = true;
  timer = window.setInterval(frame, 40);
});

onBeforeUnmount(() => {
  running = false;
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').diffTitle" :lead="t('lab').diffLead">
    <canvas
      ref="canvas"
      class="lab-diff-canvas"
      :aria-label="t('lab').diffHint"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    />
    <div class="lab-diff-presets">
      <button
        v-for="p in PRESETS"
        :key="p.id"
        type="button"
        class="lab-diff-preset"
        :class="{ 'is-active': presetId === p.id }"
        @click="selectPreset(p.id)"
      >
        {{ presetName(p.id) }}
      </button>
      <button type="button" class="lab-diff-preset lab-diff-preset--ghost" @click="reset">
        {{ t("lab").diffReset }}
      </button>
    </div>
    <p class="lab-diff-readout">
      {{ t("lab").diffFeed }} {{ feed.toFixed(4) }}
      <span aria-hidden="true"> · </span>
      {{ t("lab").diffKill }} {{ kill.toFixed(4) }}
    </p>
    <p class="lab-field-hint">{{ t("lab").diffHint }}</p>
  </LabDemoChrome>
</template>
