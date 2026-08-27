<script setup>
import { computed, ref, watch } from "vue";
import { withBase } from "vitepress";
import items from "../news-items.generated.json";
import NewsRssSubscribe from "./NewsRssSubscribe.vue";
import { revealDelay, useInfiniteScroll } from "./useInfiniteScroll.js";

const PAGE_SIZE = 24;
const sections = ["全部", "业界", "产品", "模型", "开源", "开发者工具", "前端"];
const active = ref("全部");
const visible = ref(PAGE_SIZE);

const hasItems = computed(() => items.length > 0);

const filtered = computed(() => {
  if (active.value === "全部") return items;
  return items.filter((item) => item.section === active.value);
});

const shown = computed(() => filtered.value.slice(0, visible.value));

const hasMore = computed(() => visible.value < filtered.value.length);
const allLoaded = computed(
  () => filtered.value.length > 0 && visible.value >= filtered.value.length,
);

watch(active, () => {
  visible.value = PAGE_SIZE;
});

function href(path) {
  const raw = String(path || "").trim();
  if (!raw) return withBase("/");
  if (/^https?:\/\//i.test(raw)) return raw;
  const p = raw.replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

function loadMore() {
  visible.value += PAGE_SIZE;
}

function getPrefetchUrls() {
  return filtered.value
    .slice(visible.value, visible.value + PAGE_SIZE)
    .map((item) => (item.image ? href(item.image) : null))
    .filter(Boolean);
}

const { sentinel, isLoading } = useInfiniteScroll({
  hasMore,
  loadMore,
  visible,
  getPrefetchUrls,
  prefetchRootMargin: "1400px 0px",
  rootMargin: "720px 0px",
});

function onThumbError(e) {
  const img = e?.target;
  if (!(img instanceof HTMLImageElement)) return;
  img.classList.add("news-img-hidden");
  img.removeAttribute("src");
  img.setAttribute("hidden", "");
  img.style.display = "none";
  const card = img.closest(".news-item-card--media");
  if (card) {
    card.classList.remove("news-item-card--media");
    card.classList.add("news-item-card--text");
  }
  img.closest(".news-item-media")?.remove();
}
</script>

<template>
  <div class="news-archive">
    <div class="news-toolbar">
      <div class="news-filter" role="tablist" aria-label="栏目筛选">
        <button
          v-for="sec in sections"
          :key="sec"
          type="button"
          class="news-filter-btn"
          :class="{ 'is-active': active === sec }"
          role="tab"
          :aria-selected="active === sec"
          @click="active = sec"
        >
          {{ sec }}
        </button>
      </div>
      <div v-if="hasItems" class="news-toolbar-aside">
        <span class="news-toolbar-count">
          {{ filtered.length }} 条
          <template v-if="active !== '全部'"> · {{ active }}</template>
        </span>
        <NewsRssSubscribe compact />
      </div>
    </div>

    <div v-if="!hasItems" class="news-empty-state">
      <div class="news-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path
            d="M15 4v3h3"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M8 10h8M8 13.5h8M8 17h5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <p class="news-empty-title">暂无动态</p>
      <p class="news-empty-desc">每天早上 7:00 左右自动更新，稍后再来看看。</p>
      <NewsRssSubscribe />
    </div>

    <template v-else>
      <p v-if="!filtered.length" class="news-empty-filter">
        「{{ active }}」栏目暂无内容，试试切换其他栏目。
      </p>

      <template v-else>
        <div class="news-item-grid">
          <a
            v-for="(item, idx) in shown"
            :key="`${item.digestSlug}-${item.title}-${idx}`"
            class="news-item-card list-reveal"
            :style="{ animationDelay: revealDelay(idx % PAGE_SIZE) }"
            :class="{
              'news-item-card--media': !!item.image,
              'news-item-card--text': !item.image,
            }"
            :data-tone="item.image ? undefined : item.section || '动态'"
            :href="href(item.digestLink)"
          >
            <div v-if="item.image" class="news-item-media">
              <img
                class="news-item-thumb"
                :src="href(item.image)"
                alt=""
                :loading="idx < PAGE_SIZE ? 'eager' : 'lazy'"
                :fetchpriority="idx < 8 ? 'high' : 'auto'"
                decoding="async"
                @error="onThumbError"
              />
            </div>
            <div class="news-item-body">
              <div class="news-item-tags">
                <span class="news-section-tag">{{ item.section }}</span>
                <span v-if="item.sourceName" class="news-source-tag">{{
                  item.sourceName
                }}</span>
              </div>
              <span class="news-item-title">{{ item.title }}</span>
              <p v-if="item.summary" class="news-item-summary">
                {{ item.summary }}
              </p>
              <span class="news-item-meta">
                <time :datetime="item.itemDate">{{ item.itemDate }}</time>
                <span>阅读全文</span>
              </span>
            </div>
          </a>
        </div>

        <div
          v-if="hasMore"
          ref="sentinel"
          class="news-feed-sentinel"
          aria-live="polite"
        >
          <span class="news-feed-sentinel-dot" aria-hidden="true" />
          <span>{{ isLoading ? "加载中…" : "继续下滑加载更多" }}</span>
        </div>
        <p v-else-if="allLoaded && filtered.length > PAGE_SIZE" class="news-feed-end">
          已加载全部 {{ filtered.length }} 条
        </p>
      </template>
    </template>
  </div>
</template>
