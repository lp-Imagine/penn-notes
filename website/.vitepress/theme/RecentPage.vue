<script setup lang="ts">
/**
 * 近况：手动碎碎念 + 每日 AI 动态摘要（随 sync:news 自动更新）
 */
import { computed } from "vue";
// @ts-expect-error JSON 数据
import rawManual from "../../recent/recent.json";
// @ts-expect-error 构建时由 scripts/sync-news.mjs 生成
import rawNews from "../news-recent.generated.json";

type ManualItem = {
  date: string;
  tag?: string;
  content: string;
};

type NewsRecentItem = {
  date: string;
  title: string;
  link: string;
  image?: string;
  count?: number;
  headlines?: string[];
};

type TimelineItem = {
  date: string;
  tag: string;
  content: string;
  kind: "manual" | "news";
};

function parseDate(value: string): number {
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? 0 : time;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function newsContent(item: NewsRecentItem) {
  const href = item.link || "/news/";
  const headlines = (item.headlines || []).map(escapeHtml);
  if (headlines.length) {
    const extra =
      item.count && item.count > headlines.length ? ` 等 ${item.count} 条` : "";
    return `今日精选：${headlines.join("；")}${extra}。<a href="${href}">阅读日报</a>`;
  }
  return `AI 动态日报已更新。<a href="${href}">${escapeHtml(item.title)}</a>`;
}

const items = computed(() => {
  const manual: TimelineItem[] = (rawManual as ManualItem[]).map((item) => ({
    date: item.date,
    tag: item.tag || "碎碎念",
    content: item.content,
    kind: "manual",
  }));
  const news: TimelineItem[] = (rawNews as NewsRecentItem[]).map((item) => ({
    date: item.date,
    tag: "AI 动态",
    content: newsContent(item),
    kind: "news",
  }));
  return [...manual, ...news].sort((a, b) => parseDate(b.date) - parseDate(a.date));
});

const countLabel = computed(() => `共 ${items.value.length} 条`);
</script>

<template>
  <div class="section-page talks-page">
    <header class="section-hero">
      <p class="section-kicker">近况</p>
      <h1 class="section-title">近况</h1>
      <p class="section-lead">
        站点碎碎念，以及每日自动同步的 AI 动态摘要。
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
        <strong>AI 动态</strong>日报会自动出现在时间线里；站点碎碎念仍手写。全文请看
        <a href="/news/">AI 动态</a>。
      </p>
    </div>

    <div class="talks-timeline">
      <article
        v-for="(item, index) in items"
        :key="`${item.kind}-${item.date}-${index}`"
        class="talk-item"
        :class="{ 'talk-item--news': item.kind === 'news' }"
      >
        <div class="talk-item-head">
          <time :datetime="item.date">{{ item.date }}</time>
          <span
            class="talk-item-tag"
            :class="{ 'talk-item-tag--news': item.kind === 'news' }"
            >{{ item.tag }}</span
          >
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

.talk-item-tag--news {
  color: var(--link);
  background: color-mix(in srgb, var(--accent-soft) 70%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 22%, var(--border));
}
</style>
