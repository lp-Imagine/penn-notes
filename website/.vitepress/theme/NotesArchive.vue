<script setup>
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import notes from "../notes-items.generated.json";
import { useI18n } from "./i18n";
import { revealDelay, useInfiniteScroll } from "./useInfiniteScroll.js";

const { t } = useI18n();
const PAGE_SIZE = 10;
const visible = ref(PAGE_SIZE);

const shownNotes = computed(() => notes.slice(0, visible.value));
const hasMore = computed(() => visible.value < notes.length);
const allLoaded = computed(
  () => notes.length > 0 && visible.value >= notes.length,
);

const grouped = computed(() => {
  const unknown = t("common").unknown;
  const years = new Map();
  for (const note of shownNotes.value) {
    const year = note.date?.slice(0, 4) || unknown;
    const month = note.date?.slice(0, 7) || unknown;
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(note);
  }
  return [...years.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, months]) => ({
      year,
      count: [...months.values()].reduce((n, items) => n + items.length, 0),
      months: [...months.entries()]
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([month, items]) => ({ month, items })),
    }));
});

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

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

function monthLabel(ym) {
  if (ym === t("common").unknown) return ym;
  const m = Number(ym.split("-")[1]);
  return t("archive").month(m);
}

function dayLabel(date) {
  if (!date || date.length < 10) return "";
  return date.slice(5);
}
</script>

<template>
  <div class="discover-archive">
    <p class="discover-count discover-count--archive">
      {{ t("archive").shownCount(notes.length, shownNotes.length) }}
    </p>

    <section
      v-for="y in grouped"
      :key="y.year"
      class="discover-year list-reveal"
    >
      <header class="discover-year-head">
        <h2 class="discover-year-title">{{ y.year }}</h2>
        <p class="discover-year-desc">{{ t("common").articleCount(y.count) }}</p>
      </header>

      <div
        v-for="g in y.months"
        :key="g.month"
        class="discover-month"
      >
        <p class="discover-month-label">{{ monthLabel(g.month) }} · {{ t("common").articleCount(g.items.length) }}</p>
        <div class="discover-rows discover-rows--compact">
          <a
            v-for="(item, idx) in g.items"
            :key="item.link"
            class="discover-row discover-row--compact list-reveal"
            :style="{ animationDelay: revealDelay(idx, 6) }"
            :href="href(item.link)"
          >
            <time class="discover-row-date" :datetime="item.date">{{ dayLabel(item.date) }}</time>
            <span class="discover-row-title">{{ item.title }}</span>
            <span class="discover-row-section">{{ item.sectionLabel }}</span>
          </a>
        </div>
      </div>
    </section>

    <div
      v-if="hasMore"
      ref="sentinel"
      class="news-feed-sentinel"
      aria-live="polite"
    >
      <span class="news-feed-sentinel-dot" aria-hidden="true" />
      <span>{{ isLoading ? t("common").loading : t("common").loadMore }}</span>
    </div>
    <p v-else-if="allLoaded && notes.length > PAGE_SIZE" class="news-feed-end">
      {{ t("common").loadedAll(notes.length) }}
    </p>
  </div>
</template>
