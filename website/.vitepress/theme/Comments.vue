<script setup lang="ts">
/**
 * giscus 评论组件（基于 GitHub Discussions）
 * 配置在 website/.vitepress/config.ts 的 themeConfig.giscus：
 * { repo, repoId, category, categoryId } —— repoId/categoryId 为空时不渲染。
 * repoId / categoryId 获取：仓库开启 Discussions → 访问 https://giscus.app 按提示配置后复制。
 */
import { onMounted } from "vue";
import { useData } from "vitepress";

const { theme } = useData();

const giscus = theme.value.giscus as
  | { repo?: string; repoId?: string; category?: string; categoryId?: string }
  | undefined;

const enabled = Boolean(
  giscus && giscus.repo && giscus.repoId && giscus.category && giscus.categoryId,
);

let initialized = false;

function currentTheme(): string {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function loadGiscus() {
  if (initialized || !enabled) return;
  initialized = true;
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
  document.querySelector(".giscus-host")?.appendChild(script);
}

function syncGiscusTheme() {
  const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
  iframe?.contentWindow?.postMessage(
    { giscus: { setConfig: { theme: currentTheme() } } },
    "https://giscus.app",
  );
}

onMounted(() => {
  loadGiscus();
  // 跟随站点亮/暗切换
  const observer = new MutationObserver(syncGiscusTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});
</script>

<template>
  <div v-if="enabled" class="giscus-host">
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
