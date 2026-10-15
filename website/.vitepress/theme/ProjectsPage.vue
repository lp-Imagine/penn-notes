<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error JSON 数据
import raw from "../../data/projects.json";
import { useI18n } from "./i18n";

const { t } = useI18n();

type ProjectKind = "personal" | "work";

type Project = {
  id: string;
  kind: ProjectKind;
  order?: number;
  name: string;
  period?: string;
  summary: string;
  stack?: string[];
  cover?: string;
  url?: string;
  repo?: string;
  npm?: string;
  related?: string;
};

const all = computed(() => {
  const list = Array.isArray(raw?.projects) ? (raw.projects as Project[]) : [];
  return [...list].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
});

const filter = ref<"" | ProjectKind>("");
const personalCount = computed(
  () => all.value.filter((item) => item.kind === "personal").length,
);
const workCount = computed(
  () => all.value.filter((item) => item.kind === "work").length,
);

const shown = computed(() => {
  if (!filter.value) return all.value;
  return all.value.filter((item) => item.kind === filter.value);
});

const countLabel = computed(() => {
  const copy = t("projects");
  if (!filter.value) {
    return copy.countAll(all.value.length, personalCount.value, workCount.value);
  }
  const label = filter.value === "work" ? copy.work : copy.personal;
  return copy.countFiltered(shown.value.length, label, all.value.length);
});

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function href(url: string) {
  return isExternal(url) ? url : withBase(url);
}

function setFilter(next: "" | ProjectKind) {
  filter.value = next;
}

function mediaHref(item: Project) {
  return item.url || item.npm || item.repo;
}

function kindLabel(item: Project) {
  return item.kind === "work" ? t("projects").work : t("projects").personal;
}
</script>

<template>
  <div class="section-page projects-page">
    <header class="section-hero">
      <p class="section-kicker">{{ t("projects").kicker }}</p>
      <h1 class="section-title">{{ t("nav").projects }}</h1>
      <p class="section-lead">{{ t("projects").lead }}</p>
      <p class="section-count">{{ countLabel }}</p>
      <div class="projects-hero-actions">
        <a class="projects-hero-btn projects-hero-btn--primary" :href="withBase('/about/')">{{
          t("projects").toAbout
        }}</a>
        <a
          class="projects-hero-btn"
          href="https://github.com/lp-Imagine"
          target="_blank"
          rel="noopener noreferrer"
          >GitHub</a
        >
      </div>
    </header>

    <div class="projects-filter" :aria-label="t('projects').filterAria">
      <button
        type="button"
        class="projects-filter-chip"
        :class="{ 'is-active': filter === '' }"
        :aria-pressed="filter === '' ? 'true' : 'false'"
        @click="setFilter('')"
      >
        <span>{{ t("common").all }}</span>
        <span class="projects-filter-count">{{ all.length }}</span>
      </button>
      <button
        type="button"
        class="projects-filter-chip"
        :class="{ 'is-active': filter === 'personal' }"
        :aria-pressed="filter === 'personal' ? 'true' : 'false'"
        @click="setFilter('personal')"
      >
        <span>{{ t("projects").personal }}</span>
        <span class="projects-filter-count">{{ personalCount }}</span>
      </button>
      <button
        v-if="workCount > 0"
        type="button"
        class="projects-filter-chip"
        :class="{ 'is-active': filter === 'work' }"
        :aria-pressed="filter === 'work' ? 'true' : 'false'"
        @click="setFilter('work')"
      >
        <span>{{ t("projects").work }}</span>
        <span class="projects-filter-count">{{ workCount }}</span>
      </button>
    </div>

    <div v-if="shown.length" class="projects-grid">
      <article
        v-for="(item, index) in shown"
        :key="item.id"
        class="project-card"
        :data-kind="item.kind"
      >
        <component
          :is="mediaHref(item) ? 'a' : 'div'"
          class="project-card-media"
          :class="{ 'project-card-media--empty': !item.cover }"
          v-bind="
            mediaHref(item)
              ? {
                  href: href(mediaHref(item)!),
                  target: isExternal(mediaHref(item)!) ? '_blank' : undefined,
                  rel: isExternal(mediaHref(item)!) ? 'noopener noreferrer' : undefined,
                  'aria-label': item.name,
                }
              : {}
          "
        >
          <img
            v-if="item.cover"
            class="project-card-shot"
            :src="href(item.cover)"
            :alt="`${item.name} 截图`"
            loading="lazy"
            decoding="async"
          />
          <template v-else>
            <span class="project-card-empty-chrome" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="project-card-empty-frame" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
            <span class="project-card-empty-kicker">{{
              item.npm ? t("projects").npm : item.repo ? t("projects").repo : t("projects").internal
            }}</span>
          </template>
          <span class="project-card-stamp">{{ kindLabel(item) }}</span>
          <span class="project-card-folio" aria-hidden="true">{{ pad(index + 1) }}</span>
        </component>
        <div class="project-card-copy">
          <header class="project-card-head">
            <div class="project-card-titles">
              <h2 class="project-card-title">{{ item.name }}</h2>
              <p class="project-card-meta">
                <time v-if="item.period">{{ item.period }}</time>
              </p>
            </div>
          </header>
          <p class="project-card-summary">{{ item.summary }}</p>
          <p v-if="item.stack?.length" class="project-card-stack">
            <span v-for="tag in item.stack" :key="tag" class="project-tag">{{ tag }}</span>
          </p>
          <p v-if="item.url || item.npm || item.repo || item.related" class="project-card-links">
            <a
              v-if="item.url"
              class="project-link"
              :href="href(item.url)"
              :target="isExternal(item.url) ? '_blank' : undefined"
              :rel="isExternal(item.url) ? 'noopener noreferrer' : undefined"
              >{{ t("projects").live
              }}<span aria-hidden="true">{{ isExternal(item.url) ? " ↗" : " →" }}</span></a
            >
            <a
              v-if="item.npm"
              class="project-link"
              :href="href(item.npm)"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t("projects").npm }}<span aria-hidden="true"> ↗</span></a
            >
            <a
              v-if="item.repo"
              class="project-link"
              :href="href(item.repo)"
              target="_blank"
              rel="noopener noreferrer"
              >{{ t("projects").repo }}<span aria-hidden="true"> ↗</span></a
            >
            <a v-if="item.related" class="project-link" :href="href(item.related)">{{
              t("projects").related
            }}<span aria-hidden="true"> →</span></a>
          </p>
        </div>
      </article>
    </div>
    <p v-else class="projects-empty">{{ t("projects").empty }}</p>
  </div>
</template>
