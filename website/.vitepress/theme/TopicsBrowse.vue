<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, withBase } from "vitepress";
import notes from "../notes-items.generated.json";
import { useI18n } from "./i18n";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const activeSeries = ref("");

const seriesList = computed(() => {
  const map = new Map();
  for (const n of notes) {
    if (!n.series) continue;
    if (!map.has(n.series)) map.set(n.series, []);
    map.get(n.series).push(n);
  }
  return [...map.entries()]
    .map(([name, items]) => {
      const sorted = [...items].sort((a, b) => {
        const oa = a.seriesOrder ?? 0;
        const ob = b.seriesOrder ?? 0;
        if (oa !== ob) return oa - ob;
        return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      });
      return {
        name,
        slug: name,
        count: sorted.length,
        items: sorted,
        sectionLabel: sorted[0]?.sectionLabel || "",
      };
    })
    .filter((s) => s.count >= 2)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh"));
});

const activeBlock = computed(() => {
  if (!activeSeries.value) return null;
  return seriesList.value.find((s) => s.name === activeSeries.value) || null;
});

const shown = computed(() =>
  activeBlock.value ? [activeBlock.value] : seriesList.value,
);

const totalArticles = computed(() =>
  seriesList.value.reduce((n, s) => n + s.count, 0),
);

watch(
  () => {
    const q = route.query?.series;
    return Array.isArray(q) ? q[0] : q;
  },
  (raw) => {
    activeSeries.value = raw ? decodeURIComponent(String(raw)) : "";
  },
  { immediate: true },
);

function selectSeries(name) {
  activeSeries.value = activeSeries.value === name ? "" : name;
  router.replace({
    query: activeSeries.value ? { series: activeSeries.value } : {},
  });
}

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <div class="discover-browse topics-browse">
    <div class="discover-toolbar">
      <div class="discover-filter" role="list" :aria-label="t('topics').filterAria">
        <button
          type="button"
          class="discover-chip"
          :class="{ 'is-active': !activeSeries }"
          @click="selectSeries('')"
        >
          {{ t("common").all }}
          <span class="discover-chip-count">{{ seriesList.length }}</span>
        </button>
        <button
          v-for="s in seriesList"
          :key="s.name"
          type="button"
          class="discover-chip"
          :class="{ 'is-active': activeSeries === s.name }"
          role="listitem"
          @click="selectSeries(s.name)"
        >
          {{ s.name }}
          <span class="discover-chip-count">{{ s.count }}</span>
        </button>
      </div>
      <p class="discover-count">
        {{ t("topics").stats(seriesList.length, totalArticles) }}
      </p>
    </div>

    <div class="topics-paths">
      <section
        v-for="s in shown"
        :id="encodeURIComponent(s.name)"
        :key="s.name"
        class="topics-path"
      >
        <div class="topics-path-head">
          <h2 class="topics-path-title">{{ s.name }}</h2>
          <p class="topics-path-meta">
            {{ t("common").articleCount(s.count) }}
            <template v-if="s.sectionLabel"> · {{ s.sectionLabel }}</template>
          </p>
        </div>
        <ol class="topics-path-steps">
          <li v-for="(item, i) in s.items" :key="item.link" class="topics-step">
            <span class="topics-step-index" aria-hidden="true">{{ i + 1 }}</span>
            <a class="topics-step-link" :href="href(item.link)">
              <span class="topics-step-title">{{ item.title }}</span>
              <time class="topics-step-date" :datetime="item.date">{{
                item.date
              }}</time>
            </a>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>
