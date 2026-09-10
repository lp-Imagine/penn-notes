<script setup lang="ts">
/**
 * 近况：手动碎碎念 + 每日 AI 动态摘要（随 sync:news 自动更新）
 */
import { computed } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error JSON 数据
import rawManual from "../../recent/recent.json";
// @ts-expect-error 构建时由 scripts/sync-news.mjs 生成
import rawNews from "../news-recent.generated.json";
import { useI18n } from "./i18n";

const { t } = useI18n();

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

function siteHref(path: string) {
  const raw = path || "/";
  return withBase(raw.startsWith("/") ? raw : `/${raw}`);
}

/** 把站内绝对路径 href="/…" 改成带 base 的链接；外链不动 */
function rewriteInternalHrefs(html: string) {
  return html.replace(
    /href="(\/[^"]*)"/g,
    (_m, path: string) => `href="${siteHref(path)}"`,
  );
}

function newsContent(item: NewsRecentItem) {
  const recent = t("recent");
  const href = siteHref(item.link || "/news/");
  const headlines = (item.headlines || []).map(escapeHtml);
  if (headlines.length) {
    const extra =
      item.count && item.count > headlines.length
        ? recent.etcN(item.count)
        : "";
    return `${recent.newsPicks(headlines.join("；"), extra)}<a href="${href}">${recent.readDigest}</a>`;
  }
  return `${recent.newsUpdated}<a href="${href}">${escapeHtml(item.title)}</a>`;
}

const newsPath = siteHref("/news/");
const archivePath = siteHref("/archive/");

const items = computed(() => {
  const recent = t("recent");
  const manual: TimelineItem[] = (rawManual as ManualItem[]).map((item) => ({
    date: item.date,
    tag: item.tag || recent.tagManual,
    content: rewriteInternalHrefs(item.content),
    kind: "manual",
  }));
  const news: TimelineItem[] = (rawNews as NewsRecentItem[]).map((item) => ({
    date: item.date,
    tag: recent.tagNews,
    content: newsContent(item),
    kind: "news",
  }));
  return [...manual, ...news].sort((a, b) => parseDate(b.date) - parseDate(a.date));
});

const countLabel = computed(() => t("recent").count(items.value.length));
</script>

<template>
  <div class="section-page talks-page">
    <header class="section-hero">
      <p class="section-kicker">{{ t("recent").title }}</p>
      <h1 class="section-title">{{ t("recent").title }}</h1>
      <p class="section-lead">{{ t("recent").lead }}</p>
      <p class="section-count">{{ countLabel }}</p>
      <div class="talks-hero-actions">
        <a class="talks-hero-btn talks-hero-btn--primary" :href="newsPath"
          >{{ t("recent").goNews }}</a
        >
        <a class="talks-hero-btn" :href="archivePath">{{ t("recent").goArchive }}</a>
      </div>
    </header>

    <div class="talks-banner" role="note">
      <span class="talks-banner-icon" aria-hidden="true">ℹ️</span>
      <p class="talks-banner-text">
        <strong>{{ t("recent").tagNews }}</strong>{{ t("recent").bannerBefore
        }}<a :href="newsPath">{{ t("recent").tagNews }}</a
        >{{ t("recent").bannerAfter }}
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
      {{ t("recent").footerBefore
      }}<a :href="newsPath">{{ t("recent").tagNews }}</a
      >{{ t("recent").footerMid
      }}<a :href="archivePath">{{ t("nav").archive }}</a
      >{{ t("recent").footerAfter }}
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
}
</style>
