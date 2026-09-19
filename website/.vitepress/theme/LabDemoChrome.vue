<script setup>
import { withBase } from "vitepress";
import { useI18n } from "./i18n";

defineProps({
  title: { type: String, required: true },
  lead: { type: String, required: true },
});

const { t } = useI18n();

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <div class="lab-demo">
    <a class="lab-demo-back" :href="href('/lab/')">{{ t("lab").back }}</a>
    <header class="lab-demo-hero">
      <p class="lab-demo-kicker">Lab</p>
      <h1 class="lab-demo-title">{{ title }}</h1>
      <p class="lab-demo-lead">{{ lead }}</p>
    </header>
    <section class="lab-demo-board">
      <slot />
    </section>
  </div>
</template>
