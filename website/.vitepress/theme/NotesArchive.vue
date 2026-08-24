<script setup>
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import notes from "../notes-items.generated.json";

const PAGE_SIZE = 10;
const visible = ref(PAGE_SIZE);

const shownNotes = computed(() => notes.slice(0, visible.value));
const hasMore = computed(() => visible.value < notes.length);
const remaining = computed(() => Math.max(0, notes.length - visible.value));

const grouped = computed(() => {
  const years = new Map();
  for (const note of shownNotes.value) {
    const year = note.date?.slice(0, 4) || "未知";
    const month = note.date?.slice(0, 7) || "未知";
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

function monthLabel(ym) {
  if (ym === "未知") return ym;
  const m = Number(ym.split("-")[1]);
  return `${m} 月`;
}

function dayLabel(date) {
  if (!date || date.length < 10) return "";
  return date.slice(5);
}
</script>

<template>
  <div class="discover-archive">
    <p class="discover-count discover-count--archive">
      共 {{ notes.length }} 篇，已显示 {{ shownNotes.length }} 篇
    </p>

    <section
      v-for="y in grouped"
      :key="y.year"
      class="discover-year"
    >
      <header class="discover-year-head">
        <h2 class="discover-year-title">{{ y.year }}</h2>
        <p class="discover-year-desc">{{ y.count }} 篇</p>
      </header>

      <div
        v-for="g in y.months"
        :key="g.month"
        class="discover-month"
      >
        <p class="discover-month-label">{{ monthLabel(g.month) }} · {{ g.items.length }} 篇</p>
        <div class="discover-rows discover-rows--compact">
          <a
            v-for="item in g.items"
            :key="item.link"
            class="discover-row discover-row--compact"
            :href="href(item.link)"
          >
            <time class="discover-row-date" :datetime="item.date">{{ dayLabel(item.date) }}</time>
            <span class="discover-row-title">{{ item.title }}</span>
            <span class="discover-row-section">{{ item.sectionLabel }}</span>
          </a>
        </div>
      </div>
    </section>

    <div v-if="hasMore" class="news-feed-more">
      <button type="button" class="news-feed-more-btn" @click="loadMore">
        加载更多（还有 {{ remaining }} 篇）
      </button>
    </div>
  </div>
</template>
