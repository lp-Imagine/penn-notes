<script setup>
import { ref } from "vue";
import { useI18n } from "./i18n";

defineProps({
  compact: { type: Boolean, default: false },
});

const { t } = useI18n();
const FEED_URL = "https://penn-notes.draftly.cn/news/feed.xml";
const copied = ref(false);

async function copyFeed() {
  try {
    await navigator.clipboard.writeText(FEED_URL);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    window.prompt(t("news").rssCopyAria, FEED_URL);
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
      @click="copyFeed"
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
    </template>
  </div>
</template>
