<script setup>
import { useRouter, withBase } from "vitepress";
import { useI18n } from "./i18n";

defineProps({
  title: { type: String, required: true },
  lead: { type: String, required: true },
});

const { t } = useI18n();
const router = useRouter();

function samePath(a, b) {
  const trim = (p) => p.replace(/\/+$/, "") || "/";
  return trim(a) === trim(b);
}

function back() {
  const target = withBase("/lab/");
  const next = new URL(target, location.origin).pathname;
  const landed = () =>
    samePath(location.pathname, next) && document.querySelector(".lab-demos");
  if (samePath(location.pathname, next)) {
    if (!landed()) location.assign(next);
    return;
  }
  router.go(target);
  window.setTimeout(() => {
    if (samePath(location.pathname, next) && !document.querySelector(".lab-demos")) {
      location.assign(next);
    }
  }, 600);
}
</script>

<template>
  <div class="lab-demo">
    <button type="button" class="lab-demo-back" @click="back">
      {{ t("lab").back }}
    </button>
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
