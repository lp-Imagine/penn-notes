<script setup>
import LabDemoChrome from "./LabDemoChrome.vue";
import { useI18n } from "./i18n";

const { t } = useI18n();

const slides = [
  { id: "01", tone: "ink" },
  { id: "02", tone: "sand" },
  { id: "03", tone: "mint" },
  { id: "04", tone: "rose" },
];
</script>

<template>
  <LabDemoChrome :title="t('lab').snapTitle" :lead="t('lab').snapLead">
    <p class="lab-demo-code">
      <code>scroll-snap-type: x mandatory · scroll-snap-align: start</code>
    </p>
    <p class="lab-snap-hint">{{ t("lab").snapHint }}</p>
    <div class="lab-snap-track" tabindex="0">
      <article
        v-for="s in slides"
        :key="s.id"
        class="lab-snap-slide"
        :class="`lab-snap-slide--${s.tone}`"
      >
        <span class="lab-snap-idx">{{ s.id }}</span>
        <span class="lab-snap-label">{{ t("lab").snapSlide }}</span>
      </article>
    </div>
  </LabDemoChrome>
</template>
