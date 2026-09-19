<script setup>
import { computed, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const min = ref(14);
const preferred = ref(2.2);
const max = ref(40);
const width = ref(480);

const fontSize = computed(() => {
  const preferPx = (preferred.value / 100) * width.value;
  return Math.min(max.value, Math.max(min.value, preferPx));
});

const clampExpr = computed(
  () =>
    `clamp(${min.value}px, ${preferred.value}vw, ${max.value}px)`
);
</script>

<template>
  <LabDemoChrome :title="t('lab').clampTitle" :lead="t('lab').clampLead">
    <div class="lab-controls">
      <label class="lab-demo-control">
        <span class="lab-demo-control-label">{{ t("lab").clampMin }}</span>
        <input v-model.number="min" type="range" min="10" max="24" />
        <span class="lab-demo-control-val">{{ min }}px</span>
      </label>
      <label class="lab-demo-control">
        <span class="lab-demo-control-label">{{ t("lab").clampPref }}</span>
        <input v-model.number="preferred" type="range" min="1" max="6" step="0.1" />
        <span class="lab-demo-control-val">{{ preferred.toFixed(1) }}vw</span>
      </label>
      <label class="lab-demo-control">
        <span class="lab-demo-control-label">{{ t("lab").clampMax }}</span>
        <input v-model.number="max" type="range" min="24" max="64" />
        <span class="lab-demo-control-val">{{ max }}px</span>
      </label>
      <label class="lab-demo-control">
        <span class="lab-demo-control-label">{{ t("lab").clampWidth }}</span>
        <input v-model.number="width" type="range" min="240" max="720" step="8" />
        <span class="lab-demo-control-val">{{ width }}px</span>
      </label>
    </div>

    <p class="lab-demo-code"><code>{{ clampExpr }}</code></p>

    <div class="lab-clamp-frame" :style="{ width: `${width}px` }">
      <p class="lab-clamp-sample" :style="{ fontSize: `${fontSize}px` }">
        {{ t("lab").clampSample }}
      </p>
      <p class="lab-clamp-meta">
        ≈ {{ fontSize.toFixed(1) }}px
        <span aria-hidden="true">·</span>
        {{ t("lab").clampHint }}
      </p>
    </div>
  </LabDemoChrome>
</template>
