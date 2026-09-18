<script setup>
import { computed } from "vue";
import { withBase } from "vitepress";
import data from "../../data/changelog.json";
import { useI18n } from "./i18n";

const { t } = useI18n();

const items = computed(() => {
  const list = Array.isArray(data?.items) ? [...data.items] : [];
  return list.sort((a, b) => String(b.date).localeCompare(String(a.date)));
});

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}
</script>

<template>
  <div class="changelog-page-inner">
    <p class="changelog-lead">{{ t("changelog").lead || data.lead }}</p>
    <p v-if="!items.length" class="changelog-empty">{{ t("changelog").empty }}</p>
    <ol v-else class="changelog-timeline">
      <li v-for="(it, i) in items" :key="`${it.date}-${i}`" class="changelog-item">
        <div class="changelog-rail" aria-hidden="true">
          <span class="changelog-dot"></span>
        </div>
        <article class="changelog-card">
          <header class="changelog-card-head">
            <time class="changelog-date" :datetime="it.date">{{ it.date }}</time>
            <ul v-if="it.tags?.length" class="changelog-tags">
              <li v-for="tag in it.tags" :key="tag">{{ tag }}</li>
            </ul>
          </header>
          <h2 class="changelog-title">{{ it.title }}</h2>
          <p class="changelog-summary">{{ it.summary }}</p>
          <p v-if="it.link" class="changelog-more">
            <a :href="href(it.link)">{{ t("changelog").more }}</a>
          </p>
        </article>
      </li>
    </ol>
  </div>
</template>
