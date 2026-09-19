<script setup>
import { ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const gap = ref(16);
</script>

<template>
  <LabDemoChrome :title="t('lab').flexTitle" :lead="t('lab').flexLead">
    <label class="lab-demo-control">
      <span class="lab-demo-control-label">{{ t("lab").gapLabel }}</span>
      <input
        id="lab-flex-gap"
        v-model.number="gap"
        type="range"
        min="0"
        max="40"
      />
      <span class="lab-demo-control-val">{{ gap }}px</span>
    </label>

    <div class="lab-flex-compare">
      <article class="lab-flex-pane">
        <h2 class="lab-demo-heading">{{ t("lab").gapWay }}</h2>
        <p class="lab-demo-code"><code>gap: {{ gap }}px</code></p>
        <div
          class="lab-flex-row lab-flex-row--gap"
          :style="{ gap: `${gap}px` }"
        >
          <div class="lab-flex-cell">A</div>
          <div class="lab-flex-cell">B</div>
          <div class="lab-flex-cell">C</div>
          <div class="lab-flex-cell">D</div>
        </div>
      </article>

      <article class="lab-flex-pane">
        <h2 class="lab-demo-heading">{{ t("lab").marginWay }}</h2>
        <p class="lab-demo-code">
          <code>margin: ±{{ Math.round(gap / 2) }}px</code>
        </p>
        <div
          class="lab-flex-row lab-flex-row--margin"
          :style="{ margin: `-${gap / 2}px` }"
        >
          <div
            v-for="label in ['A', 'B', 'C', 'D']"
            :key="label"
            class="lab-flex-cell"
            :style="{ margin: `${gap / 2}px` }"
          >
            {{ label }}
          </div>
        </div>
      </article>
    </div>
  </LabDemoChrome>
</template>
