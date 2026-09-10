<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, withBase } from "vitepress";
import notes from "../notes-items.generated.json";
import tagStats from "../tags.generated.json";
import { useI18n } from "./i18n";
import { revealDelay, useInfiniteScroll } from "./useInfiniteScroll.js";

const { t } = useI18n();
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
      const inRest = restTags.value.some((tag) => tag.name === activeTag.value);
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
      <div class="discover-filter" role="list" :aria-label="t('tags').filterAria">
        <button
          type="button"
          class="discover-chip"
          :class="{ 'is-active': !activeTag }"
          @click="selectTag('')"
        >
          {{ t("common").all }}
        </button>
        <button
          v-for="tag in visibleTags"
          :key="tag.name"
          type="button"
          class="discover-chip"
          :class="{ 'is-active': activeTag === tag.name }"
          role="listitem"
          @click="selectTag(tag.name)"
        >
          {{ tag.name }}
          <span class="discover-chip-count">{{ tag.count }}</span>
        </button>
        <button
          v-if="hasHiddenTags"
          type="button"
          class="discover-chip discover-chip--more"
          :aria-expanded="showAllTags ? 'true' : 'false'"
          @click="toggleMoreTags"
        >
          {{ showAllTags ? t("tags").collapseTags : t("tags").moreTags(restTags.length) }}
        </button>
      </div>
      <p class="discover-count">
        <template v-if="activeTag">{{ t("common").articleCount(filtered.length) }} · {{ activeTag }}</template>
        <template v-else>{{ t("tags").stats(notes.length, tagStats.length, taggedCount) }}</template>
      </p>
    </div>

    <div v-if="!filtered.length" class="discover-empty">
      <p class="discover-empty-title">{{ t("tags").emptyTitle }}</p>
      <p class="discover-empty-desc">{{ t("tags").emptyDesc }}</p>
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
      <span>{{ isLoading ? t("common").loading : t("common").loadMore }}</span>
    </div>
    <p v-else-if="allLoaded && filtered.length > PAGE_SIZE" class="news-feed-end">
      {{ t("common").loadedAll(filtered.length) }}
    </p>
  </div>
</template>
