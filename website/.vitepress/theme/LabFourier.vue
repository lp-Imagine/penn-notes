<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const canvas = ref(null);
const harmonics = ref(12);
const drawing = ref(false);

let coeffs = [];
let scale = 1;
let raf = 0;
let running = false;
let sketch = [];
let down = false;

function heart(count = 96) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const p = (i / count) * Math.PI * 2;
    const x = 16 * Math.sin(p) ** 3;
    const y = -(13 * Math.cos(p) - 5 * Math.cos(2 * p) - 2 * Math.cos(3 * p) - Math.cos(4 * p));
    pts.push({ x, y });
  }
  return pts;
}

function resample(points, count) {
  if (points.length < 2) return points.slice();
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  const total = lengths[lengths.length - 1] || 1;
  const out = [];
  let cursor = 1;
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    while (cursor < lengths.length - 1 && lengths[cursor] < target) cursor += 1;
    const prev = cursor - 1;
    const span = lengths[cursor] - lengths[prev] || 1;
    const mix = (target - lengths[prev]) / span;
    out.push({
      x: points[prev].x + (points[cursor].x - points[prev].x) * mix,
      y: points[prev].y + (points[cursor].y - points[prev].y) * mix,
    });
  }
  return out;
}

function analyze(points) {
  const samples = resample(points, 80);
  let mx = 0;
  let my = 0;
  for (const p of samples) {
    mx += p.x;
    my += p.y;
  }
  mx /= samples.length;
  my /= samples.length;
  let reach = 1;
  for (const p of samples) {
    p.x -= mx;
    p.y -= my;
    reach = Math.max(reach, Math.hypot(p.x, p.y));
  }
  const n = samples.length;
  const next = [];
  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i++) {
      const phi = (Math.PI * 2 * k * i) / n;
      re += samples[i].x * Math.cos(phi) + samples[i].y * Math.sin(phi);
      im += samples[i].y * Math.cos(phi) - samples[i].x * Math.sin(phi);
    }
    re /= n;
    im /= n;
    next.push({
      freq: k,
      re,
      im,
      amp: Math.hypot(re, im),
      phase: Math.atan2(im, re),
    });
  }
  next.sort((a, b) => b.amp - a.amp);
  coeffs = next;
  const node = canvas.value;
  const box = Math.min(node?.clientWidth || 320, node?.clientHeight || 280);
  scale = (box * 0.34) / reach;
}

function tip(time, count) {
  const used = coeffs.slice(0, count);
  let x = 0;
  let y = 0;
  const circles = [];
  for (const item of used) {
    const angle = item.phase + Math.PI * 2 * item.freq * time;
    const nx = x + item.amp * Math.cos(angle);
    const ny = y + item.amp * Math.sin(angle);
    circles.push({ x, y, r: item.amp });
    x = nx;
    y = ny;
  }
  return { x, y, circles };
}

function paint(time) {
  const node = canvas.value;
  if (!node || !coeffs.length) return;
  const width = node.clientWidth || 640;
  const height = node.clientHeight || 280;
  node.width = width;
  node.height = height;
  const ctx = node.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  const count = Math.max(1, Math.min(harmonics.value, coeffs.length));
  const cx = width / 2;
  const cy = height / 2;
  ctx.beginPath();
  for (let i = 0; i <= 220; i++) {
    const p = tip(i / 220, count);
    const x = cx + p.x * scale;
    const y = cy + p.y * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "rgba(59, 91, 219, 0.9)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
  const now = tip(time, count);
  const dark = document.documentElement.classList.contains("dark");
  ctx.strokeStyle = dark ? "rgba(245, 245, 247, 0.38)" : "rgba(29, 29, 31, 0.35)";
  ctx.lineWidth = 1;
  for (const circle of now.circles) {
    const x = cx + circle.x * scale;
    const y = cy + circle.y * scale;
    const r = Math.abs(circle.r * scale);
    if (r > 1.5) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#c47a3a";
  ctx.beginPath();
  ctx.arc(cx + now.x * scale, cy + now.y * scale, 3.2, 0, Math.PI * 2);
  ctx.fill();
  void ox;
  void oy;
}

function frame(now) {
  if (!running) return;
  paint(((now || 0) / 1000) % 1);
  raf = window.requestAnimationFrame(frame);
}

function load(points) {
  analyze(points);
  paint(0);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || running) return;
  running = true;
  raf = window.requestAnimationFrame(frame);
}

function localPoint(event) {
  const node = canvas.value;
  const rect = node.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function onDown(event) {
  down = true;
  drawing.value = true;
  sketch = [localPoint(event)];
  nodeStroke();
}

function onMove(event) {
  if (!down) return;
  sketch.push(localPoint(event));
  nodeStroke();
}

function onUp() {
  if (!down) return;
  down = false;
  drawing.value = false;
  if (sketch.length > 8) load(sketch);
}

function nodeStroke() {
  const node = canvas.value;
  if (!node) return;
  const width = node.clientWidth || 640;
  const height = node.clientHeight || 280;
  if (node.width !== width) {
    node.width = width;
    node.height = height;
  }
  const ctx = node.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  sketch.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = "#3b5bdb";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function clearSketch() {
  sketch = [];
  coeffs = [];
  const node = canvas.value;
  const ctx = node?.getContext("2d");
  if (node && ctx) ctx.clearRect(0, 0, node.width, node.height);
}

function usePreset() {
  load(heart());
}

function onHarmonics(event) {
  harmonics.value = Number(event.target.value);
  paint(0);
}

onMounted(() => {
  usePreset();
});

onBeforeUnmount(() => {
  running = false;
  if (raf) window.cancelAnimationFrame(raf);
});
</script>

<template>
  <LabDemoChrome :title="t('lab').fourierTitle" :lead="t('lab').fourierLead">
    <canvas
      ref="canvas"
      class="lab-fourier-canvas"
      :aria-label="t('lab').fourierHint"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    />
    <div class="lab-field-controls">
      <label class="lab-field-label">
        <span>{{ t("lab").fourierHarmonics }} · {{ harmonics }}</span>
        <input
          type="range"
          min="1"
          max="28"
          step="1"
          :value="harmonics"
          @input="onHarmonics"
        />
      </label>
      <button type="button" class="lab-diff-preset" @click="usePreset">
        {{ t("lab").fourierPreset }}
      </button>
      <button type="button" class="lab-diff-preset lab-diff-preset--ghost" @click="clearSketch">
        {{ t("lab").fourierClear }}
      </button>
    </div>
    <p class="lab-field-hint">{{ t("lab").fourierHint }}</p>
  </LabDemoChrome>
</template>
