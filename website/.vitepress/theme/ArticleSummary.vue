<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref } from "vue";
import { useData, useRoute } from "vitepress";
// @ts-expect-error generated JSON
import notes from "../notes-items.generated.json";
import summaryStore from "../../data/note-summaries.json";
import { stripLocalePrefix, stripSiteBase, useI18n } from "./i18n";

const { frontmatter, page, site } = useData();
const route = useRoute();
const { t } = useI18n();
const expanded = ref(false);
const rootEl = ref<HTMLElement | null>(null);

type NoteItem = { link?: string; summary?: string };
type SummaryEntry = { summary?: string; hash?: string };
type SummaryStore = {
  items?: Record<string, SummaryEntry>;
};

function currentPath() {
  const stripped = stripSiteBase(route.path, site.value.base);
  return decodeURI(stripLocalePrefix(stripped)).replace(/\/$/, "");
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

const COLLAPSE_AT = 200;

function collapseSummary(text: string, max = COLLAPSE_AT) {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const marks = ["。", "！", "？", "；", "，"];
  let cut = -1;
  for (const m of marks) {
    cut = Math.max(cut, slice.lastIndexOf(m));
  }
  if (cut >= Math.floor(max * 0.55)) {
    return `${slice.slice(0, cut + 1)}…`;
  }
  const soft = slice.replace(/\s+\S*$/, "").trimEnd();
  return `${soft || slice}…`;
}

const needsCollapse = computed(() => summary.value.length > COLLAPSE_AT);
const shownText = computed(() => {
  if (!needsCollapse.value || expanded.value) return summary.value;
  return collapseSummary(summary.value);
});

const visible = computed(() => summary.value.length >= 18);

/** 贴到一体文头 / meta / h1 之后，避免出现在封面标题前面 */
function relocateAfterHeader() {
  const el = rootEl.value;
  if (!el) return;

  const doc = document.querySelector<HTMLElement>(".vp-doc");
  if (!doc) return;

  const root =
    (doc.querySelector(":scope > div > h1, :scope > div > .article-hero")
      ? doc.querySelector<HTMLElement>(":scope > div")
      : doc) || doc;

  const anchor =
    root.querySelector<HTMLElement>(":scope > .article-hero") ||
    root.querySelector<HTMLElement>(":scope > .article-meta") ||
    root.querySelector<HTMLElement>(":scope > h1");
  if (!anchor || anchor.nextElementSibling === el) return;

  anchor.after(el);
}

onMounted(() => {
  nextTick(relocateAfterHeader);
  // hero 由主题 JS 异步合成，稍后再贴一次
  setTimeout(relocateAfterHeader, 160);
});
onUpdated(() => nextTick(relocateAfterHeader));
</script>

<template>
  <aside
    v-if="visible"
    ref="rootEl"
    class="article-summary"
    :aria-label="t('summary').ariaLabel"
  >
    <div class="article-summary-head">
      <p class="article-summary-label">{{ t('summary').label }}</p>
      <button
        v-if="needsCollapse"
        type="button"
        class="article-summary-toggle"
        :aria-expanded="expanded ? 'true' : 'false'"
        @click="expanded = !expanded"
      >
        {{ expanded ? t('summary').collapse : t('summary').expand }}
      </button>
    </div>
    <p class="article-summary-text">{{ shownText }}</p>
  </aside>
</template>

<style scoped>
.article-summary {
  margin: 0 0 28px;
  padding: 2px 0 20px;
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
  color: var(--text-2);
  font-size: 12px;
  font-weight: 550;
  line-height: 1.2;
  cursor: pointer;
  transition: color 0.15s ease, text-decoration-color 0.15s ease;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
}

.article-summary-toggle:hover,
.article-summary-toggle:focus-visible {
  color: var(--text);
  text-decoration-color: color-mix(in srgb, var(--text) 35%, transparent);
  outline: none;
}

.article-summary-text {
  margin: 0;
  max-width: none;
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
  }
}
</style>
