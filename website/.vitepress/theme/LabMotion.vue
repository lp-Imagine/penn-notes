<script setup>
import { onBeforeUnmount, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const stage = ref(null);
const live = ref(false);
const message = ref("");
const threshold = ref(36);

const W = 160;
const H = 90;
let stream = null;
let video = null;
let timer = 0;
let prev = null;
let trail = null;

function stop() {
  window.clearInterval(timer);
  timer = 0;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  if (video) {
    video.srcObject = null;
    video.remove();
    video = null;
  }
  prev = null;
  live.value = false;
}

function paint() {
  const canvas = stage.value;
  if (!canvas || !video || video.readyState < 2) return;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  if (canvas.width !== W) {
    canvas.width = W;
    canvas.height = H;
  }
  ctx.drawImage(video, 0, 0, W, H);
  const frame = ctx.getImageData(0, 0, W, H);
  const data = frame.data;
  if (!prev || !trail) {
    prev = new Uint8ClampedArray(data);
    trail = new Uint8ClampedArray(data.length);
    return;
  }
  const gate = threshold.value;
  for (let i = 0; i < data.length; i += 4) {
    const delta =
      Math.abs(data[i] - prev[i]) +
      Math.abs(data[i + 1] - prev[i + 1]) +
      Math.abs(data[i + 2] - prev[i + 2]);
    const hot = delta > gate;
    trail[i] = hot ? 214 : trail[i] * 0.82;
    trail[i + 1] = hot ? 168 : trail[i + 1] * 0.8;
    trail[i + 2] = hot ? 92 : trail[i + 2] * 0.86;
    trail[i + 3] = 255;
    prev[i] = data[i];
    prev[i + 1] = data[i + 1];
    prev[i + 2] = data[i + 2];
  }
  frame.data.set(trail);
  ctx.putImageData(frame, 0, 0);
}

async function start() {
  message.value = "";
  if (!navigator.mediaDevices?.getUserMedia) {
    message.value = t("lab").motionMissing;
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640 } },
    });
  } catch (error) {
    message.value =
      error && error.name === "NotAllowedError"
        ? t("lab").motionDenied
        : t("lab").motionMissing;
    return;
  }
  video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.srcObject = stream;
  await video.play();
  live.value = true;
  timer = window.setInterval(paint, 50);
}

function onThreshold(event) {
  threshold.value = Number(event.target.value);
}

onBeforeUnmount(stop);
</script>

<template>
  <LabDemoChrome :title="t('lab').motionTitle" :lead="t('lab').motionLead">
    <canvas ref="stage" class="lab-motion-stage" :aria-label="t('lab').motionHint" />
    <div class="lab-field-controls">
      <button type="button" class="lab-diff-preset" @click="live ? stop() : start()">
        {{ live ? t("lab").motionStop : t("lab").motionStart }}
      </button>
      <label class="lab-field-label">
        <span>{{ t("lab").motionThreshold }} · {{ threshold }}</span>
        <input
          type="range"
          min="12"
          max="90"
          step="1"
          :value="threshold"
          @input="onThreshold"
        />
      </label>
    </div>
    <p class="lab-field-hint">{{ message || t("lab").motionHint }}</p>
  </LabDemoChrome>
</template>
