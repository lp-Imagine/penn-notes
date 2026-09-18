<script setup>
import { computed } from "vue";
import { withBase } from "vitepress";
import digestsJson from "../news-digests.generated.json";
import itemsJson from "../news-items.generated.json";
import { useI18n } from "./i18n";

const { t } = useI18n();

const digests = computed(() => {
  const list = Array.isArray(digestsJson?.items) ? digestsJson.items : [];
  return list.slice(0, 7);
});

const weekItems = computed(() => {
  const dates = new Set(digests.value.map((d) => d.date));
  const items = Array.isArray(itemsJson) ? itemsJson : [];
  return items
    .filter((it) => dates.has(it.digestDate || it.itemDate))
    .slice(0, 24);
});

const rangeLabel = computed(() => {
  if (!digests.value.length) return "";
  const newest = digests.value[0]?.date || "";
  const oldest = digests.value[digests.value.length - 1]?.date || "";
  if (!newest) return "";
  if (!oldest || oldest === newest) return newest;
  return `${oldest} → ${newest}`;
});

function href(path) {
  const raw = String(path || "").trim();
  if (!raw) return withBase("/");
  if (/^https?:\/\//i.test(raw)) return raw;
  const p = raw.replace(/^\/+/, "/");
  return withBase(p.startsWith("/") ? p : `/${p}`);
}

function dayPart(dateStr) {
  const m = String(dateStr || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return { y: "", md: dateStr || "" };
  return { y: m[1], md: `${m[2]}-${m[3]}` };
}

function weekdayLabel(dateStr) {
  const t0 = Date.parse(`${dateStr}T12:00:00Z`);
  if (!Number.isFinite(t0)) return "";
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const d = new Date(t0).getUTCDay();
  const map = t("news").weekdays;
  return map?.[keys[d]] || "";
}
</script>

<template>
  <div class="news-weekly">
    <p v-if="!digests.length" class="news-weekly-empty">{{ t("news").weekEmpty }}</p>
    <template v-else>
      <section class="news-weekly-block">
        <div class="news-weekly-block-head">
          <h2 class="news-weekly-heading">{{ t("news").digestTitle }}</h2>
          <p class="news-weekly-block-meta">
            <span>{{ t("news").digestCount(digests.length) }}</span>
            <span v-if="rangeLabel" aria-hidden="true">·</span>
            <span v-if="rangeLabel">{{ rangeLabel }}</span>
          </p>
        </div>
        <div class="news-weekly-days" role="list">
          <a
            v-for="(d, i) in digests"
            :key="d.date"
            class="news-weekly-day"
            :class="{ 'news-weekly-day--latest': i === 0 }"
            role="listitem"
            :href="href(`/news/${d.month}/${d.slug}`)"
          >
            <span class="news-weekly-day-top">
              <span class="news-weekly-day-idx" aria-hidden="true">{{
                String(i + 1).padStart(2, "0")
              }}</span>
              <span v-if="i === 0" class="news-weekly-day-badge">{{
                t("news").latestDigest
              }}</span>
            </span>
            <span class="news-weekly-day-main">
              <span class="news-weekly-day-md">{{ dayPart(d.date).md }}</span>
              <span class="news-weekly-day-wd">{{ weekdayLabel(d.date) }}</span>
            </span>
            <span class="news-weekly-day-go" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      <section v-if="weekItems.length" class="news-weekly-block">
        <div class="news-weekly-block-head">
          <h2 class="news-weekly-heading">{{ t("news").weekPicks }}</h2>
          <p class="news-weekly-block-meta">
            {{ t("news").countItems(weekItems.length) }}
          </p>
        </div>
        <ol class="news-weekly-picks">
          <li v-for="(it, i) in weekItems" :key="`${it.title}-${i}`">
            <a class="news-weekly-pick" :href="href(it.digestLink)">
              <span class="news-weekly-pick-idx" aria-hidden="true">{{
                String(i + 1).padStart(2, "0")
              }}</span>
              <span class="news-weekly-pick-body">
                <span class="news-weekly-pick-meta">
                  <span v-if="it.section" class="news-weekly-tag">{{
                    it.section
                  }}</span>
                  <time v-if="it.itemDate || it.digestDate" :datetime="it.itemDate || it.digestDate">{{
                    it.itemDate || it.digestDate
                  }}</time>
                </span>
                <span class="news-weekly-title">{{ it.title }}</span>
              </span>
            </a>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>
