<script setup>
import { onBeforeUnmount, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const wave = ref(null);
const failed = ref(false);
const active = ref(0);

const notes = [
  { id: "d3", name: "D3", freq: 146.83 },
  { id: "a3", name: "A3", freq: 220 },
  { id: "d4", name: "D4", freq: 293.66 },
  { id: "fs4", name: "F♯4", freq: 369.99 },
  { id: "a4", name: "A4", freq: 440 },
  { id: "d5", name: "D5", freq: 587.33 },
];

let audio = null;
let timer = 0;

function context() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  return audio;
}

function synthesize(freq, brightness) {
  const ctx = context();
  if (!ctx) return null;
  const sr = ctx.sampleRate;
  const length = Math.max(8, Math.round(sr / freq));
  const damp = 0.99 + brightness * 0.007;
  const total = Math.floor(sr * 1.5);
  const burst = new Float32Array(length);
  for (let i = 0; i < length; i++) burst[i] = Math.random() * 2 - 1;
  const out = new Float32Array(total);
  let prev = 0;
  for (let i = 0; i < total; i++) {
    const j = i % length;
    const sample = (burst[j] + prev) * 0.5 * damp;
    burst[j] = sample;
    prev = sample;
    out[i] = sample;
  }
  return { ctx, out };
}

function drawWave(samples) {
  const canvas = wave.value;
  if (!canvas) return;
  const width = canvas.clientWidth || 640;
  const height = 96;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  const step = Math.max(1, Math.floor(samples.length / width));
  for (let x = 0; x < width; x++) {
    const i = Math.min(samples.length - 1, x * step);
    const y = height * 0.5 - samples[i] * height * 0.42;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#3b5bdb";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

async function play(note, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const brightness = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
  const made = synthesize(note.freq, Math.min(1, Math.max(0, brightness)));
  if (!made) {
    failed.value = true;
    return;
  }
  failed.value = false;
  if (made.ctx.state === "suspended") await made.ctx.resume();
  const buffer = made.ctx.createBuffer(1, made.out.length, made.ctx.sampleRate);
  buffer.copyToChannel(made.out, 0);
  const source = made.ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(made.ctx.destination);
  source.start();
  drawWave(made.out);
  active.value = note.freq;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (active.value === note.freq) active.value = 0;
  }, 420);
}

onBeforeUnmount(() => {
  window.clearTimeout(timer);
  audio?.close?.();
  audio = null;
});
</script>

<template>
  <LabDemoChrome :title="t('lab').pluckTitle" :lead="t('lab').pluckLead">
    <div class="lab-pluck" :aria-label="t('lab').pluckHint">
      <button
        v-for="note in notes"
        :key="note.id"
        type="button"
        class="lab-pluck-string"
        :class="{ 'is-on': active === note.freq }"
        @click="play(note, $event)"
      >
        <span class="lab-pluck-name">{{ note.name }}</span>
        <span class="lab-pluck-wire" />
        <span class="lab-pluck-hz">{{ Math.round(note.freq) }}</span>
      </button>
    </div>
    <canvas ref="wave" class="lab-pluck-wave" aria-hidden="true" />
    <p v-if="failed" class="lab-field-hint">{{ t("lab").pluckFallback }}</p>
    <p v-else class="lab-field-hint">{{ t("lab").pluckHint }}</p>
  </LabDemoChrome>
</template>
