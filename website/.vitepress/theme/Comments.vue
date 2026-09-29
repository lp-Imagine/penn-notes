<script setup lang="ts">
/**
 * Artalk 评论
 * - 懒加载：滚到评论区附近再初始化
 * - SPA：换页后 update pageKey 并 reload
 * - 配色跟站点 CSS 变量（浅色 / 深色 / 专注模式）
 * - 图片经 /api/comment-images 压缩后进 COS，不直传桶
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRoute, withBase } from "vitepress";
import { useI18n } from "./i18n";

const MAIN_ORIGIN = "https://penn-notes.draftly.cn";

const { theme, site } = useData();
const route = useRoute();
const { t, uiLocale } = useI18n();
const root = ref<HTMLElement | null>(null);
const host = ref<HTMLElement | null>(null);

const artalkConf = theme.value.artalk as { server?: string; site?: string } | undefined;
const enabled = Boolean(artalkConf?.server && artalkConf?.site);

const ARTALK_VARS: Record<string, string> = {
  "--at-color-font": "var(--text)",
  "--at-color-deep": "var(--text)",
  "--at-color-sub": "var(--text-3)",
  "--at-color-grey": "var(--text-3)",
  "--at-color-meta": "var(--text-3)",
  "--at-color-border": "var(--border)",
  "--at-color-light": "var(--accent)",
  "--at-color-bg": "var(--surface)",
  "--at-color-bg-transl": "var(--surface)",
  "--at-color-bg-grey": "var(--bg)",
  "--at-color-bg-grey-transl": "var(--bg)",
  "--at-color-main": "var(--accent)",
  "--at-color-gradient": "linear-gradient(180deg, transparent, var(--surface))",
};

function paintArtalk(el: HTMLElement) {
  for (const [key, value] of Object.entries(ARTALK_VARS)) {
    el.style.setProperty(key, value);
  }
}

type ArtalkInstance = {
  update: (conf: Record<string, unknown>) => void;
  reload: () => void;
  destroy: () => void;
};

let artalk: ArtalkInstance | undefined;
let loadObserver: IntersectionObserver | undefined;
let zhTWLocale: unknown;

function pageKey() {
  const base = site.value.base || "/";
  let path = decodeURI(window.location.pathname);
  if (base !== "/" && path.startsWith(base)) {
    path = "/" + path.slice(base.length).replace(/^\/+/, "");
  }
  path = path.replace(/\/$/, "") || "/";
  return path;
}

function commentImageEndpoint() {
  const hostName = window.location.hostname;
  if (
    hostName === "penn-notes.draftly.cn" ||
    hostName === "localhost" ||
    hostName === "127.0.0.1"
  ) {
    return "/api/comment-images";
  }
  return `${MAIN_ORIGIN}/api/comment-images`;
}

async function artalkLocale() {
  const ui = uiLocale.value;
  if (ui === "en") return "en";
  if (ui === "zh-TW") {
    if (!zhTWLocale) {
      const mod = await import("artalk/i18n/zh-TW");
      zhTWLocale = (mod as { default?: unknown }).default ?? mod;
    }
    return zhTWLocale;
  }
  return "zh-CN";
}

async function uploadCommentImage(file: File) {
  const res = await fetch(commentImageEndpoint(), {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  let data: { url?: string; message?: string } = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || !data.url) {
    throw new Error(data.message || "图片上传失败");
  }
  return data.url;
}

async function mountArtalk() {
  if (!enabled || !host.value || artalk) return;
  const [{ default: Artalk }] = await Promise.all([
    import("artalk"),
    import("artalk/Artalk.css"),
  ]);
  const locale = await artalkLocale();
  artalk = Artalk.init({
    el: host.value,
    pageKey: pageKey(),
    pageTitle: document.title,
    server: artalkConf!.server!,
    site: artalkConf!.site!,
    locale: locale as string,
    darkMode: false,
    preferRemoteConf: false,
    versionCheck: false,
    uaBadge: true,
    imgUpload: true,
    imgUploader: uploadCommentImage,
    emoticons: withBase("/vendor/artalk/emoticons.json"),
    gravatar: {
      mirror: "https://weavatar.com/avatar/",
      params: "sha256=1&d=mp&s=240",
    },
  });
  paintArtalk(host.value);
}

function setupLazyLoad() {
  if (!enabled || !root.value || typeof IntersectionObserver === "undefined") {
    void mountArtalk();
    return;
  }
  loadObserver?.disconnect();
  loadObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      void mountArtalk();
      loadObserver?.disconnect();
      loadObserver = undefined;
    },
    { rootMargin: "240px 0px" },
  );
  loadObserver.observe(root.value);
}

onMounted(() => {
  if (!enabled) return;
  setupLazyLoad();
});

watch(
  () => route.path,
  () => {
    if (!artalk) return;
    artalk.update({
      pageKey: pageKey(),
      pageTitle: document.title,
    });
    artalk.reload();
  },
);

watch(
  () => uiLocale.value,
  async () => {
    if (!artalk) return;
    artalk.update({ locale: await artalkLocale() });
  },
);

onBeforeUnmount(() => {
  loadObserver?.disconnect();
  loadObserver = undefined;
  artalk?.destroy();
  artalk = undefined;
});
</script>

<template>
  <section v-if="enabled" ref="root" class="comments-section" :aria-label="t('comments').ariaLabel">
    <div class="comments-panel">
      <header class="comments-head">
        <h2 class="comments-title">{{ t('comments').title }}</h2>
        <p class="comments-hint">{{ t('comments').hint }}</p>
      </header>
      <div ref="host" class="artalk-host" />
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

.artalk-host {
  min-height: 80px;
}

.dark .comments-panel {
  border-color: color-mix(in srgb, var(--border-strong) 82%, var(--border));
  background: var(--surface);
  box-shadow: none;
}

:global(html.focus-mode:not(.dark)) .comments-panel {
  border-color: var(--border-strong);
  background: var(--surface);
  padding: 20px 20px 16px;
  box-shadow: 0 2px 12px rgba(90, 70, 30, 0.07);
}

:global(.atk-layer-wrap) {
  --at-color-font: var(--text);
  --at-color-deep: var(--text);
  --at-color-sub: var(--text-3);
  --at-color-meta: var(--text-3);
  --at-color-border: var(--border);
  --at-color-bg: var(--surface);
  --at-color-bg-transl: var(--surface);
  --at-color-bg-grey: var(--bg);
  --at-color-main: var(--accent);
}
</style>

<style>
/* Artalk 把 .artalk 加在挂载节点上，变量必须打在这个节点，且压过组件自带的浅色默认值 */
.comments-section .artalk {
  --at-color-font: var(--text);
  --at-color-deep: var(--text);
  --at-color-sub: var(--text-3);
  --at-color-grey: var(--text-3);
  --at-color-meta: var(--text-3);
  --at-color-border: var(--border);
  --at-color-light: var(--accent);
  --at-color-bg: var(--surface);
  --at-color-bg-transl: var(--surface);
  --at-color-bg-grey: var(--bg);
  --at-color-bg-grey-transl: var(--bg);
  --at-color-main: var(--accent);
  --at-color-gradient: linear-gradient(180deg, transparent, var(--surface));
}
</style>
