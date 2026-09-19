<script setup>
import { computed, ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const amount = ref(40);
const a = "#2a6f97";
const b = "#e9c46a";

const mixed = computed(
  () => `color-mix(in srgb, ${a} ${amount.value}%, ${b})`
);
</script>

<template>
  <LabDemoChrome :title="t('lab').mixTitle" :lead="t('lab').mixLead">
    <label class="lab-demo-control">
      <span class="lab-demo-control-label">{{ t("lab").mixAmount }}</span>
      <input v-model.number="amount" type="range" min="0" max="100" />
      <span class="lab-demo-control-val">{{ amount }}%</span>
    </label>

    <p class="lab-demo-code"><code>{{ mixed }}</code></p>

    <div class="lab-mix-swatches">
      <div class="lab-mix-chip" :style="{ background: a }">
        <span>A</span>
      </div>
      <div class="lab-mix-chip lab-mix-chip--result" :style="{ background: mixed }">
        <span>{{ amount }}%</span>
      </div>
      <div class="lab-mix-chip" :style="{ background: b }">
        <span>B</span>
      </div>
    </div>
  </LabDemoChrome>
</template>
