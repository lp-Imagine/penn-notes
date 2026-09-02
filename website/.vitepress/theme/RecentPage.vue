<script setup lang="ts">
/**
 * 近况页：数据来自 website/recent/recent.json
 * 与 AI 动态自动同步无关；新增一条请在 JSON 数组最前面添加即可
 */
import { computed } from "vue";
// @ts-expect-error JSON 数据
import rawItems from "../../recent/recent.json";

type RecentItem = {
  date: string;
  tag?: string;
  content: string;
};

function parseDate(value: string): number {
  const normalized = /^\d{4}-\d{2}$/.test(value)
    ? `${value}-01`
    : value;
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? 0 : time;
}

const items = computed(() =>
  [...(rawItems as RecentItem[])].sort(
    (a, b) => parseDate(b.date) - parseDate(a.date),
  ),
);

const countLabel = computed(() => `共 ${items.value.length} 条`);
</script>

<template>
  <div class="section-page talks-page">
    <header class="section-hero">
      <p class="section-kicker">近况</p>
      <h1 class="section-title">近况</h1>
      <p class="section-lead">
        站点与个人的零碎更新，随手记几笔，不必写成完整文章。
      </p>
      <p class="section-count">{{ countLabel }}</p>
      <div class="talks-hero-actions">
        <a class="talks-hero-btn talks-hero-btn--primary" href="/news/"
          >去看 AI 动态</a
        >
        <a class="talks-hero-btn" href="/archive/">浏览文章归档</a>
      </div>
    </header>

    <div class="talks-banner" role="note">
      <span class="talks-banner-icon" aria-hidden="true">ℹ️</span>
      <p class="talks-banner-text">
        <strong>近况</strong>是我手动更新的个人记录；
        <strong><a href="/news/">AI 动态</a></strong>才是每日自动生成的科技精选。两者分开看，别混了。
      </p>
    </div>

    <div class="talks-timeline">
      <article
        v-for="(item, index) in items"
        :key="`${item.date}-${index}`"
        class="talk-item"
      >
        <div class="talk-item-head">
          <time :datetime="item.date">{{ item.date }}</time>
          <span v-if="item.tag" class="talk-item-tag">{{ item.tag }}</span>
        </div>
        <div class="talk-item-body">
          <p v-html="item.content" />
        </div>
      </article>
    </div>

    <p class="talks-note">
      追每日资讯 → <a href="/news/">AI 动态</a> · 读长文 →
      <a href="/archive/">归档</a>
    </p>
  </div>
</template>

<style scoped>
.talks-banner-text a {
  color: var(--link);
  text-decoration: none;
}

.talks-banner-text a:hover {
  text-decoration: underline;
}
</style>
