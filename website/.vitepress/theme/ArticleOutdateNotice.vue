<script setup lang="ts">
import { computed } from "vue";
import { useData, useRoute } from "vitepress";
import { daysSince, getArticleContentDate, parseArticleDate } from "./article-dates";
// @ts-expect-error generated JSON
import notes from "../notes-items.generated.json";

const { page, theme, frontmatter, site } = useData();
const route = useRoute();

type OutdateCfg = {
  limitDays?: number;
  messagePrev?: string;
  messageNext?: string;
};

type NoteItem = { link?: string; date?: string; updated?: string };

const cfg = computed(
  () => (theme.value.outdateNotice ?? {}) as OutdateCfg,
);

function currentPath() {
  const raw = route.path;
  const base = (site.value.base || "/").replace(/\/$/, "");
  const stripped =
    base && base !== "/" && raw.startsWith(base)
      ? raw.slice(base.length)
      : raw;
  return decodeURI(stripped).replace(/\/$/, "");
}

const contentDate = computed(() => {
  const fromFm = parseArticleDate(
    frontmatter.value.updated ?? frontmatter.value.date,
  );
  if (fromFm) return fromFm;

  const fromPage = getArticleContentDate(page.value);
  if (fromPage) return fromPage;

  const note = (notes as NoteItem[]).find((n) => n.link === currentPath());
  return parseArticleDate(note?.updated ?? note?.date);
});

const staleDays = computed(() =>
  contentDate.value ? daysSince(contentDate.value) : 0,
);

const visible = computed(() => {
  if (frontmatter.value.outdate === false) return false;
  if (!contentDate.value) return false;
  const limit = cfg.value.limitDays ?? 1095;
  return staleDays.value >= limit;
});
</script>

<template>
  <div
    v-if="visible"
    class="post-outdate-notice"
    role="note"
  >
    <span class="post-outdate-icon" aria-hidden="true">!</span>
    <p class="post-outdate-text">
      {{ cfg.messagePrev ?? "本文距上次更新已过" }}
      <strong>{{ staleDays }}</strong>
      {{ cfg.messageNext ?? "天，内容可能已过时，请以最新文档为准。" }}
    </p>
  </div>
</template>

<style scoped>
.post-outdate-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 20px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, #e0a800 36%, var(--border));
  background: color-mix(in srgb, #e0a800 9%, var(--surface));
  color: var(--text-2);
}

.post-outdate-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: #9a6700;
  background: color-mix(in srgb, #e0a800 24%, var(--surface));
}

.post-outdate-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
}

.post-outdate-text strong {
  color: var(--text);
  font-weight: 700;
}

.dark .post-outdate-notice {
  border-color: color-mix(in srgb, #e0a800 28%, var(--border));
  background: color-mix(in srgb, #e0a800 7%, var(--surface));
}

.dark .post-outdate-icon {
  color: #f0c040;
  background: color-mix(in srgb, #e0a800 14%, var(--surface-2));
}
</style>
