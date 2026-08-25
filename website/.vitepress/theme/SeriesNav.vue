<script setup>
import { computed } from "vue";
import { useData, useRoute, withBase } from "vitepress";
import notes from "../notes-items.generated.json";

const { site } = useData();
const route = useRoute();

const currentPath = computed(() => {
  const raw = route.path;
  const base = (site.value.base || "/").replace(/\/$/, "");
  const stripped =
    base && base !== "/" && raw.startsWith(base)
      ? raw.slice(base.length)
      : raw;
  return decodeURI(stripped).replace(/\/$/, "");
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
    <div class="series-nav-head">
      <p class="series-nav-label">系列 · {{ seriesBlock.name }}</p>
      <span class="series-nav-progress"
        >{{ seriesBlock.index }} / {{ seriesBlock.total }}</span
      >
    </div>
    <div class="series-nav-links">
      <a
        v-if="seriesBlock.prev"
        class="series-nav-link"
        :href="href(seriesBlock.prev.link)"
      >
        <span class="series-nav-dir">上一篇</span>
        <span class="series-nav-title">{{ seriesBlock.prev.title }}</span>
      </a>
      <span v-else class="series-nav-placeholder" aria-hidden="true" />
      <a
        v-if="seriesBlock.next"
        class="series-nav-link series-nav-link--next"
        :href="href(seriesBlock.next.link)"
      >
        <span class="series-nav-dir">下一篇</span>
        <span class="series-nav-title">{{ seriesBlock.next.title }}</span>
      </a>
    </div>
  </nav>
</template>

<style scoped>
.series-nav {
  margin: 0 0 28px;
  padding: 0 0 18px;
  border: none;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
  background: transparent;
  border-radius: 0;
}

.series-nav-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  background: var(--divider-fade) no-repeat bottom / 100% 1px;
}

.series-nav-label {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text-2);
}

.series-nav-progress {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--text-3);
}

.series-nav-links {
  display: grid;
  gap: 0;
}

@media (min-width: 640px) {
  .series-nav-links {
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .series-nav-link--next {
    padding-left: 0;
  }

  .series-nav-placeholder + .series-nav-link--next {
    grid-column: 2;
  }
}

.series-nav-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 4px;
  min-width: 0;
  text-decoration: none;
  border-radius: 0;
  transition: background 0.15s ease;
}

.series-nav-link:hover {
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}

.series-nav-dir {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
  letter-spacing: 0.01em;
}

.series-nav-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: var(--text);
  transition: color 0.15s ease;
}

.series-nav-link:hover .series-nav-title {
  color: var(--link);
}

.series-nav-link--next {
  text-align: left;
}

@media (min-width: 640px) {
  .series-nav-link--next {
    text-align: right;
  }
}

.series-nav-placeholder {
  display: none;
}

@media (min-width: 640px) {
  .series-nav-placeholder {
    display: block;
  }
}
</style>
