<script setup>
import { ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const minCol = ref(120);
const gap = ref(12);

const cards = ["A", "B", "C", "D", "E", "F"];
</script>

<template>
  <LabDemoChrome :title="t('lab').gridTitle" :lead="t('lab').gridLead">
    <div class="lab-controls">
      <label class="lab-demo-control">
        <span class="lab-demo-control-label">{{ t("lab").gridMin }}</span>
        <input v-model.number="minCol" type="range" min="72" max="240" step="8" />
        <span class="lab-demo-control-val">{{ minCol }}px</span>
      </label>
      <label class="lab-demo-control">
        <span class="lab-demo-control-label">{{ t("lab").gapLabel }}</span>
        <input v-model.number="gap" type="range" min="0" max="28" />
        <span class="lab-demo-control-val">{{ gap }}px</span>
      </label>
    </div>

    <p class="lab-demo-code">
      <code
        >grid-template-columns: repeat(auto-fit, minmax({{ minCol }}px, 1fr)); gap:
        {{ gap }}px</code
      >
    </p>

    <div
      class="lab-grid-board"
      :style="{
        gap: `${gap}px`,
        gridTemplateColumns: `repeat(auto-fit, minmax(${minCol}px, 1fr))`,
      }"
    >
      <div v-for="c in cards" :key="c" class="lab-grid-card">{{ c }}</div>
    </div>
  </LabDemoChrome>
</template>
