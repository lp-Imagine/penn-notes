<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, withBase } from "vitepress";
import notes from "../notes-items.generated.json";
import tagStats from "../tags.generated.json";
import { revealDelay, useInfiniteScroll } from "./useInfiniteScroll.js";

const PAGE_SIZE = 10;
const TOP_TAG_LIMIT = 10;
const route = useRoute();
const router = useRouter();
const activeTag = ref("");
const visible = ref(PAGE_SIZE);
const showAllTags = ref(false);

const taggedCount = computed(
  () => notes.filter((n) => n.tags?.length).length,
);

const filtered = computed(() => {
  if (!activeTag.value) return notes;
  return notes.filter((n) => n.tags?.includes(activeTag.value));
});

const shown = computed(() => filtered.value.slice(0, visible.value));
const hasMore = computed(() => visible.value < filtered.value.length);
const allLoaded = computed(
  () => filtered.value.length > 0 && visible.value >= filtered.value.length,
);
const topTags = computed(() => tagStats.slice(0, TOP_TAG_LIMIT));
const restTags = computed(() => tagStats.slice(TOP_TAG_LIMIT));
const hasHiddenTags = computed(() => restTags.value.length > 0);
const visibleTags = computed(() =>
  showAllTags.value ? tagStats : topTags.value,
);

watch(
  () => {
    const q = route.query?.tag;
    return Array.isArray(q) ? q[0] : q;
  },
  (raw) => {
    activeTag.value = raw ? decodeURIComponent(String(raw)) : "";
    visible.value = PAGE_SIZE;
    if (activeTag.value) {
      const inRest = restTags.value.some((t) => t.name === activeTag.value);
      if (inRest) showAllTags.value = true;
    }
  },
  { immediate: true },
);

function loadMore() {
  visible.value += PAGE_SIZE;
}

const { sentinel, isLoading } = useInfiniteScroll({
  hasMore,
  loadMore,
  visible,
  rootMargin: "640px 0px",
  prefetchRootMargin: "1000px 0px",
});

function selectTag(name) {
  activeTag.value = activeTag.value === name ? "" : name;
  router.replace({
    query: activeTag.value ? { tag: activeTag.value } : {},
  });
}

function toggleMoreTags() {
  showAllTags.value = !showAllTags.value;
}

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <div class="discover-browse">
    <div class="discover-toolbar">
      <div class="discover-filter" role="list" aria-label="标签筛选">
        <button
          type="button"
          class="discover-chip"
          :class="{ 'is-active': !activeTag }"
          @click="selectTag('')"
        >
          全部
        </button>
        <button
          v-for="t in visibleTags"
          :key="t.name"
          type="button"
          class="discover-chip"
          :class="{ 'is-active': activeTag === t.name }"
          role="listitem"
          @click="selectTag(t.name)"
        >
          {{ t.name }}
          <span class="discover-chip-count">{{ t.count }}</span>
        </button>
        <button
          v-if="hasHiddenTags"
          type="button"
          class="discover-chip discover-chip--more"
          :aria-expanded="showAllTags ? 'true' : 'false'"
          @click="toggleMoreTags"
        >
          {{ showAllTags ? "收起标签" : `更多标签 ${restTags.length}` }}
        </button>
      </div>
      <p class="discover-count">
        <template v-if="activeTag">{{ filtered.length }} 篇 · {{ activeTag }}</template>
        <template v-else>{{ notes.length }} 篇 · {{ tagStats.length }} 标签 · {{ taggedCount }} 篇已标注</template>
      </p>
    </div>

    <div v-if="!filtered.length" class="discover-empty">
      <p class="discover-empty-title">暂无匹配笔记</p>
      <p class="discover-empty-desc">试试切换其他标签</p>
    </div>
    <div v-else class="discover-rows">
      <a
        v-for="(item, idx) in shown"
        :key="item.link"
        class="discover-row list-reveal"
        :style="{ animationDelay: revealDelay(idx % PAGE_SIZE) }"
        :href="href(item.link)"
      >
        <span class="discover-row-body">
          <span class="discover-row-title">{{ item.title }}</span>
          <span class="discover-row-meta">
            <time :datetime="item.date">{{ item.date }}</time>
            <span>{{ item.sectionLabel }}</span>
          </span>
          <span v-if="item.summary" class="discover-row-summary">{{ item.summary }}</span>
        </span>
        <span v-if="item.tags?.length" class="discover-row-tags">
          <span
            v-for="tag in item.tags"
            :key="tag"
            class="discover-row-tag"
            :class="{ 'is-current': tag === activeTag }"
            @click.prevent="selectTag(tag)"
          >{{ tag }}</span>
        </span>
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
      已加载全部 {{ filtered.length }} 篇
    </p>
  </div>
</template>
