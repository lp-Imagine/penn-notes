<script setup>
import { computed, ref, watch } from "vue";
import items from "../news-items.generated.json";
import NewsRssSubscribe from "./NewsRssSubscribe.vue";

const BASE = "/";
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
const remaining = computed(() =>
  Math.max(0, filtered.value.length - visible.value),
);

watch(active, () => {
  visible.value = PAGE_SIZE;
});

function link(path) {
  return BASE + String(path).replace(/^\/+/, "");
}

function loadMore() {
  visible.value += PAGE_SIZE;
}

function onThumbError(e) {
  const img = e?.target;
  if (!(img instanceof HTMLImageElement)) return;
  img.removeAttribute("src");
  img.setAttribute("hidden", "");
  img.style.display = "none";
  img.closest(".news-item-card--media")?.classList.remove("news-item-card--media");
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
            class="news-item-card"
            :class="{
              'news-item-card--media': !!item.image,
              'news-item-card--text': !item.image,
            }"
            :data-tone="item.image ? undefined : item.section || '动态'"
            :href="link(item.digestLink)"
          >
            <div v-if="item.image" class="news-item-media">
              <img
                class="news-item-thumb"
                :src="item.image"
                alt=""
                loading="lazy"
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

        <div v-if="hasMore" class="news-feed-more">
          <button type="button" class="news-feed-more-btn" @click="loadMore">
            加载更多（还有 {{ remaining }} 条）
          </button>
        </div>
      </template>
    </template>
  </div>
</template>
