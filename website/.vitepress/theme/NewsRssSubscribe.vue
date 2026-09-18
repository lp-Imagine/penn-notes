<script setup>
import { computed, ref } from "vue";
import { NEWS_SECTION_DATA } from "../i18n/page-messages";
import { useI18n } from "./i18n";

defineProps({
  compact: { type: Boolean, default: false },
});

const { t } = useI18n();
const FEED_URL = "https://penn-notes.draftly.cn/news/feed.xml";
const copied = ref(false);
const copiedSection = ref("");

const sectionFeeds = computed(() =>
  NEWS_SECTION_DATA.filter((s) => s.id !== "all").map((s) => ({
    id: s.id,
    label: t("news").sections[s.id],
    url: `https://penn-notes.draftly.cn/news/feed-${s.id}.xml`,
    filterHref: `/news/?section=${s.id}#feed`,
  })),
);

async function copyFeed(url = FEED_URL, sectionId = "") {
  try {
    await navigator.clipboard.writeText(url);
    copied.value = url === FEED_URL;
    copiedSection.value = sectionId;
    setTimeout(() => {
      copied.value = false;
      copiedSection.value = "";
    }, 2000);
  } catch {
    window.prompt(t("news").rssCopyAria, url);
  }
}

const feedlyUrl = `https://feedly.com/i/subscription/feed/${encodeURIComponent(FEED_URL)}`;
</script>

<template>
  <div class="news-rss-subscribe" :class="{ 'news-rss-subscribe--compact': compact }">
    <button
      type="button"
      class="news-rss-btn"
      :aria-label="t('news').rssCopyAria"
      @click="copyFeed()"
    >
      <svg
        class="news-rss-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
      </svg>
      <span>{{ copied ? t("news").rssCopied : t("news").rssTitle }}</span>
    </button>
    <template v-if="!compact">
      <p class="news-rss-hint">
        {{ t("news").rssHint }}
        ·
        <a :href="feedlyUrl" target="_blank" rel="noopener noreferrer">Feedly</a>
      </p>
      <code class="news-rss-url">{{ FEED_URL }}</code>
      <p class="news-rss-sections-hint">{{ t("news").rssSectionsHint }}</p>
      <div class="news-rss-sections" role="list">
        <button
          v-for="s in sectionFeeds"
          :key="s.id"
          type="button"
          class="news-rss-section-chip"
          role="listitem"
          @click="copyFeed(s.url, s.id)"
        >
          {{ copiedSection === s.id ? t("news").rssCopied : s.label }}
        </button>
      </div>
    </template>
  </div>
</template>
