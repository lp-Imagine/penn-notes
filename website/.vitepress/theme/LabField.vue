<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";
import { mountField } from "./lab-field";

const { t } = useI18n();
const canvas = ref(null);
const fallback = ref(false);
const warp = ref(1.35);
const speed = ref(1);
let field = null;

function onWarp(event) {
  const next = Number(event.target.value);
  warp.value = next;
  field?.setWarp(next);
}

function onSpeed(event) {
  const next = Number(event.target.value);
  speed.value = next;
  field?.setSpeed(next);
}

onMounted(() => {
  if (!canvas.value) return;
  field = mountField(canvas.value, {
    warp: warp.value,
    speed: speed.value,
  });
  fallback.value = !field;
});

onBeforeUnmount(() => {
  field?.destroy();
  field = null;
});
</script>

<template>
  <LabDemoChrome :title="t('lab').fieldTitle" :lead="t('lab').fieldLead">
    <p v-if="fallback" class="lab-field-fallback">{{ t("lab").fieldFallback }}</p>
    <canvas
      v-show="!fallback"
      ref="canvas"
      class="lab-field-canvas"
      :aria-label="t('lab').fieldHint"
    />
    <div v-if="!fallback" class="lab-field-controls">
      <label class="lab-field-label">
        <span>{{ t("lab").fieldWarp }} · {{ warp.toFixed(2) }}</span>
        <input
          type="range"
          min="0.2"
          max="2.6"
          step="0.01"
          :value="warp"
          @input="onWarp"
        />
      </label>
      <label class="lab-field-label">
        <span>{{ t("lab").fieldSpeed }} · {{ speed.toFixed(2) }}</span>
        <input
          type="range"
          min="0"
          max="2.4"
          step="0.01"
          :value="speed"
          @input="onSpeed"
        />
      </label>
    </div>
    <p class="lab-field-hint">{{ t("lab").fieldHint }}</p>
  </LabDemoChrome>
</template>
