<script setup lang="ts">
import { computed, ref } from "vue";
import { useData, useRoute } from "vitepress";
// @ts-expect-error generated JSON
import notes from "../notes-items.generated.json";
import summaryStore from "../../data/note-summaries.json";

const { frontmatter, page, site } = useData();
const route = useRoute();
const expanded = ref(false);

type NoteItem = { link?: string; summary?: string };
type SummaryEntry = { summary?: string; hash?: string };
type SummaryStore = {
  items?: Record<string, SummaryEntry>;
};

function currentPath() {
  const raw = route.path;
  const base = (site.value.base || "/").replace(/\/$/, "");
  const stripped =
    base && base !== "/" && raw.startsWith(base)
      ? raw.slice(base.length)
      : raw;
  return decodeURI(stripped).replace(/\/$/, "");
}

function normalize(s: unknown) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isWeakSummary(s: string) {
  if (s.length < 36) return true;
  if (/围绕[「"].+[」"].*干货/.test(s)) return true;
  if (/读完能带走可执行要点/.test(s)) return true;
  if (/一篇干货型稿/.test(s)) return true;
  return false;
}

const summary = computed(() => {
  if (frontmatter.value.summaryBar === false) return "";

  const pathKey = currentPath();
  const fromLlm = normalize(
    (summaryStore as SummaryStore).items?.[pathKey]?.summary,
  );
  if (fromLlm.length >= 18) return fromLlm;

  const fromFm = normalize(
    frontmatter.value.summary || frontmatter.value.description,
  );
  if (fromFm.length >= 18 && !isWeakSummary(fromFm)) return fromFm;

  const note = (notes as NoteItem[]).find((n) => n.link === pathKey);
  const fromNote = normalize(note?.summary);
  if (fromNote.length >= 18 && !isWeakSummary(fromNote)) return fromNote;

  if (fromFm.length >= 18) return fromFm;
  if (fromNote.length >= 18) return fromNote;
  return normalize(page.value.description);
});

const COLLAPSE_AT = 168;
const needsCollapse = computed(() => summary.value.length > COLLAPSE_AT);
const shownText = computed(() => {
  if (!needsCollapse.value || expanded.value) return summary.value;
  return `${summary.value.slice(0, COLLAPSE_AT).replace(/\s+\S*$/, "")}…`;
});

const visible = computed(() => summary.value.length >= 18);
</script>

<template>
  <aside v-if="visible" class="article-summary" aria-label="文章速览">
    <div class="article-summary-head">
      <p class="article-summary-label">速览</p>
      <button
        v-if="needsCollapse"
        type="button"
        class="article-summary-toggle"
        :aria-expanded="expanded ? 'true' : 'false'"
        @click="expanded = !expanded"
      >
        {{ expanded ? "收起" : "展开" }}
      </button>
    </div>
    <p class="article-summary-text">{{ shownText }}</p>
  </aside>
</template>

<style scoped>
.article-summary {
  margin: 2px 0 26px;
  padding: 0 0 22px;
  border: none;
  border-radius: 0;
  background: transparent;
  background-image: var(--divider-fade);
  background-repeat: no-repeat;
  background-position: bottom;
  background-size: 100% 1px;
}

.article-summary-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.article-summary-label {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.12em;
  color: var(--text-3);
}

.article-summary-toggle {
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: color 0.15s ease;
}

.article-summary-toggle:hover,
.article-summary-toggle:focus-visible {
  color: var(--text-2);
  outline: none;
}

.article-summary-text {
  margin: 0;
  max-width: 40em;
  font-size: 1.02rem;
  line-height: 1.82;
  letter-spacing: 0.015em;
  color: var(--text-2);
  font-weight: 400;
  text-wrap: pretty;
}

.dark .article-summary-text {
  color: color-mix(in srgb, var(--text-2) 88%, var(--text));
}

@media (max-width: 640px) {
  .article-summary {
    padding-bottom: 18px;
    margin-bottom: 22px;
  }

  .article-summary-text {
    font-size: 0.98rem;
    line-height: 1.75;
    max-width: none;
  }
}
</style>
