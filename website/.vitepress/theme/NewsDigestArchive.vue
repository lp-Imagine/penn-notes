<script setup>
import { computed, ref } from "vue";
import { withBase } from "vitepress";
import digests from "../news-digests.generated.json";

const RECENT_STRIP = 14;
const expandedMonths = ref(new Set());

const items = computed(() => digests.items ?? []);

const latest = computed(() => items.value[0] ?? null);

const recentStrip = computed(() => items.value.slice(1, RECENT_STRIP + 1));

const monthGroups = computed(() => {
  const map = new Map();
  for (const item of items.value) {
    const month = item.month || item.date?.slice(0, 7);
    if (!month) continue;
    if (!map.has(month)) map.set(month, []);
    map.get(month).push(item);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([month, groupItems]) => ({
      month,
      items: groupItems,
    }));
});

function imageSrc(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return withBase(raw.startsWith("/") ? raw : `/${raw}`);
}

function href(item) {
  const p = `/news/${item.month}/${item.slug}`;
  return withBase(p);
}

function dayLabel(date) {
  if (!date || date.length < 10) return date;
  return date.slice(5);
}

function formatFeaturedDate(date) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y} 年 ${Number(m)} 月`;
}

function isExpanded(month) {
  return expandedMonths.value.has(month);
}

function toggleMonth(month) {
  if (expandedMonths.value.has(month)) {
    expandedMonths.value = new Set();
    return;
  }
  expandedMonths.value = new Set([month]);
}

function isLatest(item) {
  return !!latest.value && item.slug === latest.value.slug;
}

function onThumbError(e) {
  e?.target?.closest(".news-digest-featured-media")?.remove();
}
</script>

<template>
  <section v-if="items.length" id="digests" class="news-digest-panel list-reveal">
    <div class="news-digest-panel-head">
      <div class="news-block-head">
        <h2 class="news-block-title">日报归档</h2>
        <p class="news-block-desc">按日期阅读完整日报，比动态流更适合通读回顾</p>
      </div>
      <p class="news-digest-panel-meta">{{ items.length }} 期</p>
    </div>

    <a
      v-if="latest"
      class="news-digest-featured"
      :href="href(latest)"
    >
      <div v-if="latest.image" class="news-digest-featured-media">
        <img
          :src="imageSrc(latest.image)"
          alt=""
          loading="eager"
          fetchpriority="high"
          decoding="async"
          @error="onThumbError"
        />
      </div>
      <div class="news-digest-featured-body">
        <span class="news-digest-featured-kicker">最新一期</span>
        <time class="news-digest-featured-date" :datetime="latest.date">{{
          formatFeaturedDate(latest.date)
        }}</time>
        <span class="news-digest-featured-title">{{ latest.title }}</span>
        <span class="news-digest-featured-cta">阅读完整日报 →</span>
      </div>
    </a>

    <div v-if="recentStrip.length" class="news-digest-recent">
      <p class="news-digest-recent-label">近期</p>
      <div class="news-digest-recent-scroll" tabindex="0" role="list">
        <a
          v-for="item in recentStrip"
          :key="item.slug"
          class="news-digest-chip"
          role="listitem"
          :href="href(item)"
        >
          <time :datetime="item.date">{{ dayLabel(item.date) }}</time>
        </a>
      </div>
    </div>

    <div class="news-digest-months">
      <p class="news-digest-recent-label">按月查阅</p>
      <div
        v-for="group in monthGroups"
        :key="group.month"
        class="news-digest-month-block"
        :class="{ 'is-expanded': isExpanded(group.month) }"
      >
        <button
          type="button"
          class="news-digest-month-toggle"
          :aria-expanded="isExpanded(group.month) ? 'true' : 'false'"
          @click="toggleMonth(group.month)"
        >
          <span class="news-digest-month-name">{{ monthLabel(group.month) }}</span>
          <span class="news-digest-month-count">{{ group.items.length }} 期</span>
          <span class="news-digest-month-chevron" aria-hidden="true" />
        </button>
        <div v-show="isExpanded(group.month)" class="news-digest-dates">
          <a
            v-for="item in group.items"
            :key="item.slug"
            class="news-digest-date"
            :class="{ 'is-latest': isLatest(item) }"
            :href="href(item)"
          >
            <time :datetime="item.date">{{ dayLabel(item.date) }}</time>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
