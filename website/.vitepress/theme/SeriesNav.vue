<script setup>
import { computed } from "vue";
import { useRoute, withBase } from "vitepress";
import notes from "../notes-items.generated.json";

const BASE = "/penn-notes";
const route = useRoute();

const currentPath = computed(() => {
  const raw = route.path;
  return decodeURI(
    raw.startsWith(BASE) ? raw.slice(BASE.length) : raw,
  ).replace(/\/$/, "");
});

const seriesBlock = computed(() => {
  const current = notes.find((n) => n.link === currentPath.value);
  if (!current?.series) return null;
  const siblings = notes
    .filter((n) => n.series === current.series)
    .sort((a, b) => {
      const oa = a.seriesOrder ?? 0;
      const ob = b.seriesOrder ?? 0;
      if (oa !== ob) return oa - ob;
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
  const idx = siblings.findIndex((n) => n.link === currentPath.value);
  if (idx < 0 || siblings.length < 2) return null;
  return {
    name: current.series,
    prev: idx > 0 ? siblings[idx - 1] : null,
    next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    index: idx + 1,
    total: siblings.length,
  };
});

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <nav v-if="seriesBlock" class="series-nav" aria-label="系列导航">
    <p class="series-nav-label">
      系列 · {{ seriesBlock.name }}
      <span class="series-nav-progress">{{ seriesBlock.index }} / {{ seriesBlock.total }}</span>
    </p>
    <div class="series-nav-links">
      <a
        v-if="seriesBlock.prev"
        class="series-nav-link"
        :href="href(seriesBlock.prev.link)"
      >
        ← {{ seriesBlock.prev.title }}
      </a>
      <span v-else class="series-nav-placeholder" />
      <a
        v-if="seriesBlock.next"
        class="series-nav-link series-nav-link--next"
        :href="href(seriesBlock.next.link)"
      >
        {{ seriesBlock.next.title }} →
      </a>
    </div>
  </nav>
</template>

<style scoped>
.series-nav {
  margin-bottom: 28px;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface-2) 35%, transparent);
}
.series-nav-label {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}
.series-nav-progress {
  margin-left: 8px;
  font-weight: 500;
  color: var(--text-3);
}
.series-nav-links {
  display: grid;
  gap: 8px;
}
@media (min-width: 640px) {
  .series-nav-links {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}
.series-nav-link {
  display: block;
  font-size: 14px;
  line-height: 1.45;
  color: var(--link);
  text-decoration: none;
}
.series-nav-link--next {
  text-align: right;
}
.series-nav-link:hover {
  color: var(--link-hover);
}
.series-nav-placeholder {
  display: none;
}
</style>
