<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, withBase } from "vitepress";
import notes from "../notes-items.generated.json";
import tagStats from "../tags.generated.json";

const PAGE_SIZE = 10;
const route = useRoute();
const router = useRouter();
const activeTag = ref("");
const visible = ref(PAGE_SIZE);

const taggedCount = computed(
  () => notes.filter((n) => n.tags?.length).length,
);

const filtered = computed(() => {
  if (!activeTag.value) return notes;
  return notes.filter((n) => n.tags?.includes(activeTag.value));
});

const shown = computed(() => filtered.value.slice(0, visible.value));
const hasMore = computed(() => visible.value < filtered.value.length);
const remaining = computed(() =>
  Math.max(0, filtered.value.length - visible.value),
);

watch(
  () => {
    const q = route.query?.tag;
    return Array.isArray(q) ? q[0] : q;
  },
  (raw) => {
    activeTag.value = raw ? decodeURIComponent(String(raw)) : "";
    visible.value = PAGE_SIZE;
  },
  { immediate: true },
);

function loadMore() {
  visible.value += PAGE_SIZE;
}

function selectTag(name) {
  activeTag.value = activeTag.value === name ? "" : name;
  router.replace({
    query: activeTag.value ? { tag: activeTag.value } : {},
  });
}

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <div class="discover-browse">
    <div class="discover-toolbar">
      <div class="discover-filter" role="list" aria-label="标签筛选">
        <button
          type="button"
          class="discover-chip"
          :class="{ 'is-active': !activeTag }"
          @click="selectTag('')"
        >
          全部
        </button>
        <button
          v-for="t in tagStats"
          :key="t.name"
          type="button"
          class="discover-chip"
          :class="{ 'is-active': activeTag === t.name }"
          role="listitem"
          @click="selectTag(t.name)"
        >
          {{ t.name }}
          <span class="discover-chip-count">{{ t.count }}</span>
        </button>
      </div>
      <p class="discover-count">
        <template v-if="activeTag">{{ filtered.length }} 篇 · {{ activeTag }}</template>
        <template v-else>{{ notes.length }} 篇 · {{ tagStats.length }} 标签 · {{ taggedCount }} 篇已标注</template>
      </p>
    </div>

    <div v-if="!filtered.length" class="discover-empty">
      <p class="discover-empty-title">暂无匹配笔记</p>
      <p class="discover-empty-desc">试试切换其他标签</p>
    </div>
    <div v-else class="discover-rows">
      <a
        v-for="item in shown"
        :key="item.link"
        class="discover-row"
        :href="href(item.link)"
      >
        <span class="discover-row-body">
          <span class="discover-row-title">{{ item.title }}</span>
          <span class="discover-row-meta">
            <time :datetime="item.date">{{ item.date }}</time>
            <span>{{ item.sectionLabel }}</span>
          </span>
          <span v-if="item.summary" class="discover-row-summary">{{ item.summary }}</span>
        </span>
        <span v-if="item.tags?.length" class="discover-row-tags">
          <span
            v-for="tag in item.tags"
            :key="tag"
            class="discover-row-tag"
            :class="{ 'is-current': tag === activeTag }"
            @click.prevent="selectTag(tag)"
          >{{ tag }}</span>
        </span>
      </a>
    </div>
    <div v-if="hasMore" class="news-feed-more">
      <button type="button" class="news-feed-more-btn" @click="loadMore">
        加载更多（还有 {{ remaining }} 篇）
      </button>
    </div>
  </div>
</template>
