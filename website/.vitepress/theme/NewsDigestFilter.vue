<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vitepress";

const sections = ["全部", "业界", "产品", "模型", "开源", "开发者工具", "前端"];
const active = ref("全部");
const route = useRoute();
let sectionsRoot = null;

function applyFilter() {
  if (!sectionsRoot) return;
  const nodes = sectionsRoot.querySelectorAll(".news-section");
  nodes.forEach((node) => {
    const sec = node.getAttribute("data-section") || "";
    const show = active.value === "全部" || active.value === sec;
    node.style.display = show ? "" : "none";
  });
}

function resetFilter() {
  active.value = "全部";
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

function setActive(sec) {
  active.value = sec;
  applyFilter();
}
</script>

<template>
  <div class="news-filter news-filter--digest" role="tablist" aria-label="栏目筛选">
    <button
      v-for="sec in sections"
      :key="sec"
      type="button"
      class="news-filter-btn"
      :class="{ 'is-active': active === sec }"
      role="tab"
      :aria-selected="active === sec"
      @click="setActive(sec)"
    >
      {{ sec }}
    </button>
  </div>
</template>
