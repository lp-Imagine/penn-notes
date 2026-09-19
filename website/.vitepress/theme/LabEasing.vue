<script setup>
import { ref } from "vue";
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const tick = ref(0);

const curves = [
  { id: "linear", label: "linear", css: "linear" },
  { id: "ease", label: "ease", css: "ease" },
  { id: "ease-in-out", label: "ease-in-out", css: "ease-in-out" },
  {
    id: "springy",
    label: "cubic-bezier",
    css: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
];

function toggle() {
  tick.value += 1;
}
</script>

<template>
  <LabDemoChrome :title="t('lab').easeTitle" :lead="t('lab').easeLead">
    <div class="lab-ease-toolbar">
      <button type="button" class="lab-demo-btn" @click="toggle">
        {{ t("lab").easeReplay }}
      </button>
    </div>

    <ul class="lab-ease-list">
      <li v-for="c in curves" :key="`${c.id}-${tick}`" class="lab-ease-row">
        <div class="lab-ease-meta">
          <span class="lab-ease-name">{{ c.label }}</span>
          <code class="lab-ease-code">{{ c.css }}</code>
        </div>
        <div class="lab-ease-track">
          <span
            class="lab-ease-dot is-running"
            :style="{ animationTimingFunction: c.css }"
          ></span>
        </div>
      </li>
    </ul>
  </LabDemoChrome>
</template>
