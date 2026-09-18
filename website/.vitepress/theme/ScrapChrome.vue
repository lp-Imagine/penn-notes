<script setup>
import { computed } from "vue";
import { useData, withBase } from "vitepress";
import items from "../scraps-items.generated.json";
import { useI18n } from "./i18n";

defineProps({
  /** top = 文头；bottom = 文末相邻导航 */
  placement: { type: String, default: "top" },
});

const { frontmatter, page } = useData();
const { t } = useI18n();

const title = computed(
  () => String(frontmatter.value?.title || page.value?.title || "").trim(),
);
const date = computed(() => String(frontmatter.value?.date || "").slice(0, 10));
const tags = computed(() => {
  const raw = frontmatter.value?.tags;
  return Array.isArray(raw) ? raw.map(String) : [];
});

const siblings = computed(() => {
  const list = Array.isArray(items) ? [...items] : [];
  list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return list;
});

const currentLink = computed(() => {
  const rel = String(page.value?.relativePath || "")
    .replace(/\\/g, "/")
    .replace(/\.md$/, "");
  return `/${rel}`;
});

const nav = computed(() => {
  const list = siblings.value;
  const idx = list.findIndex((it) => it.link === currentLink.value);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx < list.length - 1 ? list[idx + 1] : null,
    next: idx > 0 ? list[idx - 1] : null,
  };
});

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <div v-if="placement === 'top'" class="scrap-sheet-head">
    <a class="scrap-back" :href="href('/scraps/')">{{ t("scraps").back }}</a>

    <article class="scrap-sheet">
      <header class="scrap-sheet-meta">
        <time v-if="date" class="scrap-sheet-date" :datetime="date">{{
          date
        }}</time>
        <ul v-if="tags.length" class="scrap-sheet-tags">
          <li v-for="tag in tags" :key="tag">{{ tag }}</li>
        </ul>
      </header>
      <h1 v-if="title" class="scrap-sheet-title">{{ title }}</h1>
    </article>
  </div>

  <nav
    v-else-if="nav.prev || nav.next"
    class="scrap-sheet-nav"
    :aria-label="t('scraps').navAria"
  >
    <a
      v-if="nav.prev"
      class="scrap-sheet-nav-link scrap-sheet-nav-link--prev"
      :href="href(nav.prev.link)"
    >
      <span class="scrap-sheet-nav-dir">{{ t("scraps").older }}</span>
      <span class="scrap-sheet-nav-title">{{ nav.prev.title }}</span>
    </a>
    <span v-else class="scrap-sheet-nav-spacer" aria-hidden="true" />
    <a
      v-if="nav.next"
      class="scrap-sheet-nav-link scrap-sheet-nav-link--next"
      :href="href(nav.next.link)"
    >
      <span class="scrap-sheet-nav-dir">{{ t("scraps").newer }}</span>
      <span class="scrap-sheet-nav-title">{{ nav.next.title }}</span>
    </a>
  </nav>
</template>
