<script setup lang="ts">
/**
 * giscus 评论组件（基于 GitHub Discussions）
 * 配置在 website/.vitepress/config.ts 的 themeConfig.giscus：
 * { repo, repoId, category, categoryId } —— repoId/categoryId 为空时不渲染。
 * SPA 换文时按 pathname 重新挂载，避免评论仍挂在上一篇。
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";

const { theme } = useData();
const route = useRoute();
const host = ref<HTMLElement | null>(null);

const giscus = theme.value.giscus as
  | { repo?: string; repoId?: string; category?: string; categoryId?: string }
  | undefined;

const enabled = Boolean(
  giscus && giscus.repo && giscus.repoId && giscus.category && giscus.categoryId,
);

let themeObserver: MutationObserver | undefined;

function currentTheme(): string {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function clearHost() {
  const el = host.value;
  if (!el) return;
  el.innerHTML = "";
  const mount = document.createElement("div");
  mount.className = "giscus";
  el.appendChild(mount);
}

function loadGiscus() {
  if (!enabled || !host.value) return;
  clearHost();
  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.setAttribute("data-repo", giscus!.repo!);
  script.setAttribute("data-repo-id", giscus!.repoId!);
  script.setAttribute("data-category", giscus!.category!);
  script.setAttribute("data-category-id", giscus!.categoryId!);
  script.setAttribute("data-mapping", "pathname");
  script.setAttribute("data-strict", "0");
  script.setAttribute("data-reactions-enabled", "1");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "bottom");
  script.setAttribute("data-theme", currentTheme());
  script.setAttribute("data-lang", "zh-CN");
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;
  host.value.appendChild(script);
}

function syncGiscusTheme() {
  const iframe = host.value?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: currentTheme() } } },
    "https://giscus.app",
  );
}

onMounted(() => {
  loadGiscus();
  themeObserver = new MutationObserver(syncGiscusTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

watch(
  () => route.path,
  () => {
    loadGiscus();
  },
);

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = undefined;
});
</script>

<template>
  <div v-if="enabled" ref="host" class="giscus-host">
    <div class="giscus" />
  </div>
</template>

<style scoped>
.giscus-host {
  margin-top: 48px;
  padding-top: 40px;
  border-top: 1px solid var(--border);
}
</style>
