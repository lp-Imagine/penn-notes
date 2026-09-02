<script setup lang="ts">
/**
 * giscus 评论（GitHub Discussions）
 * - 懒加载：滚到评论区附近再注入脚本
 * - SPA：首载后通过 postMessage 切换 term
 * - 主题：Giscus 内置 light / dark_dimmed（比自托管 CSS 更稳定）
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";

const { theme } = useData();
const route = useRoute();
const root = ref<HTMLElement | null>(null);
const host = ref<HTMLElement | null>(null);

const giscus = theme.value.giscus as
  | { repo?: string; repoId?: string; category?: string; categoryId?: string }
  | undefined;

const enabled = Boolean(
  giscus && giscus.repo && giscus.repoId && giscus.category && giscus.categoryId,
);

let themeObserver: MutationObserver | undefined;
let loadObserver: IntersectionObserver | undefined;
let scriptMounted = false;
let giscusReady = false;

function giscusThemeName() {
  return document.documentElement.classList.contains("dark")
    ? "dark_dimmed"
    : "light";
}

/** 与 data-mapping="pathname" 一致 */
function discussionTerm() {
  const path = decodeURI(window.location.pathname).replace(/\/$/, "");
  return path || "/";
}

function getIframe() {
  return host.value?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
}

function sendGiscusMessage(message: Record<string, unknown>) {
  getIframe()?.contentWindow?.postMessage({ giscus: message }, "https://giscus.app");
}

function clearHost() {
  const el = host.value;
  if (!el) return;
  el.innerHTML = "";
  const mount = document.createElement("div");
  mount.className = "giscus";
  el.appendChild(mount);
}

function mountGiscusScript() {
  if (!enabled || !host.value || scriptMounted) return;
  scriptMounted = true;
  giscusReady = false;
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
  script.setAttribute("data-theme", giscusThemeName());
  script.setAttribute("data-lang", "zh-CN");
  script.setAttribute("crossorigin", "anonymous");
  script.async = true;
  host.value.appendChild(script);
}

function syncGiscusTheme() {
  if (!giscusReady) return;
  sendGiscusMessage({ setConfig: { theme: giscusThemeName() } });
}

function syncGiscusTerm() {
  if (!giscusReady) return;
  sendGiscusMessage({ setConfig: { term: discussionTerm() } });
}

function onGiscusMessage(event: MessageEvent) {
  if (event.origin !== "https://giscus.app" || !event.data?.giscus) return;
  giscusReady = true;
  // 首载已由 script data-* 带好 term/theme，勿再 setConfig，避免重复打 /api/discussions
}

function setupLazyLoad() {
  if (!enabled || !root.value || typeof IntersectionObserver === "undefined") {
    mountGiscusScript();
    return;
  }
  loadObserver?.disconnect();
  loadObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      mountGiscusScript();
      loadObserver?.disconnect();
      loadObserver = undefined;
    },
    { rootMargin: "240px 0px" },
  );
  loadObserver.observe(root.value);
}

onMounted(() => {
  if (!enabled) return;
  window.addEventListener("message", onGiscusMessage);
  setupLazyLoad();
  themeObserver = new MutationObserver(() => syncGiscusTheme());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
});

watch(
  () => route.path,
  () => {
    syncGiscusTerm();
  },
);

onBeforeUnmount(() => {
  window.removeEventListener("message", onGiscusMessage);
  themeObserver?.disconnect();
  themeObserver = undefined;
  loadObserver?.disconnect();
  loadObserver = undefined;
});
</script>

<template>
  <section v-if="enabled" ref="root" class="comments-section" aria-label="评论">
    <div class="comments-panel">
      <header class="comments-head">
        <h2 class="comments-title">评论</h2>
        <p class="comments-hint">
          使用 GitHub 账号登录后即可留言；需能正常访问 GitHub。
        </p>
      </header>
      <div ref="host" class="giscus-host">
        <div class="giscus" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.comments-section {
  margin-top: 36px;
}

.comments-panel {
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--border) 92%, transparent);
  background: var(--surface);
  padding: 18px 18px 14px;
  box-shadow: var(--shadow-sm);
}

.comments-head {
  margin: 0 0 14px;
  padding-bottom: 12px;
  background: var(--divider-fade) no-repeat bottom / 100% 1px;
}

.comments-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text);
}

.comments-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-3);
}

.giscus-host {
  min-height: 80px;
  margin: 0 -4px;
}

.giscus-host :deep(iframe.giscus-frame) {
  display: block;
  width: 100%;
  min-height: 132px;
  border: 0;
  color-scheme: light dark;
}

.dark .comments-panel {
  border-color: color-mix(in srgb, var(--border-strong) 82%, var(--border));
  background: var(--surface);
  box-shadow: none;
}
</style>
