<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "./i18n";

const { t } = useI18n();
const active = ref("");
const allTags = ref([]);

function collectCards() {
  return [...document.querySelectorAll(".collect-page .collect-card")];
}

function refreshTags() {
  const set = new Set();
  for (const card of collectCards()) {
    const raw = card.getAttribute("data-tags") || "";
    for (const tag of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
      set.add(tag);
    }
  }
  allTags.value = [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function applyFilter() {
  const tag = active.value;
  const cards = collectCards();
  for (const card of cards) {
    if (!tag) {
      card.hidden = false;
      continue;
    }
    const raw = card.getAttribute("data-tags") || "";
    const tags = raw.split(",").map((s) => s.trim()).filter(Boolean);
    card.hidden = !tags.includes(tag);
  }
  for (const group of document.querySelectorAll(".collect-page .collect-group")) {
    const visible = [...group.querySelectorAll(".collect-card")].some((c) => !c.hidden);
    group.hidden = !visible;
  }
}

function selectTag(tag) {
  active.value = active.value === tag ? "" : tag;
}

onMounted(() => {
  refreshTags();
  applyFilter();
});

watch(active, applyFilter);

const hasTags = computed(() => allTags.value.length > 0);
</script>

<template>
  <div v-if="hasTags" class="collect-enhance" role="list" :aria-label="t('collect').filterAria">
    <button
      type="button"
      class="collect-filter-chip"
      :class="{ 'is-active': !active }"
      role="listitem"
      @click="selectTag('')"
    >
      {{ t("common").all }}
    </button>
    <button
      v-for="tag in allTags"
      :key="tag"
      type="button"
      class="collect-filter-chip"
      :class="{ 'is-active': active === tag }"
      role="listitem"
      @click="selectTag(tag)"
    >
      {{ tag }}
    </button>
  </div>
</template>
