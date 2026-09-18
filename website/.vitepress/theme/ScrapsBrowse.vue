<script setup>
import { computed } from "vue";
import { withBase } from "vitepress";
import items from "../scraps-items.generated.json";
import { useI18n } from "./i18n";

const { t } = useI18n();

const list = computed(() => {
  const arr = Array.isArray(items) ? [...items] : [];
  return arr.sort((a, b) => String(b.date).localeCompare(String(a.date)));
});

function href(path) {
  const p = String(path || "").replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

function dayPart(dateStr) {
  const m = String(dateStr || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { y: "", md: dateStr || "—" };
  return { y: m[1], md: `${m[2]}-${m[3]}` };
}
</script>

<template>
  <div class="scraps-browse">
    <p v-if="!list.length" class="scraps-empty">{{ t("scraps").empty }}</p>
    <ol v-else class="scraps-feed">
      <li v-for="(it, i) in list" :key="it.link" class="scraps-feed-item">
        <div class="scraps-feed-rail" aria-hidden="true">
          <span class="scraps-feed-dot">{{
            String(i + 1).padStart(2, "0")
          }}</span>
        </div>
        <a class="scraps-feed-card" :href="href(it.link)">
          <header class="scraps-feed-meta">
            <time v-if="it.date" class="scraps-feed-date" :datetime="it.date">
              <span class="scraps-feed-md">{{ dayPart(it.date).md }}</span>
              <span v-if="dayPart(it.date).y" class="scraps-feed-y">{{
                dayPart(it.date).y
              }}</span>
            </time>
            <ul v-if="it.tags?.length" class="scraps-feed-tags">
              <li v-for="tag in it.tags" :key="tag">{{ tag }}</li>
            </ul>
          </header>
          <h2 class="scraps-feed-title">{{ it.title }}</h2>
          <p v-if="it.excerpt" class="scraps-feed-excerpt">{{ it.excerpt }}</p>
          <span class="scraps-feed-go">{{ t("scraps").readMore }}</span>
        </a>
      </li>
    </ol>
  </div>
</template>
