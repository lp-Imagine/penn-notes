<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, withBase } from "vitepress";
import notes from "../notes-items.generated.json";
import { useI18n } from "./i18n";
import {
  isTopicDone,
  setTopicDone,
  topicProgress,
} from "./topic-progress";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const activeSeries = ref("");
const tick = ref(0);

const seriesList = computed(() => {
  tick.value;
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
      const progress = topicProgress(sorted.map((it) => it.link));
      return {
        name,
        slug: name,
        count: sorted.length,
        items: sorted.map((it) => ({
          ...it,
          done: isTopicDone(it.link),
        })),
        sectionLabel: sorted[0]?.sectionLabel || "",
        progress,
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

onMounted(() => {
  tick.value += 1;
});

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

function toggleDone(item, event) {
  event.preventDefault();
  event.stopPropagation();
  setTopicDone(item.link, !isTopicDone(item.link));
  tick.value += 1;
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

    <p class="topics-progress-hint">{{ t("topics").progressHint }}</p>

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
            · {{ t("topics").progressOf(s.progress.done, s.progress.total) }}
          </p>
          <div class="topics-path-bar" aria-hidden="true">
            <span
              class="topics-path-bar-fill"
              :style="{ width: `${s.progress.percent}%` }"
            ></span>
          </div>
        </div>
        <ol class="topics-path-steps">
          <li
            v-for="(item, i) in s.items"
            :key="item.link"
            class="topics-step"
            :class="{ 'is-done': item.done }"
          >
            <button
              type="button"
              class="topics-step-check"
              :aria-pressed="item.done ? 'true' : 'false'"
              :aria-label="
                item.done
                  ? t('topics').unmarkDone
                  : t('topics').markDone
              "
              @click="toggleDone(item, $event)"
            >
              <span aria-hidden="true">{{ item.done ? "✓" : i + 1 }}</span>
            </button>
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
