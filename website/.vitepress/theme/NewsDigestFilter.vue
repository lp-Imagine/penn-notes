<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vitepress";
import { NEWS_SECTION_DATA } from "../i18n/page-messages";
import { useI18n } from "./i18n";

const { t } = useI18n();
const sections = NEWS_SECTION_DATA;
const active = ref("all");
const route = useRoute();
let sectionsRoot = null;

function activeData() {
  return sections.find((s) => s.id === active.value)?.data ?? null;
}

function applyFilter() {
  if (!sectionsRoot) return;
  const data = activeData();
  const nodes = sectionsRoot.querySelectorAll(".news-section");
  nodes.forEach((node) => {
    const sec = node.getAttribute("data-section") || "";
    const show = data == null || data === sec;
    node.style.display = show ? "" : "none";
  });
}

function resetFilter() {
  active.value = "all";
  sectionsRoot = document.querySelector(".vp-doc");
  applyFilter();
}

onMounted(() => {
  resetFilter();
});

onUnmounted(() => {
  sectionsRoot = null;
});

watch(
  () => route.path,
  () => {
    // SPA 切到另一篇日报时重置筛选，避免 Tab 与正文栏目错位
    resetFilter();
  },
);

function setActive(id) {
  active.value = id;
  applyFilter();
}

function sectionLabel(id) {
  return t("news").sections[id];
}
</script>

<template>
  <div class="news-filter news-filter--digest" role="tablist" :aria-label="t('news').filterAria">
    <button
      v-for="sec in sections"
      :key="sec.id"
      type="button"
      class="news-filter-btn"
      :class="{ 'is-active': active === sec.id }"
      role="tab"
      :aria-selected="active === sec.id"
      @click="setActive(sec.id)"
    >
      {{ sectionLabel(sec.id) }}
    </button>
  </div>
</template>
