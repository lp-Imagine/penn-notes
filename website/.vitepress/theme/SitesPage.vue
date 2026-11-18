<script setup lang="ts">
import { computed, ref } from "vue";
import { withBase } from "vitepress";
// @ts-expect-error JSON 数据
import raw from "../../data/sites.json";
import { useI18n } from "./i18n";

type SiteStatus = "live" | "growing" | "archive" | "service" | "external";

type SiteItem = {
  id: string;
  name: string;
  host: string;
  url: string;
  desc: string;
  status: SiteStatus;
};

type Galaxy = {
  id: string;
  name: string;
  desc: string;
  accent: string;
  sites: SiteItem[];
};

type SitesPayload = {
  hub: {
    id: string;
    name: string;
    host: string;
    url: string;
    desc: string;
  };
  galaxies: Galaxy[];
};

const { t } = useI18n();
const data = raw as SitesPayload;
const galaxies = computed(() =>
  Array.isArray(data.galaxies) ? data.galaxies : [],
);

const activeId = ref(galaxies.value[0]?.id ?? "blog");
const showAll = ref(false);

const activeGalaxy = computed(
  () =>
    galaxies.value.find((g) => g.id === activeId.value) ?? galaxies.value[0],
);

const visibleGalaxies = computed(() => {
  if (showAll.value) return galaxies.value;
  return activeGalaxy.value ? [activeGalaxy.value] : [];
});

const totalSites = computed(() =>
  galaxies.value.reduce((sum, g) => sum + (g.sites?.length ?? 0), 0),
);

const statsLabel = computed(() =>
  t("sites").stats(galaxies.value.length, totalSites.value),
);

function statusLabel(status: SiteStatus) {
  return t("sites").status[status];
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url) || url.startsWith("//");
}

function href(url: string) {
  return isExternal(url) ? url : withBase(url);
}

function nodeStyle(index: number, total: number, accent: string) {
  const angle = -90 + (360 / Math.max(total, 1)) * index;
  return {
    "--sites-node-angle": `${angle}deg`,
    "--sites-node-accent": accent,
    "--sites-anim-delay": `${(index * 0.38).toFixed(2)}s`,
  };
}

function spokeCoords(index: number, total: number) {
  const angle =
    ((-90 + (360 / Math.max(total, 1)) * index) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // viewBox 轨道 r=46；留白避免扎进 hub / 节点圆
  const orbitR = 46;
  const inner = 19.2;
  const outer = orbitR - 6.4;
  return {
    x1: +(50 + inner * cos).toFixed(2),
    y1: +(50 + inner * sin).toFixed(2),
    x2: +(50 + outer * cos).toFixed(2),
    y2: +(50 + outer * sin).toFixed(2),
  };
}

function spokeGradient(index: number, total: number) {
  const { x1, y1, x2, y2 } = spokeCoords(index, total);
  return { x1, y1, x2, y2 };
}

function spokeStyle(index: number, accent: string) {
  return {
    "--sites-spoke-accent": accent,
    "--sites-anim-delay": `${(index * 0.38).toFixed(2)}s`,
  };
}

function selectGalaxy(id: string) {
  activeId.value = id;
  showAll.value = false;
}

const galaxyIcons: Record<string, string[]> = {
  blog: [
    "M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
    "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  ],
  notes: [
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
    "M14 2v4a2 2 0 0 0 2 2h4",
    "M10 9H8",
    "M16 13H8",
    "M16 17H8",
  ],
  news: [
    "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2",
    "M18 14h-8",
    "M15 18h-5",
    "M10 6h8v4h-8V6Z",
  ],
  products: [
    "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
    "m3.3 7 8.7 5 8.7-5",
    "M12 22V12",
  ],
  lists: [
    "M8 6h13",
    "M8 12h13",
    "M8 18h13",
    "M3 6h.01",
    "M3 12h.01",
    "M3 18h.01",
  ],
  lab: [
    "M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",
    "M8.5 2h7",
    "M7 16h10",
  ],
  social: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
};

function galaxyIcon(id: string) {
  return galaxyIcons[id] || galaxyIcons.blog;
}
</script>

<template>
  <div class="section-page sites-page">
    <header class="section-hero sites-hero">
      <p class="section-kicker">{{ t("sites").kicker }}</p>
      <h1 class="section-title">{{ t("sites").title }}</h1>
      <p class="section-lead">{{ t("sites").lead }}</p>
      <p class="section-count">{{ statsLabel }}</p>
    </header>

    <div class="sites-filter" :aria-label="t('sites').filterAria">
      <button
        v-for="galaxy in galaxies"
        :key="`filter-${galaxy.id}`"
        type="button"
        class="sites-filter-chip"
        :class="{ 'is-active': !showAll && activeId === galaxy.id }"
        :aria-pressed="!showAll && activeId === galaxy.id ? 'true' : 'false'"
        @click="selectGalaxy(galaxy.id)"
      >
        <span
          class="sites-filter-dot"
          :style="{ background: galaxy.accent }"
          aria-hidden="true"
        ></span>
        <span>{{ galaxy.name }}</span>
        <span class="sites-filter-count">{{ galaxy.sites.length }}</span>
      </button>
      <button
        type="button"
        class="sites-show-all"
        :class="{ 'is-active': showAll }"
        :aria-pressed="showAll ? 'true' : 'false'"
        @click="showAll = !showAll"
      >
        {{ showAll ? t("sites").showFiltered : t("sites").showAll }}
      </button>
    </div>

    <section
      v-if="!showAll && activeGalaxy"
      class="sites-atlas"
      :aria-label="t('sites').mapAria"
    >
      <div class="sites-map-stage">
        <div class="sites-map-stars" aria-hidden="true"></div>
        <svg
          class="sites-map-orbit"
          viewBox="0 0 100 100"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient
              v-for="(galaxy, index) in galaxies"
              :id="`sites-spoke-fade-${galaxy.id}`"
              :key="`grad-${galaxy.id}`"
              gradientUnits="userSpaceOnUse"
              v-bind="spokeGradient(index, galaxies.length)"
            >
              <stop
                offset="0%"
                :stop-color="galaxy.accent"
                stop-opacity="0"
              />
              <stop
                offset="24%"
                :stop-color="galaxy.accent"
                stop-opacity="0.5"
              />
              <stop
                offset="76%"
                :stop-color="galaxy.accent"
                stop-opacity="0.5"
              />
              <stop
                offset="100%"
                :stop-color="galaxy.accent"
                stop-opacity="0"
              />
            </linearGradient>
          </defs>
          <!-- 极淡实线底轨 -->
          <circle
            class="sites-map-orbit-guide"
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke-width="0.28"
          />
          <!-- 发丝级流动虚线 -->
          <circle
            class="sites-map-orbit-ring"
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke-width="0.32"
            stroke-linecap="round"
            stroke-dasharray="0.55 2.85"
            pathLength="100"
          />
          <line
            v-for="(galaxy, index) in galaxies"
            :key="`spoke-${galaxy.id}`"
            class="sites-map-spoke"
            :class="{ 'is-active': activeId === galaxy.id }"
            v-bind="spokeCoords(index, galaxies.length)"
            fill="none"
            stroke-width="0.3"
            stroke-linecap="round"
            stroke-dasharray="0.7 2.6"
            pathLength="100"
            :stroke="`url(#sites-spoke-fade-${galaxy.id})`"
            :style="spokeStyle(index, galaxy.accent)"
          />
        </svg>

        <a
          class="sites-map-hub"
          :href="href(data.hub.url)"
          :title="data.hub.desc"
        >
          <img
            class="sites-map-hub-icon"
            :src="withBase('/img/logo.svg')"
            alt=""
            width="28"
            height="28"
            decoding="async"
          />
          <span class="sites-map-hub-name">{{ data.hub.name }}</span>
          <span class="sites-map-hub-host">{{ data.hub.host }}</span>
        </a>

        <button
          v-for="(galaxy, index) in galaxies"
          :key="galaxy.id"
          type="button"
          class="sites-map-node"
          :class="{ 'is-active': activeId === galaxy.id }"
          :style="nodeStyle(index, galaxies.length, galaxy.accent)"
          :aria-pressed="activeId === galaxy.id ? 'true' : 'false'"
          @click="selectGalaxy(galaxy.id)"
        >
          <span class="sites-map-node-motion">
            <span class="sites-map-node-dot" aria-hidden="true">
              <svg
                class="sites-map-node-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="(d, i) in galaxyIcon(galaxy.id)"
                  :key="i"
                  :d="d"
                />
              </svg>
            </span>
          </span>
          <span class="sites-map-node-label">{{ galaxy.name }}</span>
        </button>
      </div>

      <div class="sites-panel">
        <div class="sites-panel-head">
          <div>
            <h2 class="sites-panel-title">
              <span
                class="sites-panel-swatch"
                :style="{ background: activeGalaxy.accent }"
                aria-hidden="true"
              ></span>
              {{ activeGalaxy.name }}
            </h2>
            <p class="sites-panel-desc">{{ activeGalaxy.desc }}</p>
          </div>
          <a class="sites-panel-home" :href="withBase('/')">{{
            t("sites").backHome
          }}</a>
        </div>

        <ul class="sites-panel-list">
          <li v-for="site in activeGalaxy.sites" :key="`panel-${site.id}`">
            <a
              class="sites-panel-item"
              :href="href(site.url)"
              :target="isExternal(site.url) ? '_blank' : undefined"
              :rel="isExternal(site.url) ? 'noopener noreferrer' : undefined"
            >
              <span class="sites-panel-item-main">
                <span class="sites-panel-item-row">
                  <span class="sites-panel-item-name">{{ site.name }}</span>
                  <span
                    class="sites-card-status"
                    :data-status="site.status"
                    >{{ statusLabel(site.status) }}</span
                  >
                </span>
                <span class="sites-panel-item-host">{{ site.host }}</span>
                <span class="sites-panel-item-desc">{{ site.desc }}</span>
              </span>
              <span class="sites-panel-item-go" aria-hidden="true">→</span>
            </a>
          </li>
        </ul>
      </div>
    </section>

    <section
      v-else
      class="sites-list"
      :aria-label="t('sites').listAria"
    >
      <div
        v-for="galaxy in visibleGalaxies"
        :id="`sites-group-${galaxy.id}`"
        :key="`group-${galaxy.id}`"
        class="sites-group"
      >
        <div class="sites-group-head">
          <h2 class="sites-group-title">
            <span
              class="sites-group-swatch"
              :style="{ background: galaxy.accent }"
              aria-hidden="true"
            ></span>
            {{ galaxy.name }}
          </h2>
          <p class="sites-group-desc">{{ galaxy.desc }}</p>
        </div>

        <ul class="sites-cards">
          <li v-for="site in galaxy.sites" :key="site.id">
            <a
              class="sites-card"
              :href="href(site.url)"
              :target="isExternal(site.url) ? '_blank' : undefined"
              :rel="isExternal(site.url) ? 'noopener noreferrer' : undefined"
            >
              <div class="sites-card-top">
                <p class="sites-card-name">{{ site.name }}</p>
                <span
                  class="sites-card-status"
                  :data-status="site.status"
                  >{{ statusLabel(site.status) }}</span
                >
              </div>
              <p class="sites-card-host">{{ site.host }}</p>
              <p class="sites-card-desc">{{ site.desc }}</p>
              <span class="sites-card-go" aria-hidden="true">→</span>
            </a>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
